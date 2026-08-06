import { notFound } from "next/navigation";
import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { mapProjectRow } from "@/features/projects/utils/projectMappers";
import ProjectWorkspaceClient from "@/features/projects/components/ProjectWorkspaceClient";
import { mapProjectDocumentRow } from "@/features/project-documents/utils/documentMappers";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { user, profile } = await requireRole([
    APP_ROLES.CEO,
    APP_ROLES.ENGINEER,
  ]);
  const db = createSupabaseAdminClient() as any;
  let query = db
    .from("projects")
    .select(
      "*, engineer:profiles!projects_assigned_engineer_id_fkey(full_name,username), estimate_engineer:profiles!projects_assigned_estimate_engineer_id_fkey(full_name,username), progress:project_progress_activities(id,activity,weight_percent,progress_percent,sort_order,created_at,updated_at), budget:budget_projects(id,budget_items(id,name,category,estimated_cost,actual_spent,status))",
    )
    .eq("id", projectId)
    .neq("status", "archived");
  if (profile.role === APP_ROLES.ENGINEER)
    query = query.or(
      `assigned_engineer_id.eq.${user.id},assigned_estimate_engineer_id.eq.${user.id}`,
    );
  const { data, error } = await query.maybeSingle();
  if (error || !data) notFound();
  const { data: estimates } = await db
    .from("project_estimates")
    .select("*, requester_profile:profiles!project_estimates_requested_by_fkey(full_name,username)")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });
  const estimateIds = (estimates ?? []).map((estimate: any) => estimate.id);
  const { data: estimateItems } = estimateIds.length
    ? await db
        .from("project_estimate_items")
        .select("*")
        .in("estimate_id", estimateIds)
        .order("sort_order", { ascending: true })
    : { data: [] };
  const activities = (data.progress ?? []).sort(
    (a: any, b: any) => a.sort_order - b.sort_order,
  );
  const budgetItems = (data.budget ?? []).flatMap(
    (item: any) => item.budget_items ?? [],
  );
  const [{ data: progressSubmissions }, { data: materialRequests }, { data: progressUpdates }, { data: documents }, { data: projectExpenses }, { data: purchaseOrders }, { data: materialReceipts }] = await Promise.all([
    db
      .from("project_progress_submissions")
      .select("id,activity_count,submitted_at")
      .eq("project_id", projectId)
      .order("submitted_at", { ascending: false })
      .limit(8),
    db
      .from("material_requests")
      .select("id,material_name,quantity,unit,needed_by,priority,notes,status,created_at,updated_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("project_progress_updates")
      .select("id,project_id,submitted_by,overall_percent,completed_work_summary,remarks,created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("project_documents")
      .select("*, uploader:profiles!project_documents_uploaded_by_fkey(full_name,username)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("project_expenses")
      .select("id,category,description,amount,expense_date,status")
      .eq("project_id", projectId)
      .order("expense_date", { ascending: false }),
    db
      .from("purchase_orders")
      .select("id,material_request_id,item_name,quantity,unit,estimated_unit_cost,actual_unit_cost,status,delivery_status,ordered_at,received_at,notes,created_at,updated_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false }),
    db
      .from("project_material_receipts")
      .select("id,purchase_order_id,item_name,quantity,unit,total_cost,accepted_at")
      .eq("project_id", projectId)
      .order("accepted_at", { ascending: false }),
  ]);
  const canUpdateProgress =
    profile.role === APP_ROLES.ENGINEER &&
    data.assigned_engineer_id === user.id;
  const canCreateEstimate =
    profile.role === APP_ROLES.ENGINEER &&
    (data.assigned_estimate_engineer_id === user.id ||
      data.assigned_engineer_id === user.id);
  const canReviewEstimates = profile.role === APP_ROLES.CEO;
  return (
    <ProjectWorkspaceClient
      project={mapProjectRow(data)}
      currentUserId={user.id}
      canUpdateProgress={canUpdateProgress}
      canCreateEstimate={canCreateEstimate}
      canReviewEstimates={canReviewEstimates}
      activities={activities}
      estimates={estimates ?? []}
      estimateItems={estimateItems ?? []}
      budgetItems={budgetItems}
      progressSubmissions={progressSubmissions ?? []}
      materialRequests={materialRequests ?? []}
      progressUpdates={progressUpdates ?? []}
      documents={(documents ?? []).map(mapProjectDocumentRow)}
      projectExpenses={projectExpenses ?? []}
      purchaseOrders={purchaseOrders ?? []}
      materialReceipts={materialReceipts ?? []}
    />
  );
}

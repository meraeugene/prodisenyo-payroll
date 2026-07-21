import { notFound } from "next/navigation";
import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { mapProjectRow } from "@/features/projects/utils/projectMappers";
import ProjectWorkspaceClient from "@/features/projects/components/ProjectWorkspaceClient";

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
      canUpdateProgress={canUpdateProgress}
      canCreateEstimate={canCreateEstimate}
      canReviewEstimates={canReviewEstimates}
      activities={activities}
      estimates={estimates ?? []}
      estimateItems={estimateItems ?? []}
      budgetItems={budgetItems}
    />
  );
}

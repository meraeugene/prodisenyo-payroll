import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { CeoDashboardData } from "@/features/ceo-dashboard/types";

function profileName(profile: { full_name?: string | null; username?: string | null } | null) {
  return profile?.full_name?.trim() || profile?.username || "Unassigned";
}

export async function getCeoDashboardData(): Promise<CeoDashboardData> {
  const database = createSupabaseAdminClient() as any;
  const [
    projectsResult,
    materialsResult,
    estimatesResult,
    progressResult,
    documentsResult,
    payrollResult,
    overtimeResult,
  ] = await Promise.all([
    database
      .from("projects")
      .select(
        "id,name,location,status,budget_ceiling,end_date,image_url,assigned_engineer_id,engineer:profiles!projects_assigned_engineer_id_fkey(full_name,username),budget:budget_projects(starting_budget,budget_items(estimated_cost,actual_spent))",
      )
      .neq("status", "archived")
      .order("updated_at", { ascending: false }),
    database
      .from("material_requests")
      .select("id,project_id,material_name,status,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(300),
    database
      .from("project_estimates")
      .select("id,project_id,project_name,status,updated_at")
      .order("updated_at", { ascending: false })
      .limit(200),
    database
      .from("project_progress_updates")
      .select("id,project_id,overall_percent,completed_work_summary,created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    database
      .from("project_documents")
      .select(
        "id,project_id,file_name,created_at,uploader:profiles!project_documents_uploaded_by_fkey(full_name,username)",
      )
      .order("created_at", { ascending: false })
      .limit(80),
    database
      .from("payroll_runs")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted"),
    database
      .from("overtime_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  if (projectsResult.error) {
    throw new Error("Failed to load CEO projects. " + projectsResult.error.message);
  }

  const projectRows = projectsResult.data ?? [];
  const projectNameById = new Map<string, string>();
  const engineerByProjectId = new Map<string, string>();
  for (const row of projectRows) {
    projectNameById.set(row.id, row.name);
    engineerByProjectId.set(row.id, profileName(row.engineer));
  }

  const progressRows = progressResult.error ? [] : progressResult.data ?? [];
  const latestProgressByProject = new Map<
    string,
    { overallPercent: number; createdAt: string }
  >();
  for (const row of progressRows) {
    if (!latestProgressByProject.has(row.project_id)) {
      latestProgressByProject.set(row.project_id, {
        overallPercent: Number(row.overall_percent || 0),
        createdAt: row.created_at,
      });
    }
  }

  const projects = projectRows.map((row: any) => {
    const budgetItems = (row.budget ?? []).flatMap(
      (budget: any) => budget.budget_items ?? [],
    );
    const latestProgress = latestProgressByProject.get(row.id);
    return {
      id: row.id,
      name: row.name,
      location: row.location,
      status: row.status,
      budget: Number(row.budget?.[0]?.starting_budget ?? row.budget_ceiling ?? 0),
      estimatedCost: budgetItems.reduce(
        (sum: number, item: any) => sum + Number(item.estimated_cost || 0),
        0,
      ),
      spent: budgetItems.reduce(
        (sum: number, item: any) => sum + Number(item.actual_spent || 0),
        0,
      ),
      progress: Math.max(
        0,
        Math.min(100, Math.round(latestProgress?.overallPercent ?? 0)),
      ),
      latestProgressAt: latestProgress?.createdAt ?? null,
      endDate: row.end_date,
      engineer: profileName(row.engineer),
      imageUrl: row.image_url,
    };
  });

  return {
    projects,
    materialRequests: (materialsResult.error ? [] : materialsResult.data ?? []).map(
      (row: any) => ({
        id: row.id,
        projectId: row.project_id,
        projectName: projectNameById.get(row.project_id) || "Unknown project",
        materialName: row.material_name,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }),
    ),
    estimates: (estimatesResult.error ? [] : estimatesResult.data ?? []).map(
      (row: any) => ({
        id: row.id,
        projectId: row.project_id,
        projectName:
          projectNameById.get(row.project_id) || row.project_name || "Unlinked estimate",
        status: row.status,
        updatedAt: row.updated_at,
      }),
    ),
    progressUpdates: progressRows.map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      projectName: projectNameById.get(row.project_id) || "Unknown project",
      engineer: engineerByProjectId.get(row.project_id) || "Assigned engineer",
      overallPercent: Number(row.overall_percent || 0),
      summary: row.completed_work_summary,
      createdAt: row.created_at,
    })),
    documents: (documentsResult.error ? [] : documentsResult.data ?? []).map(
      (row: any) => ({
        id: row.id,
        projectId: row.project_id,
        projectName: projectNameById.get(row.project_id) || "Unknown project",
        fileName: row.file_name,
        uploader: profileName(row.uploader),
        createdAt: row.created_at,
      }),
    ),
    payrollApprovalCount: payrollResult.error ? 0 : payrollResult.count ?? 0,
    overtimeApprovalCount: overtimeResult.error ? 0 : overtimeResult.count ?? 0,
  };
}

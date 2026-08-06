import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { EngineerDashboardData } from "@/features/engineer-dashboard/types";
import {
  buildEngineerDashboardAlerts,
  calculateActualSpending,
  calculateWeightedProgress,
} from "@/features/engineer-dashboard/utils/engineerDashboard";

export async function getEngineerDashboardData(params: {
  userId: string;
  fullName: string;
}): Promise<EngineerDashboardData> {
  const database = createSupabaseAdminClient() as any;
  const { data: projectRows, error: projectError } = await database
    .from("projects")
    .select(
      "id,name,location,status,budget_ceiling,start_date,end_date,progress:project_progress_activities(weight_percent,progress_percent),budget:budget_projects(starting_budget,budget_items(actual_spent))",
    )
    .or(
      `assigned_engineer_id.eq.${params.userId},assigned_estimate_engineer_id.eq.${params.userId}`,
    )
    .neq("status", "archived")
    .order("updated_at", { ascending: false });

  if (projectError) {
    throw new Error(`Failed to load the engineer dashboard. ${projectError.message}`);
  }

  const projects = (projectRows ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    location: row.location,
    status: row.status,
    progress: calculateWeightedProgress(row.progress ?? []),
    budget: Number(row.budget?.[0]?.starting_budget ?? row.budget_ceiling ?? 0),
    spent: calculateActualSpending(row.budget ?? []),
    startDate: row.start_date,
    endDate: row.end_date,
  }));
  const projectIds = projects.map((project: { id: string }) => project.id);

  if (projectIds.length === 0) {
    return {
      fullName: params.fullName,
      projects: [],
      materialRequests: [],
      estimates: [],
      alerts: [],
    };
  }

  const [requestResult, estimateResult] = await Promise.all([
    database
      .from("material_requests")
      .select(
        "id,project_id,project:projects(name),material_name,quantity,unit,status,created_at",
      )
      .eq("requested_by", params.userId)
      .in("project_id", projectIds)
      .order("created_at", { ascending: false })
      .limit(12),
    database
      .from("project_estimates")
      .select(
        "id,project_id,project_name,status,rejection_reason,updated_at",
      )
      .in("project_id", projectIds)
      .order("updated_at", { ascending: false }),
  ]);

  const materialRequests = requestResult.error
    ? []
    : (requestResult.data ?? []).map((row: any) => ({
        id: row.id,
        projectId: row.project_id,
        projectName: row.project?.name ?? "Assigned project",
        materialName: row.material_name,
        quantity: Number(row.quantity),
        unit: row.unit,
        status: row.status,
        createdAt: row.created_at,
      }));
  const estimates = estimateResult.error
    ? []
    : (estimateResult.data ?? []).map((row: any) => ({
        id: row.id,
        projectId: row.project_id,
        projectName: row.project_name,
        status: row.status,
        rejectionReason: row.rejection_reason,
        updatedAt: row.updated_at,
      }));

  return {
    fullName: params.fullName,
    projects,
    materialRequests,
    estimates,
    alerts: buildEngineerDashboardAlerts({
      projects,
      requests: materialRequests,
      estimates,
    }),
  };
}

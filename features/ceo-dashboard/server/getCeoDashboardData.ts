import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { mapProjectRow } from "@/features/projects/utils/projectMappers";
import type { ProjectRecord } from "@/features/projects/types";
import type { CeoDashboardData } from "@/features/ceo-dashboard/types";

export async function getCeoDashboardData(): Promise<CeoDashboardData> {
  const database = createSupabaseAdminClient() as any;
  const [projectsResult, payrollResult, estimateResult, overtimeResult] =
    await Promise.all([
      database
        .from("projects")
        .select(
          "*, engineer:profiles!projects_assigned_engineer_id_fkey(full_name,username), estimate_engineer:profiles!projects_assigned_estimate_engineer_id_fkey(full_name,username), progress:project_progress_activities(weight_percent,progress_percent), budget:budget_projects(budget_items(actual_spent))",
        )
        .neq("status", "archived")
        .order("created_at", { ascending: false }),
      database
        .from("payroll_runs")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted"),
      database
        .from("project_estimates")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted"),
      database
        .from("overtime_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

  if (projectsResult.error) {
    throw new Error(`Failed to load CEO projects. ${projectsResult.error.message}`);
  }

  const projects: ProjectRecord[] = (projectsResult.data ?? []).map(
    (row: any) => mapProjectRow(row),
  );
  const payrollCount = payrollResult.count ?? 0;
  const estimateCount = estimateResult.count ?? 0;
  const overtimeCount = overtimeResult.count ?? 0;
  const materialMockCount = 3;
  const totalBudget = projects.reduce((sum, project) => sum + project.budget, 0);
  const totalSpent = projects.reduce((sum, project) => sum + project.spent, 0);

  return {
    projects,
    activeProjects: projects.filter((project) => project.status === "active").length,
    completedProjects: projects.filter((project) => project.status === "completed").length,
    pendingApprovals:
      payrollCount + estimateCount + overtimeCount + materialMockCount,
    totalBudget,
    totalSpent,
    approvalQueue: [
      {
        label: "Material Requests",
        detail: "Project materials awaiting review",
        count: materialMockCount,
        href: "/material-approvals",
        tone: "emerald",
      },
      {
        label: "Payroll Reports",
        detail: "Submitted payroll periods",
        count: payrollCount,
        href: "/payroll-approvals",
        tone: "sky",
      },
      {
        label: "Project Estimates",
        detail: "Budgets awaiting CEO decision",
        count: estimateCount,
        href: "/estimate-approvals",
        tone: "amber",
      },
      {
        label: "Overtime Requests",
        detail: "Employee overtime requests",
        count: overtimeCount,
        href: "/overtime-approvals",
        tone: "rose",
      },
    ],
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const TABLES_TO_CLEAR = [
  "project_documents",
  "project_progress_updates",
  "project_progress_activities",
  "project_estimate_items",
  "project_estimates",
  "cost_catalog_items",
  "budget_items",
  "budget_projects",
  "projects",
  "payroll_run_items",
  "payroll_run_daily_totals",
  "payroll_runs",
  "payroll_adjustments",
  "overtime_requests",
  "employee_branch_rates",
  "attendance_records",
  "attendance_imports",
  "role_rates",
  "employees",
  "sites",
  "audit_logs",
] as const;

async function clearTable(database: any, table: string) {
  const { error } = await database.from(table).delete().not("id", "is", null);

  if (error) {
    throw new Error(`Failed to clear ${table}: ${error.message}`);
  }
}

export async function resetWorkspaceDataAction() {
  await requireRole(APP_ROLES.ADMIN);
  const database = createSupabaseAdminClient() as any;

  for (const table of TABLES_TO_CLEAR) {
    await clearTable(database, table);
  }

  revalidatePath("/dashboard");
  revalidatePath("/upload-attendance");
  revalidatePath("/review-attendance");
  revalidatePath("/generate-payroll");
  revalidatePath("/payroll-reports");
  revalidatePath("/payroll-approvals");
  revalidatePath("/overtime-approvals");
  revalidatePath("/budget-tracker");
  revalidatePath("/projects");
  revalidatePath("/cost-estimator");
  revalidatePath("/request-overtime");
  revalidatePath("/request-material");
  revalidatePath("/estimate-reviews");
  revalidatePath("/estimate-approvals");

  return {
    clearedTables: TABLES_TO_CLEAR.length,
  };
}

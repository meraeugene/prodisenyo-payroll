import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  PayrollDashboardAttendanceRecord,
  PayrollDashboardData,
  PayrollDashboardImportRecord,
  PayrollDashboardItemRecord,
  PayrollDashboardRunRecord,
} from "@/features/payroll-dashboard/types";
import {
  buildAttendanceBatches,
  buildPayrollActivity,
  buildPayrollDashboardSummary,
  calculateApprovedPayrollOverview,
} from "@/features/payroll-dashboard/utils/payrollDashboard";

const RECENT_BATCH_LIMIT = 6;
const RECENT_ACTIVITY_LIMIT = 8;
const PAGE_SIZE = 1000;

async function loadAttendanceRecords(database: any, importIds: string[]) {
  const batches = await Promise.all(
    importIds.map(async (importId) => {
      const rows: any[] = [];
      for (let page = 0; ; page += 1) {
        const start = page * PAGE_SIZE;
        const { data, error } = await database
          .from("attendance_records")
          .select("import_id,employee_id,employee_name")
          .eq("import_id", importId)
          .range(start, start + PAGE_SIZE - 1);
        if (error) {
          throw new Error(
            "Failed to load attendance batch counts. " + error.message,
          );
        }
        const pageRows = data ?? [];
        rows.push(...pageRows);
        if (pageRows.length < PAGE_SIZE) break;
      }
      return rows;
    }),
  );
  return batches.flat();
}

async function loadApprovedPayrollItems(database: any, runIds: string[]) {
  if (!runIds.length) return [];
  const rows: any[] = [];
  for (let page = 0; ; page += 1) {
    const start = page * PAGE_SIZE;
    const { data, error } = await database
      .from("payroll_run_items")
      .select(
        "payroll_run_id,regular_pay,overtime_pay,holiday_pay,deductions_total,total_pay",
      )
      .in("payroll_run_id", runIds)
      .range(start, start + PAGE_SIZE - 1);
    if (error) {
      throw new Error(
        "Failed to load approved payroll details. " + error.message,
      );
    }
    const pageRows = data ?? [];
    rows.push(...pageRows);
    if (pageRows.length < PAGE_SIZE) break;
  }
  return rows;
}

export async function getPayrollDashboardData(
  currentUserId: string,
): Promise<PayrollDashboardData> {
  const database = createSupabaseAdminClient() as any;
  const [employeeResult, importsResult, runsResult] = await Promise.all([
    database.from("employees").select("id", { count: "exact", head: true }),
    database
      .from("attendance_imports")
      .select(
        "id,site_name,period_label,period_start,period_end,uploaded_by,created_at",
      )
      .order("created_at", { ascending: false }),
    database
      .from("payroll_runs")
      .select(
        "id,attendance_import_id,site_name,period_label,period_start,period_end,status,gross_total,net_total,created_by,submitted_by,approved_by,created_at,submitted_at,approved_at,rejected_at,rejection_reason,updated_at",
      )
      .order("updated_at", { ascending: false }),
  ]);

  if (employeeResult.error) {
    throw new Error(
      "Failed to load the employee total. " + employeeResult.error.message,
    );
  }
  if (importsResult.error) {
    throw new Error(
      "Failed to load attendance batches. " + importsResult.error.message,
    );
  }
  if (runsResult.error) {
    throw new Error("Failed to load payroll runs. " + runsResult.error.message);
  }

  const imports: PayrollDashboardImportRecord[] = (importsResult.data ?? []).map(
    (row: any) => ({
      id: row.id,
      siteName: row.site_name,
      periodLabel: row.period_label,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      uploadedBy: row.uploaded_by,
      createdAt: row.created_at,
    }),
  );
  const runs: PayrollDashboardRunRecord[] = (runsResult.data ?? []).map(
    (row: any) => ({
      id: row.id,
      attendanceImportId: row.attendance_import_id,
      siteName: row.site_name,
      periodLabel: row.period_label,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      status: row.status,
      grossTotal: Number(row.gross_total || 0),
      netTotal: Number(row.net_total || 0),
      createdBy: row.created_by,
      submittedBy: row.submitted_by,
      approvedBy: row.approved_by,
      createdAt: row.created_at,
      submittedAt: row.submitted_at,
      approvedAt: row.approved_at,
      rejectedAt: row.rejected_at,
      rejectionReason: row.rejection_reason,
      updatedAt: row.updated_at,
    }),
  );

  const recentImportIds = imports
    .slice(0, RECENT_BATCH_LIMIT)
    .map((item) => item.id);
  const approvedRunIds = runs
    .filter((run) => run.status === "approved")
    .map((run) => run.id);
  const actorIds = Array.from(
    new Set(
      [
        ...imports.map((item) => item.uploadedBy),
        ...runs.flatMap((run) => [
          run.createdBy,
          run.submittedBy,
          run.approvedBy,
        ]),
      ].filter((id): id is string => Boolean(id)),
    ),
  );

  const [recordRows, itemRows, profilesResult] = await Promise.all([
    loadAttendanceRecords(database, recentImportIds),
    loadApprovedPayrollItems(database, approvedRunIds),
    actorIds.length
      ? database
          .from("profiles")
          .select("id,full_name,username")
          .in("id", actorIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const records: PayrollDashboardAttendanceRecord[] = (
    recordRows
  ).map((row: any) => ({
    importId: row.import_id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
  }));
  const items: PayrollDashboardItemRecord[] = itemRows.map(
    (row: any) => ({
      payrollRunId: row.payroll_run_id,
      regularPay: Number(row.regular_pay || 0),
      overtimePay: Number(row.overtime_pay || 0),
      holidayPay: Number(row.holiday_pay || 0),
      deductionsTotal: Number(row.deductions_total || 0),
      totalPay: Number(row.total_pay || 0),
    }),
  );
  const actorNames = new Map<string, string>(
    (profilesResult.error ? [] : profilesResult.data ?? []).map((row: any) => [
      row.id,
      row.full_name?.trim() || row.username || "User not recorded",
    ]),
  );

  const batches = buildAttendanceBatches(
    imports,
    runs,
    records,
    currentUserId,
  ).slice(0, RECENT_BATCH_LIMIT);
  const loadedImportIds = new Set(recentImportIds);

  return {
    summary: buildPayrollDashboardSummary(
      employeeResult.count ?? 0,
      imports,
      runs,
    ),
    recentBatches: batches.map((batch) =>
      loadedImportIds.has(batch.id) && batch.recordCount === null
        ? { ...batch, recordCount: 0, employeeCount: 0 }
        : batch,
    ),
    payrollOverview: calculateApprovedPayrollOverview(runs, items),
    awaitingApprovals: runs
      .filter((run) => run.status === "submitted")
      .slice(0, 5)
      .map((run) => ({
        id: run.id,
        siteName: run.siteName,
        periodLabel: run.periodLabel,
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
        submittedAt: run.submittedAt,
        netTotal: run.netTotal,
      })),
    returnedSubmissions: runs
      .filter((run) => run.status === "rejected")
      .slice(0, 4)
      .map((run) => ({
        id: run.id,
        siteName: run.siteName,
        periodLabel: run.periodLabel,
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
        submittedAt: run.submittedAt,
        rejectedAt: run.rejectedAt,
        rejectionReason: run.rejectionReason,
        netTotal: run.netTotal,
      })),
    recentActivity: buildPayrollActivity(imports, runs, actorNames).slice(
      0,
      RECENT_ACTIVITY_LIMIT,
    ),
    hasOwnedAttendance: imports.some(
      (item) => item.uploadedBy === currentUserId,
    ),
  };
}

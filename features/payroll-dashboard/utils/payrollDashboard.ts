import type {
  AttendanceBatchStatus,
  PayrollActivityItem,
  PayrollDashboardAttendanceRecord,
  PayrollDashboardBatch,
  PayrollDashboardImportRecord,
  PayrollDashboardItemRecord,
  PayrollDashboardOverview,
  PayrollDashboardRunRecord,
  PayrollDashboardSummary,
} from "@/features/payroll-dashboard/types";

export function getAttendanceBatchStatus(
  run: PayrollDashboardRunRecord | undefined,
): AttendanceBatchStatus {
  if (!run) return "ready";
  if (run.status === "submitted") return "awaiting_ceo";
  if (run.status === "approved") return "approved";
  if (run.status === "rejected") return "returned";
  return "draft";
}

export function buildPayrollDashboardSummary(
  totalEmployees: number,
  imports: PayrollDashboardImportRecord[],
  runs: PayrollDashboardRunRecord[],
): PayrollDashboardSummary {
  const linkedImportIds = new Set(
    runs
      .map((run) => run.attendanceImportId)
      .filter((id): id is string => Boolean(id)),
  );

  return {
    totalEmployees,
    attendanceBatches: imports.length,
    readyForPayroll: imports.filter((item) => !linkedImportIds.has(item.id)).length,
    awaitingCeo: runs.filter((run) => run.status === "submitted").length,
    approvedNetPayroll: runs
      .filter((run) => run.status === "approved")
      .reduce((sum, run) => sum + run.netTotal, 0),
  };
}

export function buildAttendanceBatches(
  imports: PayrollDashboardImportRecord[],
  runs: PayrollDashboardRunRecord[],
  records: PayrollDashboardAttendanceRecord[],
  currentUserId: string,
): PayrollDashboardBatch[] {
  const runByImportId = new Map<string, PayrollDashboardRunRecord>();
  for (const run of [...runs].sort(
    (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
  )) {
    if (run.attendanceImportId && !runByImportId.has(run.attendanceImportId)) {
      runByImportId.set(run.attendanceImportId, run);
    }
  }

  const recordCountByImport = new Map<string, number>();
  const employeeKeysByImport = new Map<string, Set<string>>();
  for (const record of records) {
    recordCountByImport.set(
      record.importId,
      (recordCountByImport.get(record.importId) ?? 0) + 1,
    );
    const key =
      record.employeeId ?? record.employeeName.trim().toLocaleLowerCase("en-PH");
    const employeeKeys = employeeKeysByImport.get(record.importId) ?? new Set();
    if (key) employeeKeys.add(key);
    employeeKeysByImport.set(record.importId, employeeKeys);
  }

  const latestOwnedImportId = imports.find(
    (item) => item.uploadedBy === currentUserId,
  )?.id;

  return imports.map((item) => {
    const run = runByImportId.get(item.id);
    const hasRecordData = recordCountByImport.has(item.id);
    return {
      id: item.id,
      siteName: item.siteName,
      periodLabel: item.periodLabel,
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      employeeCount: hasRecordData
        ? employeeKeysByImport.get(item.id)?.size ?? 0
        : null,
      recordCount: hasRecordData ? recordCountByImport.get(item.id) ?? 0 : null,
      status: getAttendanceBatchStatus(run),
      payrollRunId: run?.id ?? null,
      isLatestOwnedBatch: item.id === latestOwnedImportId,
      createdAt: item.createdAt,
    };
  });
}

export function calculateApprovedPayrollOverview(
  runs: PayrollDashboardRunRecord[],
  items: PayrollDashboardItemRecord[],
): PayrollDashboardOverview {
  const approvedRuns = runs.filter((run) => run.status === "approved");
  const approvedIds = new Set(approvedRuns.map((run) => run.id));
  const approvedItems = items.filter((item) => approvedIds.has(item.payrollRunId));
  const itemRunIds = new Set(approvedItems.map((item) => item.payrollRunId));

  return {
    approvedRunCount: approvedRuns.length,
    grossPay: approvedRuns.reduce((sum, run) => sum + run.grossTotal, 0),
    regularPay: approvedItems.reduce((sum, item) => sum + item.regularPay, 0),
    overtimePay: approvedItems.reduce((sum, item) => sum + item.overtimePay, 0),
    holidayPay: approvedItems.reduce((sum, item) => sum + item.holidayPay, 0),
    deductions: approvedItems.reduce(
      (sum, item) => sum + item.deductionsTotal,
      0,
    ),
    netPay: approvedRuns.reduce((sum, run) => sum + run.netTotal, 0),
    hasPartialItemData: approvedRuns.some((run) => !itemRunIds.has(run.id)),
  };
}

export function buildPayrollActivity(
  imports: PayrollDashboardImportRecord[],
  runs: PayrollDashboardRunRecord[],
  actorNames: Map<string, string>,
): PayrollActivityItem[] {
  const actor = (id: string | null) =>
    (id ? actorNames.get(id) : null) ?? "User not recorded";

  const items: PayrollActivityItem[] = imports.map((item) => ({
    id: "attendance-" + item.id,
    type: "attendance",
    title: "Attendance batch uploaded",
    detail: item.siteName + " · " + item.periodLabel,
    actor: actor(item.uploadedBy),
    createdAt: item.createdAt,
  }));

  for (const run of runs) {
    items.push({
      id: "created-" + run.id,
      type: "created",
      title: "Payroll run created",
      detail: run.siteName + " · " + run.periodLabel,
      actor: actor(run.createdBy),
      createdAt: run.createdAt,
    });
    if (run.submittedAt) {
      items.push({
        id: "submitted-" + run.id,
        type: "submitted",
        title: "Payroll submitted to CEO",
        detail: run.siteName + " · " + run.periodLabel,
        actor: actor(run.submittedBy),
        createdAt: run.submittedAt,
      });
    }
    if (run.approvedAt) {
      items.push({
        id: "approved-" + run.id,
        type: "approved",
        title: "Payroll approved",
        detail: run.siteName + " · " + run.periodLabel,
        actor: actor(run.approvedBy),
        createdAt: run.approvedAt,
      });
    }
    if (run.rejectedAt) {
      items.push({
        id: "rejected-" + run.id,
        type: "rejected",
        title: "Payroll returned for correction",
        detail: run.rejectionReason?.trim() || run.siteName + " · " + run.periodLabel,
        actor: actor(run.approvedBy),
        createdAt: run.rejectedAt,
      });
    }
  }

  return items
    .filter((item) => Number.isFinite(Date.parse(item.createdAt)))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export function formatPayrollCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPayrollDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

export function formatPayrollDateTime(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(date);
}

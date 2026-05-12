"use server";

import type { PayrollRunStatus } from "@/types/database";
import type { Database } from "@/types/database";
import type { AttendanceRecordInput, PayrollRow } from "@/lib/payrollEngine";
import { calculatePayroll, roundPayrollCalculation } from "@/lib/payrollEngine";
import { DEFAULT_OVERTIME_MULTIPLIER } from "@/lib/payrollConfig";
import type {
  PayrollOvertimeEntry,
  PayrollRowOverride,
} from "@/features/payroll/types";
import type { PayrollRunRow } from "@/features/payroll-reports/types";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  allocateCombinedBranchPay,
  FIXED_PAY_RATE_PER_DAY,
  FULL_WORKDAY_HOURS,
} from "@/features/payroll/utils/payrollSelectors";
import {
  buildEmployeeBranchRateKey,
  normalizeEmployeeNameKey,
} from "@/features/payroll/utils/payrollMappers";
import { attachOvertimeRejectionReason } from "@/features/payroll/utils/overtimeRequestNotes";
import type { OvertimeRequestRecord } from "@/features/overtime-requests/types";

interface SubmitOvertimeRequestInput {
  employeeName: string;
  siteName: string;
  periodLabel?: string | null;
  requestDate: string;
  overtimeHours: number;
  amount?: number;
  reason?: string | null;
}

interface RejectOvertimeRequestFormInput {
  requestId: string;
  rejectionReason?: string | null;
}

interface SavePayrollRunInput {
  attendanceImportId: string | null;
  payrollRunId: string | null;
  siteName: string;
  attendancePeriod: string;
  payableHolidayDays: number;
  employeeBranchRates: Record<string, number>;
  payrollAttendanceInputs: AttendanceRecordInput[];
  payrollRows: PayrollRow[];
  payrollOverrides: Record<string, PayrollRowOverride | undefined>;
}

type PayrollSaveErrorDetails = Record<string, unknown>;

function createPayrollSaveError(
  code: string,
  message: string,
  details?: PayrollSaveErrorDetails,
): Error {
  const error = new Error(message) as Error & {
    code?: string;
    details?: PayrollSaveErrorDetails;
  };
  error.code = code;
  error.details = details;
  return error;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeLookupKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeSiteName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "Unknown Site";
  if (/^Multiple Sites/i.test(trimmed)) return trimmed;

  return trimmed
    .replace(/\.[^.]+$/i, "")
    .replace(/\s+\d{4}\s*to\s*\d{4}$/i, "")
    .replace(/\s+\d{4}to\d{4}$/i, "")
    .trim();
}

function parsePeriodRange(label: string): {
  start: string | null;
  end: string | null;
} {
  const match = label.match(/(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/);
  if (!match) {
    return { start: null, end: null };
  }

  return {
    start: match[1] ?? null,
    end: match[2] ?? null,
  };
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDateRange(start: string | null, end: string | null): string[] {
  const parseIsoDate = (value: string | null): Date | null => {
    if (!value) return null;
    const parsed = new Date(`${value}T00:00:00`);
    if (!Number.isFinite(parsed.getTime())) return null;
    return parsed;
  };

  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  if (!startDate || !endDate) return [];
  if (endDate.getTime() < startDate.getTime()) return [];

  const days: string[] = [];
  const cursor = new Date(startDate);
  const maxDays = 93;
  let count = 0;

  while (cursor.getTime() <= endDate.getTime() && count < maxDays) {
    days.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
    count += 1;
  }

  return days;
}

function splitSiteNames(value: string): string[] {
  return value
    .split(",")
    .map((site) => site.trim())
    .filter((site) => site.length > 0);
}

async function loadPayrollReportsData(
  database: any,
): Promise<{ reports: PayrollRunRow[] }> {
  const { data, error } = await database
    .from("payroll_runs")
    .select(
      "id, attendance_import_id, site_name, period_label, period_start, period_end, status, net_total, created_at, submitted_at",
    )
    .neq("status", "draft")
    .order("submitted_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load payroll reports. ${error.message}`);
  }

  return {
    reports: (data ?? []) as PayrollRunRow[],
  };
}

async function loadPayrollReportDetails(database: any, payrollRunId: string) {
  const runId = payrollRunId.trim();

  if (!runId) {
    throw new Error("Payroll report ID is required.");
  }

  const { data: report, error: reportError } = await database
    .from("payroll_runs")
    .select(
      "id, attendance_import_id, site_name, period_label, period_start, period_end, status, net_total, created_at, submitted_at",
    )
    .eq("id", runId)
    .single();

  if (reportError || !report) {
    throw new Error("Payroll report not found.");
  }

  const { data: itemsData, error: itemsError } = await database
    .from("payroll_run_items")
    .select(
      "id, employee_name, role_code, site_name, days_worked, hours_worked, overtime_hours, rate_per_day, regular_pay, overtime_pay, holiday_pay, deductions_total, total_pay",
    )
    .eq("payroll_run_id", runId)
    .order("employee_name", { ascending: true })
    .order("site_name", { ascending: true });

  const { data: totalsData, error: totalsError } = await database
    .from("payroll_run_daily_totals")
    .select(
      "id, payroll_run_item_id, employee_name, role_code, site_name, payout_date, hours_worked, total_pay",
    )
    .eq("payroll_run_id", runId)
    .order("payout_date", { ascending: true })
    .order("employee_name", { ascending: true });

  let attendanceLogsData:
    | Database["public"]["Tables"]["attendance_records"]["Row"][]
    | [] = [];

  if (report.attendance_import_id) {
    const { data: attendanceData, error: attendanceError } = await database
      .from("attendance_records")
      .select(
        "id, employee_name, log_date, log_time, log_type, log_source, site_name",
      )
      .eq("import_id", report.attendance_import_id)
      .order("log_date", { ascending: true })
      .order("log_time", { ascending: true });

    if (attendanceError) {
      throw new Error(
        `Unable to load attendance logs. ${attendanceError.message}`,
      );
    }

    attendanceLogsData = (attendanceData ??
      []) as Database["public"]["Tables"]["attendance_records"]["Row"][];
  }

  if (itemsError || totalsError) {
    throw new Error(
      itemsError?.message ||
        totalsError?.message ||
        "Unable to load payroll report details.",
    );
  }

  return {
    report: report as Pick<
      Database["public"]["Tables"]["payroll_runs"]["Row"],
      | "id"
      | "attendance_import_id"
      | "site_name"
      | "period_label"
      | "period_start"
      | "period_end"
      | "status"
      | "net_total"
      | "created_at"
      | "submitted_at"
    >,
    details: {
      loading: false,
      error: null,
      payrollItems: (itemsData ??
        []) as Database["public"]["Tables"]["payroll_run_items"]["Row"][],
      attendanceLogs: attendanceLogsData,
      dailyTotals: (totalsData ??
        []) as Database["public"]["Tables"]["payroll_run_daily_totals"]["Row"][],
    },
  };
}

async function loadPendingOvertimeApprovals(database: any) {
  const { data, error } = await database
    .from("payroll_adjustments")
    .select(
      "id, status, payroll_run_id, attendance_import_id, employee_name, role_code, site_name, period_label, period_start, period_end, quantity, amount, notes, created_at, effective_date, payroll_runs(site_name, period_label), payroll_run_items(employee_name, site_name)",
    )
    .eq("adjustment_type", "overtime")
    .in("status", ["pending", "approved", "rejected"])
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Unable to load pending overtime approvals. ${error.message}`,
    );
  }

  return {
    requests: (data ?? []) as Array<Record<string, unknown>>,
  };
}

function computeRowAdjustmentTotals(override: PayrollRowOverride | undefined) {
  const cashAdvance = round2(
    Number.isFinite(override?.cashAdvanceTotal)
      ? (override?.cashAdvanceTotal ?? 0)
      : (override?.cashAdvanceEntries ?? []).reduce(
          (sum, entry) => sum + entry.amount,
          0,
        ),
  );
  const overtimePay = round2(
    Number.isFinite(override?.overtimeEntriesPayTotal)
      ? (override?.overtimeEntriesPayTotal ?? 0)
      : (override?.overtimeEntries ?? []).reduce(
          (sum, entry) => sum + entry.pay,
          0,
        ),
  );
  const overtimeHours = round2(
    Number.isFinite(override?.overtimeEntriesHoursTotal)
      ? (override?.overtimeEntriesHoursTotal ?? 0)
      : (override?.overtimeEntries ?? []).reduce(
          (sum, entry) => sum + entry.hours,
          0,
        ),
  );
  const leavePay = round2(
    Number.isFinite(override?.paidLeaveEntriesPayTotal)
      ? (override?.paidLeaveEntriesPayTotal ?? 0)
      : (override?.paidLeaveEntries ?? []).reduce(
          (sum, entry) => sum + entry.pay,
          0,
        ),
  );
  const allowancePay = round2(
    Number.isFinite(override?.allowanceEntriesTotal)
      ? (override?.allowanceEntriesTotal ?? 0)
      : (override?.allowanceEntries ?? []).reduce(
          (sum, entry) => sum + entry.amount,
          0,
        ),
  );
  const deductions = round2(
    Number.isFinite(override?.deductionsTotal)
      ? (override?.deductionsTotal ?? 0)
      : (override?.deductionEntries ?? []).reduce(
          (sum, entry) =>
            sum +
            entry.sssGsis +
            entry.philHealth +
            entry.pagIbig +
            entry.withholdingTax +
            entry.otherDeductions,
          0,
        ),
  );

  return {
    cashAdvance,
    overtimePay,
    overtimeHours,
    leavePay,
    allowancePay,
    deductions,
    biometricOvertimeStatus: override?.biometricOvertimeStatus ?? null,
  };
}

function getPhilippineTodayIso(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (year && month && day) return `${year}-${month}-${day}`;
  return toIsoDate(new Date());
}

function buildAdvanceOvertimeCandidateKey(
  employeeName: string | null,
  roleCode: string | null,
  siteName: string | null,
): string {
  return [
    normalizeLookupKey(employeeName ?? ""),
    (roleCode ?? "").trim().toUpperCase(),
    normalizeLookupKey(siteName ?? ""),
  ].join("|||");
}

function buildPayrollCandidatesFromRows(
  rows: SyncAdvanceOvertimeRequestsInput["payrollRows"],
): AdvanceOvertimePayrollCandidate[] {
  return rows.map((row) => ({
    employeeName: row.worker,
    roleCode: row.role.trim().toUpperCase() || "UNKNOWN",
    siteName: normalizeSiteName(row.site),
    ratePerDay: round2(
      (row.customRate ?? row.defaultRate ?? 0) * FULL_WORKDAY_HOURS,
    ),
  }));
}

/** Supports DBs that omit `role_code` or store role under `role`. */
function extractOvertimeRequestRoleCodeFromRow(
  row: Record<string, unknown>,
): string {
  const fromRoleCode =
    typeof row.role_code === "string" ? row.role_code.trim() : "";
  if (fromRoleCode) return fromRoleCode.toUpperCase();

  const fromRole = typeof row.role === "string" ? row.role.trim() : "";
  if (fromRole) return fromRole.toUpperCase();

  return "";
}

function resolveAdvanceOvertimeCandidate(
  candidateLookup: Map<string, AdvanceOvertimePayrollCandidate>,
  employeeName: string,
  siteName: string,
  roleCodeFromRequest: string,
): AdvanceOvertimePayrollCandidate | undefined {
  const direct = candidateLookup.get(
    buildAdvanceOvertimeCandidateKey(
      employeeName,
      roleCodeFromRequest || null,
      siteName,
    ),
  );
  if (direct) return direct;

  if (roleCodeFromRequest) return undefined;

  const normalizedSite = normalizeLookupKey(siteName);
  const normalizedName = normalizeLookupKey(employeeName);
  const matches: AdvanceOvertimePayrollCandidate[] = [];
  for (const candidate of candidateLookup.values()) {
    if (
      normalizeLookupKey(candidate.employeeName) === normalizedName &&
      normalizeLookupKey(candidate.siteName) === normalizedSite
    ) {
      matches.push(candidate);
    }
  }
  if (matches.length === 1) return matches[0];
  return undefined;
}

async function syncAdvanceOvertimeRequestsForPayroll(
  database: any,
  input: {
    userId: string;
    attendanceImportId: string | null;
    attendancePeriod: string;
    candidates: AdvanceOvertimePayrollCandidate[];
  },
) {
  const periodRange = parsePeriodRange(input.attendancePeriod);
  if (!periodRange.start || !periodRange.end || input.candidates.length === 0) {
    return { approvedCount: 0, unmatchedCount: 0 };
  }

  const today = getPhilippineTodayIso();
  const candidateLookup = new Map<string, AdvanceOvertimePayrollCandidate>();
  input.candidates.forEach((candidate) => {
    candidateLookup.set(
      buildAdvanceOvertimeCandidateKey(
        candidate.employeeName,
        candidate.roleCode,
        candidate.siteName,
      ),
      candidate,
    );
  });

  const { data: requests, error } = await database
    .from("overtime_requests")
    .select("*")
    .eq("approval_mode", "auto_on_date")
    .eq("status", "pending")
    .gte("request_date", periodRange.start)
    .lte("request_date", periodRange.end)
    .lte("request_date", today);

  if (error) {
    throw new Error(`Failed to load advance overtime requests. ${error.message}`);
  }

  let approvedCount = 0;
  let unmatchedCount = 0;
  const approvedAt = new Date().toISOString();

  for (const raw of requests ?? []) {
    const request = raw as Record<string, unknown>;
    const id = String(request.id ?? "");
    const requestedBy = String(request.requested_by ?? "");
    const employeeName = String(request.employee_name ?? "");
    const siteName = String(request.site_name ?? "");
    const periodLabel =
      request.period_label == null ? null : String(request.period_label);
    const requestDate = String(request.request_date ?? "");
    const reason =
      request.reason == null ? null : String(request.reason);
    const payrollAdjustmentId =
      request.payroll_adjustment_id == null
        ? null
        : String(request.payroll_adjustment_id);

    if (!id || !employeeName || !siteName) {
      unmatchedCount += 1;
      continue;
    }

    if (periodLabel && periodLabel.trim() !== input.attendancePeriod) {
      continue;
    }

    const roleFromRow = extractOvertimeRequestRoleCodeFromRow(request);
    const candidate = resolveAdvanceOvertimeCandidate(
      candidateLookup,
      employeeName,
      siteName,
      roleFromRow,
    );

    if (!candidate) {
      unmatchedCount += 1;
      continue;
    }

    const overtimeHours = round2(Number(request.overtime_hours ?? 0));
    if (!Number.isFinite(overtimeHours) || overtimeHours <= 0) {
      unmatchedCount += 1;
      continue;
    }

    const calculated = roundPayrollCalculation(
      calculatePayroll({
        dailyRate: candidate.ratePerDay,
        regularHours: 0,
        overtimeHours,
        overtimeMultiplier: DEFAULT_OVERTIME_MULTIPLIER,
        allowance: 0,
        deductions: 0,
      }),
    );
    const amount = round2(calculated.overtimePay);
    const notes = [
      reason?.trim() || "Advance overtime request",
      `Auto-approved on ${today} for requested date ${requestDate}.`,
    ].join("\n");

    const adjustmentPayload = {
      payroll_run_id: null,
      payroll_run_item_id: null,
      attendance_import_id: input.attendanceImportId,
      employee_name: candidate.employeeName,
      employee_name_key: normalizeLookupKey(candidate.employeeName),
      role_code: candidate.roleCode,
      site_name: candidate.siteName,
      site_name_key: normalizeLookupKey(candidate.siteName),
      period_label: input.attendancePeriod,
      period_start: periodRange.start,
      period_end: periodRange.end,
      source_overtime_request_id: id,
      adjustment_type: "overtime",
      status: "approved",
      requested_by: requestedBy,
      approved_by: input.userId,
      effective_date: requestDate,
      quantity: overtimeHours,
      amount,
      notes,
    };

    let adjustmentId = payrollAdjustmentId;

    if (adjustmentId) {
      const { error: updateAdjustmentError } = await database
        .from("payroll_adjustments")
        .update(adjustmentPayload)
        .eq("id", adjustmentId);

      if (updateAdjustmentError) {
        throw new Error(
          `Failed to update auto-approved overtime adjustment. ${updateAdjustmentError.message}`,
        );
      }
    } else {
      const { data: existingAdjustment, error: existingAdjustmentError } =
        await database
          .from("payroll_adjustments")
          .select("id")
          .eq("source_overtime_request_id", id)
          .maybeSingle();

      if (existingAdjustmentError) {
        throw new Error(
          `Failed to check auto-approved overtime adjustment. ${existingAdjustmentError.message}`,
        );
      }

      if (existingAdjustment?.id) {
        adjustmentId = existingAdjustment.id;
        const { error: updateExistingError } = await database
          .from("payroll_adjustments")
          .update(adjustmentPayload)
          .eq("id", adjustmentId);

        if (updateExistingError) {
          throw new Error(
            `Failed to refresh auto-approved overtime adjustment. ${updateExistingError.message}`,
          );
        }
      } else {
        const { data: createdAdjustment, error: createAdjustmentError } =
          await database
            .from("payroll_adjustments")
            .insert(adjustmentPayload)
            .select("id")
            .single();

        if (createAdjustmentError || !createdAdjustment) {
          throw new Error(
            `Failed to create auto-approved overtime adjustment. ${createAdjustmentError?.message ?? ""}`,
          );
        }

        adjustmentId = createdAdjustment.id;
      }
    }

    const { error: updateRequestError } = await database
      .from("overtime_requests")
      .update({
        status: "approved",
        approved_by: input.userId,
        approved_at: approvedAt,
        auto_approved_at: approvedAt,
        payroll_adjustment_id: adjustmentId,
        amount,
        period_label: input.attendancePeriod,
        rejected_at: null,
        rejection_reason: null,
      })
      .eq("id", id)
      .eq("status", "pending");

    if (updateRequestError) {
      throw new Error(
        `Failed to mark advance overtime request approved. ${updateRequestError.message}`,
      );
    }

    approvedCount += 1;
  }

  return { approvedCount, unmatchedCount };
}

interface AdvanceOvertimePayrollCandidate {
  employeeName: string;
  roleCode: string;
  siteName: string;
  ratePerDay: number;
}

interface SyncAdvanceOvertimeRequestsInput {
  attendanceImportId: string | null;
  attendancePeriod: string;
  payrollRows: Array<{
    worker: string;
    role: string;
    site: string;
    defaultRate: number;
    customRate: number | null;
  }>;
}

interface DailyPayAllocationPoint {
  date: string;
  hoursWorked: number;
  totalPay: number;
}

function buildDailyPayAllocations(params: {
  totalPay: number;
  totalHoursWorked: number;
  periodStart: string | null;
  periodEnd: string | null;
  dailyHoursByDate: Map<string, number>;
}): DailyPayAllocationPoint[] {
  const totalPay = round2(Math.max(0, params.totalPay));
  if (totalPay <= 0) return [];

  const sortedDailyHoursEntries = Array.from(params.dailyHoursByDate.entries())
    .filter(([, hours]) => Number.isFinite(hours) && hours > 0)
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (sortedDailyHoursEntries.length > 0) {
    const sumHours = sortedDailyHoursEntries.reduce(
      (sum, [, hours]) => sum + hours,
      0,
    );

    if (sumHours > 0) {
      let allocated = 0;

      return sortedDailyHoursEntries.map(([date, hours], index) => {
        const isLast = index === sortedDailyHoursEntries.length - 1;
        const payPortion = isLast
          ? round2(totalPay - allocated)
          : round2(totalPay * (hours / sumHours));
        allocated = round2(allocated + payPortion);

        return {
          date,
          hoursWorked: round2(hours),
          totalPay: payPortion,
        };
      });
    }
  }

  const fallbackDates = buildDateRange(params.periodStart, params.periodEnd);
  const dates =
    fallbackDates.length > 0
      ? fallbackDates
      : [params.periodEnd ?? params.periodStart ?? toIsoDate(new Date())];
  const fallbackHours =
    dates.length > 0 ? params.totalHoursWorked / dates.length : 0;
  let allocated = 0;

  return dates.map((date, index) => {
    const isLast = index === dates.length - 1;
    const payPortion = isLast
      ? round2(totalPay - allocated)
      : round2(totalPay / dates.length);
    allocated = round2(allocated + payPortion);

    return {
      date,
      hoursWorked: round2(Math.max(0, fallbackHours)),
      totalPay: payPortion,
    };
  });
}

interface RequestOvertimeApprovalInput {
  attendanceImportId: string | null;
  employeeName: string;
  roleCode: string;
  siteName: string;
  attendancePeriod: string;
  overtimeEntries: PayrollOvertimeEntry[];
}

interface PayrollManagerReportNotificationRow {
  id: string;
  attendance_import_id: string | null;
  site_name: string;
  period_label: string;
  status: PayrollRunStatus;
  rejection_reason: string | null;
  rejected_at: string | null;
  updated_at: string;
}

interface RejectPayrollReportInput {
  payrollRunId: string;
  rejectionReason?: string;
}

interface RejectOvertimeAdjustmentInput {
  adjustmentId: string;
  rejectionReason?: string;
}

interface PayrollManagerOvertimeNotificationRow {
  id: string;
  employee_name: string | null;
  site_name: string | null;
  period_label: string | null;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  updated_at: string;
}

export async function requestOvertimeApprovalAction(
  input: RequestOvertimeApprovalInput,
) {
  const { user } = await requireRole("payroll_manager");
  const database = createSupabaseAdminClient() as any;
  const periodRange = parsePeriodRange(input.attendancePeriod);
  const employeeName = input.employeeName.trim();
  const siteName = normalizeSiteName(input.siteName);
  const roleCode = input.roleCode.trim().toUpperCase() || "UNKNOWN";
  const employeeNameKey = normalizeLookupKey(employeeName);
  const siteNameKey = normalizeLookupKey(siteName);
  const nextEntries = input.overtimeEntries
    .map((entry) => ({
      hours:
        Number.isFinite(entry.hours) && entry.hours > 0
          ? round2(entry.hours)
          : 0,
      pay: Number.isFinite(entry.pay) && entry.pay > 0 ? round2(entry.pay) : 0,
      notes: entry.notes?.trim() ?? "",
    }))
    .filter((entry) => entry.hours > 0 || entry.pay > 0);

  let deleteQuery = database
    .from("payroll_adjustments")
    .delete()
    .eq("adjustment_type", "overtime")
    .eq("status", "pending")
    .eq("requested_by", user.id)
    .eq("employee_name_key", employeeNameKey)
    .eq("role_code", roleCode)
    .eq("site_name_key", siteNameKey)
    .eq("period_label", input.attendancePeriod);

  deleteQuery = input.attendanceImportId
    ? deleteQuery.eq("attendance_import_id", input.attendanceImportId)
    : deleteQuery.is("attendance_import_id", null);

  const { error: deleteError } = await deleteQuery;

  if (deleteError) {
    throw new Error("Failed to replace pending overtime requests.");
  }

  if (nextEntries.length === 0) {
    return {
      entries: [] as PayrollOvertimeEntry[],
    };
  }

  const payload = nextEntries.map((entry) => ({
    payroll_run_id: null,
    payroll_run_item_id: null,
    attendance_import_id: input.attendanceImportId,
    employee_name: employeeName,
    employee_name_key: employeeNameKey,
    role_code: roleCode,
    site_name: siteName,
    site_name_key: siteNameKey,
    period_label: input.attendancePeriod,
    period_start: periodRange.start,
    period_end: periodRange.end,
    adjustment_type: "overtime",
    status: "pending",
    requested_by: user.id,
    approved_by: null,
    effective_date: periodRange.end,
    quantity: entry.hours,
    amount: entry.pay,
    notes: entry.notes || "Overtime request",
  }));

  const { data, error } = await database
    .from("payroll_adjustments")
    .insert(payload)
    .select("id, quantity, amount, notes, status");

  if (error) {
    throw new Error("Failed to create overtime approval request.");
  }

  return {
    entries: (
      (data ?? []) as Array<{
        id: string;
        quantity: number;
        amount: number;
        notes: string | null;
        status: "pending" | "approved" | "rejected";
      }>
    ).map((entry) => ({
      id: entry.id,
      requestId: entry.id,
      hours: round2(entry.quantity ?? 0),
      pay: round2(entry.amount ?? 0),
      notes: entry.notes ?? "",
      status: entry.status,
    })),
  };
}

export async function syncAdvanceOvertimeRequestsForPayrollAction(
  input: SyncAdvanceOvertimeRequestsInput,
) {
  const { user } = await requireRole(["ceo", "payroll_manager"]);
  const database = createSupabaseAdminClient() as any;

  return syncAdvanceOvertimeRequestsForPayroll(database, {
    userId: user.id,
    attendanceImportId: input.attendanceImportId,
    attendancePeriod: input.attendancePeriod,
    candidates: buildPayrollCandidatesFromRows(input.payrollRows),
  });
}

export async function savePayrollRunAction(input: SavePayrollRunInput) {
  const { user } = await requireRole(["ceo", "payroll_manager"]);
  const database = createSupabaseAdminClient() as any;
  const periodRange = parsePeriodRange(input.attendancePeriod);

  if (input.payrollRows.length === 0) {
    throw createPayrollSaveError(
      "PAYROLL_SAVE_NO_ROWS",
      "No payroll rows to save.",
      {
        attendanceImportId: input.attendanceImportId,
        payrollRunId: input.payrollRunId,
        attendancePeriod: input.attendancePeriod,
      },
    );
  }

  if (!input.attendancePeriod.trim()) {
    throw createPayrollSaveError(
      "PAYROLL_SAVE_NO_PERIOD",
      "Attendance period is required before saving payroll.",
    );
  }

  const { data: siteData } = await database
    .from("sites")
    .select("id")
    .eq("name", normalizeSiteName(input.siteName))
    .maybeSingle();
  const site = (siteData ?? null) as { id: string } | null;

  const rowSnapshots = input.payrollRows.map((row) => {
    const override = input.payrollOverrides[row.id];
    const {
      cashAdvance,
      overtimePay,
      overtimeHours,
      leavePay,
      allowancePay,
      deductions,
      biometricOvertimeStatus,
    } = computeRowAdjustmentTotals(override);
    const branchRateKey = buildEmployeeBranchRateKey(
      row.worker,
      row.role,
      row.site,
    );
    const ratePerDay = round2(
      input.employeeBranchRates[branchRateKey] ??
        (row.customRate ?? row.defaultRate) * FULL_WORKDAY_HOURS,
    );

    return {
      row,
      override,
      cashAdvance,
      deductions,
      overtimePay,
      overtimeHours,
      leavePay,
      allowancePay,
      ratePerDay,
      biometricOvertimeStatus,
    };
  });

  const rowKeyLookup = new Set(
    rowSnapshots.map(
      (snapshot) =>
        `${normalizeLookupKey(snapshot.row.worker)}|||${snapshot.row.role.trim().toUpperCase()}|||${normalizeLookupKey(snapshot.row.site)}`,
    ),
  );

  await syncAdvanceOvertimeRequestsForPayroll(database, {
    userId: user.id,
    attendanceImportId: input.attendanceImportId,
    attendancePeriod: input.attendancePeriod,
    candidates: rowSnapshots.map((snapshot) => ({
      employeeName: snapshot.row.worker,
      roleCode: snapshot.row.role.trim().toUpperCase() || "UNKNOWN",
      siteName: normalizeSiteName(snapshot.row.site),
      ratePerDay: snapshot.ratePerDay,
    })),
  });

  let approvedOvertimeQuery = database
    .from("payroll_adjustments")
    .select(
      "id, payroll_run_id, payroll_run_item_id, employee_name_key, role_code, site_name_key, quantity, amount",
    )
    .eq("adjustment_type", "overtime")
    .eq("status", "approved")
    .eq("period_label", input.attendancePeriod);

  approvedOvertimeQuery = input.attendanceImportId
    ? approvedOvertimeQuery.eq("attendance_import_id", input.attendanceImportId)
    : approvedOvertimeQuery.is("attendance_import_id", null);

  const { data: approvedOvertimeRows, error: approvedOvertimeError } =
    await approvedOvertimeQuery;

  if (approvedOvertimeError) {
    throw createPayrollSaveError(
      "PAYROLL_SAVE_LOAD_APPROVED_OVERTIME_FAILED",
      "Failed to load approved overtime requests.",
      {
        message: approvedOvertimeError.message,
        code: approvedOvertimeError.code,
        details: approvedOvertimeError.details,
        hint: approvedOvertimeError.hint,
      },
    );
  }

  const approvedOvertimeByRowKey = new Map<
    string,
    {
      totalHours: number;
      totalPay: number;
      adjustmentIds: string[];
    }
  >();

  for (const row of (approvedOvertimeRows ?? []) as Array<{
    id: string;
    payroll_run_id: string | null;
    payroll_run_item_id: string | null;
    employee_name_key: string | null;
    role_code: string | null;
    site_name_key: string | null;
    quantity: number;
    amount: number;
  }>) {
    const rowKey = `${row.employee_name_key ?? ""}|||${row.role_code ?? ""}|||${row.site_name_key ?? ""}`;
    if (!rowKeyLookup.has(rowKey)) continue;

    const current = approvedOvertimeByRowKey.get(rowKey) ?? {
      totalHours: 0,
      totalPay: 0,
      adjustmentIds: [],
    };
    current.totalHours = round2(current.totalHours + (row.quantity ?? 0));
    current.totalPay = round2(current.totalPay + (row.amount ?? 0));
    current.adjustmentIds.push(row.id);
    approvedOvertimeByRowKey.set(rowKey, current);
  }

  const allocatedBasePayByRowId = new Map<string, number>();
  const holidayPayByRowId = new Map<string, number>();

  const snapshotsByEmployee = new Map<string, typeof rowSnapshots>();
  for (const snapshot of rowSnapshots) {
    const employeeKey = normalizeEmployeeNameKey(snapshot.row.worker);
    const existing = snapshotsByEmployee.get(employeeKey);

    if (existing) {
      existing.push(snapshot);
      continue;
    }

    snapshotsByEmployee.set(employeeKey, [snapshot]);
  }

  for (const employeeSnapshots of snapshotsByEmployee.values()) {
    employeeSnapshots.forEach((snapshot) => {
      const includedSites = new Set(splitSiteNames(snapshot.row.site));
      const hoursBySite = new Map<string, number>();

      input.payrollAttendanceInputs.forEach((record) => {
        if (
          normalizeEmployeeNameKey(record.name) !==
          normalizeEmployeeNameKey(snapshot.row.worker)
        ) {
          return;
        }
        if (
          (record.role ?? "").trim().toUpperCase() !==
          snapshot.row.role.trim().toUpperCase()
        ) {
          return;
        }

        const siteName = normalizeSiteName(record.site);
        if (includedSites.size > 0 && !includedSites.has(siteName)) {
          return;
        }

        hoursBySite.set(
          siteName,
          round2((hoursBySite.get(siteName) ?? 0) + (record.hours ?? 0)),
        );
      });

      const allocationEntries =
        hoursBySite.size > 0
          ? Array.from(hoursBySite.entries()).map(([site, hoursWorked]) => ({
              site,
              hoursWorked,
              dailyRatePerDay:
                input.employeeBranchRates[
                  buildEmployeeBranchRateKey(
                    snapshot.row.worker,
                    snapshot.row.role,
                    site,
                  )
                ] ?? snapshot.ratePerDay,
            }))
          : [
              {
                site: snapshot.row.site,
                hoursWorked: snapshot.row.hoursWorked,
                dailyRatePerDay: snapshot.ratePerDay,
              },
            ];

      const allocation = allocateCombinedBranchPay(allocationEntries);
      allocatedBasePayByRowId.set(snapshot.row.id, allocation.totalBasePay);
    });

    const holidayBonusDays = Math.max(0, input.payableHolidayDays);
    const firstRowId = employeeSnapshots[0]?.row.id;
    if (holidayBonusDays > 0 && firstRowId) {
      holidayPayByRowId.set(
        firstRowId,
        round2(holidayBonusDays * FIXED_PAY_RATE_PER_DAY),
      );
    }
  }

  const normalizedRowSnapshots = rowSnapshots.map((snapshot) => {
    const allocatedBasePay = round2(
      allocatedBasePayByRowId.get(snapshot.row.id) ?? 0,
    );
    const holidayPay = round2(holidayPayByRowId.get(snapshot.row.id) ?? 0);

    const approvedOvertime =
      approvedOvertimeByRowKey.get(
        `${normalizeLookupKey(snapshot.row.worker)}|||${snapshot.row.role.trim().toUpperCase()}|||${normalizeLookupKey(snapshot.row.site)}`,
      ) ?? null;

    const approvedOvertimeHours = round2(approvedOvertime?.totalHours ?? 0);
    const includedSites = new Set(splitSiteNames(snapshot.row.site));
    const storedBiometricHours = snapshot.override?.biometricOvertimeHours;
    const biometricOvertimeHours =
      snapshot.biometricOvertimeStatus === "approved"
        ? storedBiometricHours != null && Number.isFinite(storedBiometricHours)
          ? round2(Number(storedBiometricHours))
          : round2(
              input.payrollAttendanceInputs.reduce((sum, record) => {
                if (
                  normalizeEmployeeNameKey(record.name) !==
                  normalizeEmployeeNameKey(snapshot.row.worker)
                ) {
                  return sum;
                }
                if (
                  (record.role ?? "").trim().toUpperCase() !==
                  snapshot.row.role.trim().toUpperCase()
                ) {
                  return sum;
                }

                const siteName = normalizeSiteName(record.site);
                if (includedSites.size > 0 && !includedSites.has(siteName)) {
                  return sum;
                }

                return sum + (record.overtimeHours ?? 0);
              }, 0),
            )
        : 0;
    const overtimeHours = round2(
      biometricOvertimeHours + approvedOvertimeHours,
    );
    const allowance = round2(
      holidayPay + snapshot.leavePay + snapshot.allowancePay,
    );
    const calculation = roundPayrollCalculation(
      calculatePayroll({
        dailyRate: snapshot.ratePerDay,
        regularHours: snapshot.row.hoursWorked,
        overtimeHours,
        overtimeMultiplier: DEFAULT_OVERTIME_MULTIPLIER,
        allowance,
        deductions: {
          cashAdvance: snapshot.cashAdvance,
          payrollDeductions: snapshot.deductions,
        },
      }),
    );

    return {
      ...snapshot,
      allocatedBasePay,
      holidayPay,
      allowance,
      regularPayExcludingHoliday: calculation.regularPay,
      approvedOvertimeHours,
      biometricOvertimeHours,
      overtimeHours,
      approvedOvertimePay: calculation.overtimePay,
      totalDeductions: calculation.totalDeductions,
      totalPay: calculation.netPay,
      approvedOvertimeAdjustmentIds: approvedOvertime?.adjustmentIds ?? [],
    };
  });

  const grossTotal = round2(
    normalizedRowSnapshots.reduce(
      (sum, snapshot) => sum + snapshot.totalPay + snapshot.totalDeductions,
      0,
    ),
  );
  const netTotal = round2(
    normalizedRowSnapshots.reduce(
      (sum, snapshot) => sum + snapshot.totalPay,
      0,
    ),
  );

  let runId = input.payrollRunId;

  if (!runId) {
    const existingRunQuery = database
      .from("payroll_runs")
      .select("id, created_at")
      .eq("period_label", input.attendancePeriod)
      .eq("site_name", normalizeSiteName(input.siteName))
      .neq("status", "rejected")
      .order("created_at", { ascending: false })
      .limit(10);

    const { data: existingRuns, error: existingRunLookupError } =
      await existingRunQuery;

    if (existingRunLookupError) {
      throw createPayrollSaveError(
        "PAYROLL_SAVE_LOOKUP_EXISTING_RUN_FAILED",
        "Failed to check for an existing payroll run.",
        {
          attendanceImportId: input.attendanceImportId,
          siteName: normalizeSiteName(input.siteName),
          attendancePeriod: input.attendancePeriod,
          message: existingRunLookupError.message,
          code: existingRunLookupError.code,
          details: existingRunLookupError.details,
          hint: existingRunLookupError.hint,
        },
      );
    }

    const matchedExistingRun = (
      (existingRuns ?? []) as Array<{
        id: string;
        created_at: string;
      }>
    ).find(Boolean);

    if (matchedExistingRun) {
      runId = matchedExistingRun.id;
    }
  }

  if (runId) {
    const { error: updateRunError } = await database
      .from("payroll_runs")
      .update({
        attendance_import_id: input.attendanceImportId,
        site_id: site?.id ?? null,
        site_name: normalizeSiteName(input.siteName),
        period_label: input.attendancePeriod,
        period_start: periodRange.start,
        period_end: periodRange.end,
        status: "submitted" satisfies PayrollRunStatus,
        submitted_by: user.id,
        submitted_at: new Date().toISOString(),
        gross_total: grossTotal,
        net_total: netTotal,
      })
      .eq("id", runId);

    if (updateRunError) {
      throw createPayrollSaveError(
        "PAYROLL_SAVE_UPDATE_RUN_FAILED",
        "Failed to update payroll run.",
        {
          runId,
          message: updateRunError.message,
          code: updateRunError.code,
          details: updateRunError.details,
          hint: updateRunError.hint,
        },
      );
    }

    const { error: clearItemRefsError } = await database
      .from("payroll_adjustments")
      .update({
        payroll_run_item_id: null,
      })
      .eq("payroll_run_id", runId);

    if (clearItemRefsError) {
      throw createPayrollSaveError(
        "PAYROLL_SAVE_CLEAR_ADJUSTMENT_ITEM_LINKS_FAILED",
        "Failed to reset payroll adjustment item links.",
        {
          runId,
          message: clearItemRefsError.message,
          code: clearItemRefsError.code,
          details: clearItemRefsError.details,
          hint: clearItemRefsError.hint,
        },
      );
    }

    const { error: deleteAdjustmentsError } = await database
      .from("payroll_adjustments")
      .delete()
      .eq("payroll_run_id", runId)
      .in("adjustment_type", ["paid_holiday", "cash_advance", "paid_leave"]);

    if (deleteAdjustmentsError) {
      throw createPayrollSaveError(
        "PAYROLL_SAVE_CLEAR_ADJUSTMENTS_FAILED",
        "Failed to replace payroll adjustments.",
        {
          runId,
          message: deleteAdjustmentsError.message,
          code: deleteAdjustmentsError.code,
          details: deleteAdjustmentsError.details,
          hint: deleteAdjustmentsError.hint,
        },
      );
    }

    const { error: deleteItemsError } = await database
      .from("payroll_run_items")
      .delete()
      .eq("payroll_run_id", runId);

    if (deleteItemsError) {
      throw createPayrollSaveError(
        "PAYROLL_SAVE_CLEAR_ITEMS_FAILED",
        "Failed to replace payroll items.",
        {
          runId,
          message: deleteItemsError.message,
          code: deleteItemsError.code,
          details: deleteItemsError.details,
          hint: deleteItemsError.hint,
        },
      );
    }

    const { error: deleteDailyTotalsError } = await database
      .from("payroll_run_daily_totals")
      .delete()
      .eq("payroll_run_id", runId);

    if (deleteDailyTotalsError) {
      throw createPayrollSaveError(
        "PAYROLL_SAVE_CLEAR_DAILY_TOTALS_FAILED",
        "Failed to replace payroll daily totals.",
        {
          runId,
          message: deleteDailyTotalsError.message,
          code: deleteDailyTotalsError.code,
          details: deleteDailyTotalsError.details,
          hint: deleteDailyTotalsError.hint,
        },
      );
    }
  } else {
    const { data: payrollRun, error: payrollRunError } = await database
      .from("payroll_runs")
      .insert({
        attendance_import_id: input.attendanceImportId,
        site_id: site?.id ?? null,
        site_name: normalizeSiteName(input.siteName),
        period_label: input.attendancePeriod,
        period_start: periodRange.start,
        period_end: periodRange.end,
        status: "submitted" satisfies PayrollRunStatus,
        created_by: user.id,
        submitted_by: user.id,
        submitted_at: new Date().toISOString(),
        gross_total: grossTotal,
        net_total: netTotal,
      })
      .select("id")
      .single();

    if (payrollRunError || !payrollRun) {
      throw createPayrollSaveError(
        "PAYROLL_SAVE_CREATE_RUN_FAILED",
        "Failed to save payroll run.",
        {
          attendanceImportId: input.attendanceImportId,
          siteName: normalizeSiteName(input.siteName),
          attendancePeriod: input.attendancePeriod,
          message: payrollRunError?.message ?? "No row returned",
          code: payrollRunError?.code,
          details: payrollRunError?.details,
          hint: payrollRunError?.hint,
        },
      );
    }

    runId = payrollRun.id as string;
  }

  const payrollItemPayload = normalizedRowSnapshots.map((snapshot) => ({
    payroll_run_id: runId,
    employee_id: null,
    employee_name: snapshot.row.worker,
    role_code: snapshot.row.role,
    site_name: snapshot.row.site,
    days_worked:
      snapshot.ratePerDay > 0
        ? round2(snapshot.allocatedBasePay / snapshot.ratePerDay)
        : 0,
    hours_worked: snapshot.row.hoursWorked,
    overtime_hours: snapshot.approvedOvertimeHours,
    rate_per_day: snapshot.ratePerDay,
    regular_pay: snapshot.regularPayExcludingHoliday,
    overtime_pay: snapshot.approvedOvertimePay,
    holiday_pay: snapshot.allowance,
    deductions_total: snapshot.totalDeductions,
    total_pay: snapshot.totalPay,
  }));

  const { data: insertedItems, error: itemsError } = await database
    .from("payroll_run_items")
    .insert(payrollItemPayload)
    .select("id, employee_name, role_code, site_name");

  if (itemsError) {
    throw createPayrollSaveError(
      "PAYROLL_SAVE_ITEMS_FAILED",
      "Failed to save payroll items.",
      {
        runId,
        itemCount: payrollItemPayload.length,
        message: itemsError.message,
        code: itemsError.code,
        details: itemsError.details,
        hint: itemsError.hint,
      },
    );
  }

  const itemIdByKey = new Map<string, string>(
    (
      (insertedItems ?? []) as Array<{
        id: string;
        employee_name: string;
        role_code: string;
        site_name: string;
      }>
    ).map((item) => [
      `${item.role_code}|||${item.employee_name}|||${item.site_name}`.toLowerCase(),
      item.id,
    ]),
  );

  const dailyTotalsPayload: Array<Record<string, unknown>> = [];

  for (const snapshot of normalizedRowSnapshots) {
    const rowKey =
      `${snapshot.row.role}|||${snapshot.row.worker}|||${snapshot.row.site}`.toLowerCase();
    const payrollRunItemId = itemIdByKey.get(rowKey) ?? null;
    if (!payrollRunItemId) continue;

    const normalizedSites = new Set(
      splitSiteNames(snapshot.row.site).map((site) => normalizeSiteName(site)),
    );
    const normalizedEmployeeName = normalizeEmployeeNameKey(
      snapshot.row.worker,
    );
    const normalizedRoleCode = snapshot.row.role.trim().toUpperCase();
    const strictDailyHoursByDate = new Map<string, number>();
    const fallbackDailyHoursByDate = new Map<string, number>();

    input.payrollAttendanceInputs.forEach((record) => {
      if (normalizeEmployeeNameKey(record.name) !== normalizedEmployeeName)
        return;

      const siteName = normalizeSiteName(record.site);
      if (normalizedSites.size > 0 && !normalizedSites.has(siteName)) return;

      const recordDate = record.date?.trim();
      if (!recordDate) return;
      const recordHours = Number.isFinite(record.hours) ? record.hours : 0;
      if (recordHours <= 0) return;

      fallbackDailyHoursByDate.set(
        recordDate,
        round2((fallbackDailyHoursByDate.get(recordDate) ?? 0) + recordHours),
      );

      const recordRole = (record.role ?? "").trim().toUpperCase();
      if (recordRole !== normalizedRoleCode) return;

      strictDailyHoursByDate.set(
        recordDate,
        round2((strictDailyHoursByDate.get(recordDate) ?? 0) + recordHours),
      );
    });

    const effectiveDailyHoursByDate =
      strictDailyHoursByDate.size > 0
        ? strictDailyHoursByDate
        : fallbackDailyHoursByDate;

    const allocations = buildDailyPayAllocations({
      totalPay: snapshot.totalPay,
      totalHoursWorked: snapshot.row.hoursWorked,
      periodStart: periodRange.start,
      periodEnd: periodRange.end,
      dailyHoursByDate: effectiveDailyHoursByDate,
    });

    allocations
      .filter((entry) => entry.totalPay > 0)
      .forEach((entry) => {
        dailyTotalsPayload.push({
          payroll_run_id: runId,
          payroll_run_item_id: payrollRunItemId,
          attendance_import_id: input.attendanceImportId,
          employee_name: snapshot.row.worker,
          role_code: snapshot.row.role,
          site_name: snapshot.row.site,
          payout_date: entry.date,
          hours_worked: entry.hoursWorked,
          total_pay: entry.totalPay,
        });
      });
  }

  if (dailyTotalsPayload.length > 0) {
    const { error: dailyTotalsError } = await database
      .from("payroll_run_daily_totals")
      .insert(dailyTotalsPayload);

    if (dailyTotalsError) {
      throw createPayrollSaveError(
        "PAYROLL_SAVE_DAILY_TOTALS_FAILED",
        "Failed to save payroll daily totals.",
        {
          runId,
          rowCount: dailyTotalsPayload.length,
          message: dailyTotalsError.message,
          code: dailyTotalsError.code,
          details: dailyTotalsError.details,
          hint: dailyTotalsError.hint,
        },
      );
    }
  }

  const adjustmentPayload: Array<Record<string, unknown>> = [];
  const approvedAdjustmentRelinks: Array<{
    adjustmentIds: string[];
    payrollRunItemId: string | null;
  }> = [];

  for (const snapshot of normalizedRowSnapshots) {
    const rowKey =
      `${snapshot.row.role}|||${snapshot.row.worker}|||${snapshot.row.site}`.toLowerCase();
    const payrollRunItemId = itemIdByKey.get(rowKey) ?? null;

    if (snapshot.approvedOvertimeAdjustmentIds.length > 0) {
      approvedAdjustmentRelinks.push({
        adjustmentIds: snapshot.approvedOvertimeAdjustmentIds,
        payrollRunItemId,
      });
    }

    if (snapshot.holidayPay > 0) {
      adjustmentPayload.push({
        payroll_run_id: runId,
        payroll_run_item_id: payrollRunItemId,
        adjustment_type: "paid_holiday",
        status: "approved",
        requested_by: user.id,
        approved_by: user.id,
        effective_date: periodRange.end,
        quantity: Number(
          (snapshot.ratePerDay > 0
            ? snapshot.holidayPay / snapshot.ratePerDay
            : 1
          ).toFixed(2),
        ),
        amount: snapshot.holidayPay,
        notes: "Saved with payroll",
      });
    }

    if (snapshot.cashAdvance > 0) {
      adjustmentPayload.push({
        payroll_run_id: runId,
        payroll_run_item_id: payrollRunItemId,
        adjustment_type: "cash_advance",
        status: "approved",
        requested_by: user.id,
        approved_by: user.id,
        effective_date: periodRange.end,
        quantity: 1,
        amount: snapshot.cashAdvance,
        notes: "Saved with payroll",
      });
    }

    if (snapshot.leavePay > 0) {
      adjustmentPayload.push({
        payroll_run_id: runId,
        payroll_run_item_id: payrollRunItemId,
        adjustment_type: "paid_leave",
        status: "approved",
        requested_by: user.id,
        approved_by: user.id,
        effective_date: periodRange.end,
        quantity: 1,
        amount: snapshot.leavePay,
        notes: "Saved with payroll",
      });
    }
  }

  if (adjustmentPayload.length > 0) {
    const { error: adjustmentError } = await database
      .from("payroll_adjustments")
      .insert(adjustmentPayload);

    if (adjustmentError) {
      throw createPayrollSaveError(
        "PAYROLL_SAVE_ADJUSTMENTS_FAILED",
        "Failed to save payroll adjustments.",
        {
          runId,
          adjustmentCount: adjustmentPayload.length,
          message: adjustmentError.message,
          code: adjustmentError.code,
          details: adjustmentError.details,
          hint: adjustmentError.hint,
        },
      );
    }
  }

  for (const relink of approvedAdjustmentRelinks) {
    if (relink.adjustmentIds.length === 0) continue;

    const { error: relinkError } = await database
      .from("payroll_adjustments")
      .update({
        payroll_run_id: runId,
        payroll_run_item_id: relink.payrollRunItemId,
      })
      .in("id", relink.adjustmentIds);

    if (relinkError) {
      throw createPayrollSaveError(
        "PAYROLL_SAVE_RELINK_APPROVED_OVERTIME_FAILED",
        "Failed to relink approved overtime requests.",
        {
          runId,
          adjustmentIds: relink.adjustmentIds,
          message: relinkError.message,
          code: relinkError.code,
          details: relinkError.details,
          hint: relinkError.hint,
        },
      );
    }
  }

  return {
    runId,
    status: "submitted" as PayrollRunStatus,
  };
}

export async function approveOvertimeAdjustmentAction(adjustmentId: string) {
  const { user } = await requireRole("ceo");
  const database = createSupabaseAdminClient() as any;

  const { data: adjustment, error: adjustmentError } = await database
    .from("payroll_adjustments")
    .select(
      "id, payroll_run_id, payroll_run_item_id, attendance_import_id, employee_name, role_code, site_name, period_label, adjustment_type, status, quantity, amount",
    )
    .eq("id", adjustmentId)
    .single();

  if (adjustmentError || !adjustment) {
    throw new Error("Failed to load overtime request.");
  }

  if (
    adjustment.adjustment_type !== "overtime" ||
    adjustment.status !== "pending"
  ) {
    throw new Error("This overtime request can no longer be updated.");
  }

  let runId: string | null = adjustment.payroll_run_id ?? null;

  if (!runId && adjustment.period_label) {
    let matchedRunQuery = database
      .from("payroll_runs")
      .select("id")
      .eq("period_label", adjustment.period_label)
      .neq("status", "rejected")
      .order("created_at", { ascending: false })
      .limit(1);

    if (adjustment.site_name) {
      matchedRunQuery = matchedRunQuery.eq(
        "site_name",
        normalizeSiteName(adjustment.site_name),
      );
    }

    matchedRunQuery = adjustment.attendance_import_id
      ? matchedRunQuery.eq(
          "attendance_import_id",
          adjustment.attendance_import_id,
        )
      : matchedRunQuery;

    const { data: matchedRun } = await matchedRunQuery.maybeSingle();

    runId = (matchedRun?.id as string | undefined) ?? null;
  }

  const { error: approveAdjustmentError } = await database
    .from("payroll_adjustments")
    .update({
      status: "approved",
      approved_by: user.id,
      payroll_run_id: runId,
    })
    .eq("id", adjustment.id)
    .eq("status", "pending");

  if (approveAdjustmentError) {
    throw new Error("Failed to approve overtime request.");
  }

  if (
    runId &&
    adjustment.employee_name &&
    adjustment.role_code &&
    adjustment.site_name
  ) {
    const { data: item, error: itemError } = await database
      .from("payroll_run_items")
      .select(
        "id, hours_worked, overtime_hours, rate_per_day, regular_pay, overtime_pay, holiday_pay, deductions_total, total_pay",
      )
      .eq("payroll_run_id", runId)
      .eq("employee_name", adjustment.employee_name)
      .eq("role_code", adjustment.role_code)
      .eq("site_name", adjustment.site_name)
      .maybeSingle();

    if (!itemError && item) {
      const { data: run, error: runError } = await database
        .from("payroll_runs")
        .select("id, gross_total, net_total, period_end")
        .eq("id", runId)
        .single();

      if (!runError && run) {
        const previousTotalPay = item.total_pay ?? 0;
        const previousOvertimePay = item.overtime_pay ?? 0;
        const overtimeHours = round2(
          (item.overtime_hours ?? 0) + (adjustment.quantity ?? 0),
        );
        const calculation = roundPayrollCalculation(
          calculatePayroll({
            dailyRate: item.rate_per_day ?? 0,
            regularHours: item.hours_worked ?? 0,
            overtimeHours,
            overtimeMultiplier: DEFAULT_OVERTIME_MULTIPLIER,
            allowance: item.holiday_pay ?? 0,
            deductions: item.deductions_total ?? 0,
          }),
        );
        const overtimePay = calculation.overtimePay;
        const totalPay = calculation.netPay;
        const grossDelta = round2(overtimePay - previousOvertimePay);
        const netDelta = round2(totalPay - previousTotalPay);
        const grossTotal = round2((run.gross_total ?? 0) + grossDelta);
        const netTotal = round2((run.net_total ?? 0) + netDelta);

        const { error: updateItemError } = await database
          .from("payroll_run_items")
          .update({
            overtime_hours: overtimeHours,
            overtime_pay: overtimePay,
            total_pay: totalPay,
          })
          .eq("id", item.id);

        if (updateItemError) {
          throw new Error("Failed to update payroll item overtime totals.");
        }

        const { error: updateRunError } = await database
          .from("payroll_runs")
          .update({
            gross_total: grossTotal,
            net_total: netTotal,
            approved_by: user.id,
            approved_at: new Date().toISOString(),
          })
          .eq("id", run.id);

        if (updateRunError) {
          throw new Error("Failed to update payroll run totals.");
        }

        const { error: linkItemError } = await database
          .from("payroll_adjustments")
          .update({
            payroll_run_item_id: item.id,
          })
          .eq("id", adjustment.id);

        if (linkItemError) {
          throw new Error("Failed to relink approved overtime request.");
        }

        const payoutDate =
          adjustment.effective_date ?? run.period_end ?? toIsoDate(new Date());

        const { data: existingDailyTotal, error: existingDailyTotalError } =
          await database
            .from("payroll_run_daily_totals")
            .select("id, total_pay, hours_worked")
            .eq("payroll_run_item_id", item.id)
            .eq("payout_date", payoutDate)
            .maybeSingle();

        if (existingDailyTotalError) {
          throw new Error("Failed to load payroll daily total.");
        }

        if (existingDailyTotal) {
          const { error: updateDailyTotalError } = await database
            .from("payroll_run_daily_totals")
            .update({
              total_pay: round2((existingDailyTotal.total_pay ?? 0) + netDelta),
              hours_worked: round2(
                (existingDailyTotal.hours_worked ?? 0) +
                  (adjustment.quantity ?? 0),
              ),
            })
            .eq("id", existingDailyTotal.id);

          if (updateDailyTotalError) {
            throw new Error("Failed to update payroll daily total.");
          }
        } else {
          const { error: insertDailyTotalError } = await database
            .from("payroll_run_daily_totals")
            .insert({
              payroll_run_id: runId,
              payroll_run_item_id: item.id,
              attendance_import_id: adjustment.attendance_import_id,
              employee_name: adjustment.employee_name,
              role_code: adjustment.role_code,
              site_name: adjustment.site_name,
              payout_date: payoutDate,
              hours_worked: round2(adjustment.quantity ?? 0),
              total_pay: netDelta,
            });

          if (insertDailyTotalError) {
            throw new Error("Failed to create payroll daily total.");
          }
        }
      }
    }
  }

  return { adjustmentId, runId, status: "approved" as const };
}

export async function getPendingOvertimeApprovalsAction() {
  await requireRole("ceo");
  const database = createSupabaseAdminClient() as any;

  return loadPendingOvertimeApprovals(database);
}

export async function getOvertimeRequestsApprovalDataAction() {
  await requireRole("ceo");
  const database = createSupabaseAdminClient() as any;

  const { data, error } = await database
    .from("overtime_requests")
    .select(
      "id, requester_role, requested_by, approved_by, employee_name, site_name, period_label, request_date, overtime_hours, amount, reason, status, approved_at, rejected_at, rejection_reason, created_at, updated_at",
    )
    .in("status", ["pending", "approved", "rejected"])
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load overtime request forms. ${error.message}`);
  }

  return {
    requests: (data ?? []) as OvertimeRequestRecord[],
  };
}

export async function getMyOvertimeRequestsAction() {
  const { user } = await requireRole([
    "payroll_manager",
    "engineer",
    "employee",
  ]);
  const database = createSupabaseAdminClient() as any;

  const { data, error } = await database
    .from("overtime_requests")
    .select(
      "id, requester_role, requested_by, approved_by, employee_name, site_name, period_label, request_date, overtime_hours, amount, reason, status, approved_at, rejected_at, rejection_reason, created_at, updated_at",
    )
    .eq("requested_by", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load your overtime requests. ${error.message}`);
  }

  return {
    requests: (data ?? []) as OvertimeRequestRecord[],
  };
}

export async function submitOvertimeRequestAction(
  input: SubmitOvertimeRequestInput,
) {
  const { user, profile } = await requireRole([
    "payroll_manager",
    "engineer",
    "employee",
  ]);
  const database = createSupabaseAdminClient() as any;

  const employeeName = (input.employeeName ?? "").trim();
  const siteName = (input.siteName ?? "").trim();
  const periodLabel = (input.periodLabel ?? "").trim() || null;
  const requestDate = (input.requestDate ?? "").trim();
  const overtimeHours = round2(Number(input.overtimeHours ?? 0));
  const amount = round2(Number(input.amount ?? 0));
  const reason = (input.reason ?? "").trim() || null;

  if (!employeeName) {
    throw new Error("Employee name is required.");
  }

  if (!siteName) {
    throw new Error("Site name is required.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestDate)) {
    throw new Error("Request date is required.");
  }

  if (!Number.isFinite(overtimeHours) || overtimeHours <= 0) {
    throw new Error("Overtime hours must be greater than zero.");
  }

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Amount cannot be negative.");
  }

  const { data, error } = await database
    .from("overtime_requests")
    .insert({
      requester_role: profile.role,
      requested_by: user.id,
      employee_name: employeeName,
      site_name: siteName,
      period_label: periodLabel,
      request_date: requestDate,
      overtime_hours: overtimeHours,
      amount,
      reason,
      status: "pending",
    })
    .select(
      "id, requester_role, requested_by, approved_by, employee_name, site_name, period_label, request_date, overtime_hours, amount, reason, status, approved_at, rejected_at, rejection_reason, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to submit overtime request. ${error?.message ?? ""}`,
    );
  }

  return {
    request: data as OvertimeRequestRecord,
  };
}

export async function approveOvertimeRequestFormAction(requestId: string) {
  const { user } = await requireRole("ceo");
  const database = createSupabaseAdminClient() as any;
  const id = requestId.trim();

  if (!id) {
    throw new Error("Overtime request ID is required.");
  }

  const { data: request, error: requestError } = await database
    .from("overtime_requests")
    .select("id")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();

  if (requestError) {
    throw new Error(
      `Failed to load overtime request form. ${requestError.message}`,
    );
  }

  if (!request) {
    throw new Error("This overtime request can no longer be updated.");
  }

  const approvedAt = new Date().toISOString();
  const { error } = await database
    .from("overtime_requests")
    .update({
      status: "approved",
      approved_by: user.id,
      approved_at: approvedAt,
      rejected_at: null,
      rejection_reason: null,
    })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    throw new Error(
      `Failed to approve overtime request form. ${error.message}`,
    );
  }

  return {
    requestId: id,
    approvedAt,
    status: "approved" as const,
  };
}

export async function rejectOvertimeRequestFormAction(
  input: RejectOvertimeRequestFormInput,
) {
  const { user } = await requireRole("ceo");
  const database = createSupabaseAdminClient() as any;
  const id = (input.requestId ?? "").trim();
  const rejectionReason = (input.rejectionReason ?? "").trim() || null;

  if (!id) {
    throw new Error("Overtime request ID is required.");
  }

  const rejectedAt = new Date().toISOString();
  const { error } = await database
    .from("overtime_requests")
    .update({
      status: "rejected",
      approved_by: user.id,
      rejected_at: rejectedAt,
      rejection_reason: rejectionReason,
    })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    throw new Error(`Failed to reject overtime request form. ${error.message}`);
  }

  return {
    requestId: id,
    rejectedAt,
    rejectionReason,
    status: "rejected" as const,
  };
}

export async function getPayrollManagerReportNotificationsAction() {
  const { user } = await requireRole(["payroll_manager", "ceo"]);
  const database = createSupabaseAdminClient() as any;

  const { data, error } = await database
    .from("payroll_runs")
    .select(
      "id, attendance_import_id, site_name, period_label, status, rejection_reason, rejected_at, updated_at",
    )
    .eq("submitted_by", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to load payroll report notifications. ${error.message}`,
    );
  }

  return {
    reports: (data ?? []) as PayrollManagerReportNotificationRow[],
  };
}

export async function getPayrollManagerOvertimeNotificationsAction() {
  const { user } = await requireRole(["payroll_manager", "ceo"]);
  const database = createSupabaseAdminClient() as any;

  const { data, error } = await database
    .from("payroll_adjustments")
    .select(
      "id, employee_name, site_name, period_label, status, notes, updated_at",
    )
    .eq("adjustment_type", "overtime")
    .eq("requested_by", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load overtime notifications. ${error.message}`);
  }

  return {
    requests: (data ?? []) as PayrollManagerOvertimeNotificationRow[],
  };
}

export async function rejectOvertimeAdjustmentAction(
  input: string | RejectOvertimeAdjustmentInput,
) {
  const { user } = await requireRole("ceo");
  const database = createSupabaseAdminClient() as any;
  const adjustmentId = typeof input === "string" ? input : input.adjustmentId;
  const rejectionReason =
    typeof input === "string" ? null : input.rejectionReason?.trim() || null;

  const { data: adjustment, error: adjustmentError } = await database
    .from("payroll_adjustments")
    .select("id, payroll_run_id, adjustment_type, status, notes")
    .eq("id", adjustmentId)
    .single();

  if (adjustmentError || !adjustment) {
    throw new Error("Failed to load overtime request.");
  }

  if (
    adjustment.adjustment_type !== "overtime" ||
    adjustment.status !== "pending"
  ) {
    throw new Error("This overtime request can no longer be updated.");
  }

  const { error } = await database
    .from("payroll_adjustments")
    .update({
      status: "rejected",
      approved_by: user.id,
      notes: attachOvertimeRejectionReason(adjustment.notes, rejectionReason),
    })
    .eq("id", adjustmentId)
    .eq("status", "pending");

  if (error) {
    throw new Error("Failed to reject overtime request.");
  }

  return {
    adjustmentId,
    runId: (adjustment.payroll_run_id as string | null) ?? null,
    status: "rejected" as const,
  };
}

export async function approvePayrollReportAction(payrollRunId: string) {
  const { user } = await requireRole("ceo");
  const database = createSupabaseAdminClient() as any;
  const runId = payrollRunId.trim();

  if (!runId) {
    throw new Error("Payroll report ID is required.");
  }

  const { data: payrollRun, error: payrollRunError } = await database
    .from("payroll_runs")
    .select("id, status, site_name, period_label")
    .eq("id", runId)
    .single();

  if (payrollRunError || !payrollRun) {
    throw new Error("Payroll report not found.");
  }

  if (payrollRun.status !== "submitted") {
    throw new Error("Only pending payroll reports can be approved.");
  }

  const approvedAt = new Date().toISOString();
  const { error: approveError } = await database
    .from("payroll_runs")
    .update({
      status: "approved" satisfies PayrollRunStatus,
      approved_by: user.id,
      approved_at: approvedAt,
      rejected_at: null,
      rejection_reason: null,
    })
    .eq("id", runId)
    .eq("status", "submitted");

  if (approveError) {
    throw new Error("Failed to approve payroll report.");
  }

  await database.from("audit_logs").insert({
    actor_id: user.id,
    action: "payroll_report_approved",
    entity_type: "payroll_run",
    entity_id: runId,
    payload: {
      status: "approved",
      site_name: payrollRun.site_name,
      period_label: payrollRun.period_label,
      approved_at: approvedAt,
    },
  });

  return {
    payrollRunId: runId,
    status: "approved" as const,
    approvedAt,
  };
}

export async function getPayrollReportsDataAction() {
  await requireRole("ceo");
  const database = createSupabaseAdminClient() as any;

  return loadPayrollReportsData(database);
}

export async function getPayrollReportDetailsAction(payrollRunId: string) {
  await requireRole("ceo");
  const database = createSupabaseAdminClient() as any;

  return loadPayrollReportDetails(database, payrollRunId);
}

export async function rejectPayrollReportAction(
  input: string | RejectPayrollReportInput,
) {
  const { user } = await requireRole("ceo");
  const database = createSupabaseAdminClient() as any;
  const runId =
    typeof input === "string" ? input.trim() : input.payrollRunId.trim();
  const rejectionReason =
    typeof input === "string" ? null : input.rejectionReason?.trim() || null;

  if (!runId) {
    throw new Error("Payroll report ID is required.");
  }

  const { data: payrollRun, error: payrollRunError } = await database
    .from("payroll_runs")
    .select("id, status, site_name, period_label")
    .eq("id", runId)
    .single();

  if (payrollRunError || !payrollRun) {
    throw new Error("Payroll report not found.");
  }

  if (payrollRun.status !== "submitted") {
    throw new Error("Only pending payroll reports can be rejected.");
  }

  const rejectedAt = new Date().toISOString();
  const { error: rejectError } = await database
    .from("payroll_runs")
    .update({
      status: "rejected" satisfies PayrollRunStatus,
      approved_by: null,
      approved_at: null,
      rejected_at: rejectedAt,
      rejection_reason: rejectionReason,
    })
    .eq("id", runId)
    .eq("status", "submitted");

  if (rejectError) {
    throw new Error("Failed to reject payroll report.");
  }

  await database.from("audit_logs").insert({
    actor_id: user.id,
    action: "payroll_report_rejected",
    entity_type: "payroll_run",
    entity_id: runId,
    payload: {
      status: "rejected",
      site_name: payrollRun.site_name,
      period_label: payrollRun.period_label,
      rejected_at: rejectedAt,
      rejection_reason: rejectionReason,
    },
  });

  return {
    payrollRunId: runId,
    status: "rejected" as const,
    rejectedAt,
  };
}

export async function deletePayrollReportAction(payrollRunId: string) {
  const { user } = await requireRole("ceo");
  const database = createSupabaseAdminClient() as any;
  const runId = payrollRunId.trim();

  if (!runId) {
    throw new Error("Payroll report ID is required.");
  }

  const { data: payrollRun, error: payrollRunError } = await database
    .from("payroll_runs")
    .select("id, status, site_name, period_label")
    .eq("id", runId)
    .single();

  if (payrollRunError || !payrollRun) {
    throw new Error("Payroll report not found.");
  }

  const { error: deleteError } = await database
    .from("payroll_runs")
    .delete()
    .eq("id", runId);

  if (deleteError) {
    throw new Error("Failed to delete payroll report.");
  }

  await database.from("audit_logs").insert({
    actor_id: user.id,
    action: "payroll_report_deleted",
    entity_type: "payroll_run",
    entity_id: runId,
    payload: {
      status: payrollRun.status,
      site_name: payrollRun.site_name,
      period_label: payrollRun.period_label,
    },
  });

  return {
    payrollRunId: runId,
  };
}

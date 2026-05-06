import { buildDailyRows } from "@/features/attendance/utils/attendanceSelectors";
import {
  expandIsoRange,
  extractIsoPayrollRange,
} from "@/features/payroll/utils/payrollDateHelpers";
import { parseOvertimeRequestNotes } from "@/features/payroll/utils/overtimeRequestNotes";
import type { AttendanceRecord, DailyLogRow } from "@/types";

export interface PendingOvertimeRequest {
  id: string;
  status: "pending" | "approved" | "rejected";
  payroll_run_id: string | null;
  attendance_import_id: string | null;
  employee_name: string | null;
  role_code: string | null;
  site_name: string | null;
  period_label: string | null;
  quantity: number;
  amount: number;
  notes: string | null;
  created_at: string;
  effective_date: string | null;
  period_start: string | null;
  period_end: string | null;
  payroll_runs:
    | {
        site_name: string;
        period_label: string;
      }
    | {
        site_name: string;
        period_label: string;
      }[]
    | null;
  payroll_run_items:
    | {
        employee_name: string;
        site_name: string;
      }
    | {
        employee_name: string;
        site_name: string;
      }[]
    | null;
}

export interface AttendanceLogRow {
  id: string;
  log_date: string;
  log_time: string;
  log_type: "IN" | "OUT";
  log_source: "Time1" | "Time2" | "OT";
  site_name: string;
}

export interface EmployeeLogsModalState {
  requestId: string;
  employeeLabel: string;
  siteLabel: string;
  periodLabel: string;
  requestDailyLogs: DailyLogRow[];
  loading: boolean;
  error: string | null;
}

export function formatMoney(value: number): string {
  return value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getRelationValue<T extends object>(relation: T | T[] | null): T | null {
  if (!relation) return null;
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
}

export function formatRequestedAt(value: string): string {
  return new Date(value).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function resolveRequestPeriod(request: PendingOvertimeRequest): {
  start: string | null;
  end: string | null;
} {
  const parsedPeriod = extractIsoPayrollRange(request.period_label ?? "");
  const start = request.period_start ?? parsedPeriod?.start ?? null;
  const end = request.period_end ?? parsedPeriod?.end ?? start;

  return { start, end };
}

export function buildRequestDailyLogRows(
  request: PendingOvertimeRequest,
  logs: AttendanceLogRow[],
): DailyLogRow[] {
  const parsedNotes = parseOvertimeRequestNotes(request.notes);
  if (parsedNotes.editedLogs.length > 0) {
    return [...parsedNotes.editedLogs].sort((a, b) => a.date.localeCompare(b.date));
  }

  const employeeName = request.employee_name?.trim() || "Unknown Employee";
  const attendanceRecords: AttendanceRecord[] = logs.map((log) => ({
    date: log.log_date,
    employee: employeeName,
    logTime: log.log_time,
    type: log.log_type,
    source: log.log_source,
    site: log.site_name,
  }));
  const groupedRows = buildDailyRows(attendanceRecords).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const { start, end } = resolveRequestPeriod(request);
  const periodDates = start && end ? expandIsoRange(start, end) : [];

  if (periodDates.length === 0) {
    return groupedRows;
  }

  const rowsByDate = new Map(groupedRows.map((row) => [row.date, row]));

  return periodDates.map(
    (date) =>
      rowsByDate.get(date) ?? {
        date,
        employee: employeeName,
        time1In: "",
        time1Out: "",
        time2In: "",
        time2Out: "",
        otIn: "",
        otOut: "",
        regularHours: 0,
        overtimeHours: 0,
        totalHours: 0,
        hours: 0,
        site: "",
      },
  );
}

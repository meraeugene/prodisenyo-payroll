import type { AttendanceRecordInput, PayrollRow } from "@/lib/payrollEngine";
import { generatePayroll, recalculatePayrollRow } from "@/lib/payrollEngine";
import {
  DEFAULT_OVERTIME_MULTIPLIER,
  HOURS_PER_DAY,
  type RoleCode,
} from "@/lib/payrollConfig";
import { compareStep2Rows, earliestNonEmptyTime, pairMinutes } from "@/lib/utils";
import type { DailyLogRow, Step2Sort } from "@/types";
import {
  parseNonNegativeOrFallback,
  toShortDateLabel,
} from "@/features/payroll/utils/payrollFormatters";
import { expandDateSummary, normalizePeriodLabel } from "@/features/payroll/utils/payrollDateHelpers";
import { parsePayrollIdentity, parseTimeToDecimal } from "@/features/payroll/utils/payrollMappers";
import type {
  PayrollAttendanceBreakdownItem,
  PayrollClockInConsistencyItem,
  PayrollEditDraft,
  PayrollEditSummary,
  PayrollEmployeeDailyHoursTrend,
  PayrollRowOverride,
} from "@/features/payroll/types";

export interface PayrollFilters {
  siteFilter: string;
  roleFilter: RoleCode | "ALL";
  nameFilter: string;
  dateFilter: string;
  sort: Step2Sort;
}

export function mapDailyRowsToAttendanceInputs(
  dailyRows: DailyLogRow[],
): AttendanceRecordInput[] {
  return dailyRows
    .map((row) => {
      const identity = parsePayrollIdentity(row.employee);

      return {
        name: identity.name,
        role: identity.role,
        site: row.site,
        date: row.date,
        hours: row.hours,
      };
    })
    .filter(
      (record) =>
        record.name.length > 0 &&
        Number.isFinite(record.hours) &&
        record.hours >= 0,
    );
}

export function buildPayrollBaseRows(
  payrollAttendanceInputs: AttendanceRecordInput[],
  roleRates: Record<RoleCode, number>,
  attendancePeriod: string,
): PayrollRow[] {
  const generated = generatePayroll(payrollAttendanceInputs, {
    roleRates,
    hoursPerDay: HOURS_PER_DAY,
    overtimeMultiplier: DEFAULT_OVERTIME_MULTIPLIER,
  });

  const normalizedPeriod = normalizePeriodLabel(attendancePeriod);
  if (!normalizedPeriod) return generated;

  return generated.map((row) => ({ ...row, date: normalizedPeriod }));
}

export function buildPayrollRows(
  payrollBaseRows: PayrollRow[],
  payrollOverrides: Record<string, PayrollRowOverride>,
  attendancePeriod: string,
): PayrollRow[] {
  const normalizedPeriod = normalizePeriodLabel(attendancePeriod);

  return payrollBaseRows.map((row) => {
    const override = payrollOverrides[row.id];

    if (!override) {
      return normalizedPeriod ? { ...row, date: normalizedPeriod } : row;
    }

    return recalculatePayrollRow(
      {
        ...row,
        date: normalizedPeriod ?? override.date,
        hoursWorked: override.hoursWorked,
        overtimeHours: override.overtimeHours,
        customRate: override.customRate,
      },
      DEFAULT_OVERTIME_MULTIPLIER,
    );
  });
}

export function filterPayrollRows(
  rows: PayrollRow[],
  filters: PayrollFilters,
): PayrollRow[] {
  const nameFilter = filters.nameFilter.trim().toLowerCase();
  const dateFilter = filters.dateFilter.trim();

  const filtered = rows.filter((row) => {
    if (
      filters.siteFilter !== "ALL" &&
      !row.site
        .split(",")
        .map((siteName) => siteName.trim())
        .includes(filters.siteFilter)
    ) {
      return false;
    }

    if (filters.roleFilter !== "ALL" && row.role !== filters.roleFilter) {
      return false;
    }

    if (dateFilter && !row.date.includes(dateFilter)) return false;

    if (nameFilter && !row.worker.toLowerCase().includes(nameFilter)) {
      return false;
    }

    return true;
  });

  filtered.sort((a, b) => {
    const dateA = a.date.split(" to ")[0] ?? a.date;
    const dateB = b.date.split(" to ")[0] ?? b.date;
    return compareStep2Rows(dateA, a.worker, dateB, b.worker, filters.sort);
  });

  return filtered;
}

export function filterPayrollLogs(
  logs: AttendanceRecordInput[],
  filters: PayrollFilters,
): AttendanceRecordInput[] {
  const nameFilter = filters.nameFilter.trim().toLowerCase();
  const dateFilter = filters.dateFilter.trim();

  const filtered = logs.filter((record) => {
    if (filters.siteFilter !== "ALL" && record.site !== filters.siteFilter) {
      return false;
    }

    if (filters.roleFilter !== "ALL" && record.role !== filters.roleFilter) {
      return false;
    }

    if (dateFilter && record.date !== dateFilter) return false;

    if (nameFilter && !record.name.toLowerCase().includes(nameFilter)) {
      return false;
    }

    return true;
  });

  filtered.sort((a, b) => compareStep2Rows(a.date, a.name, b.date, b.name, filters.sort));

  return filtered;
}

export function summarizePayrollTotals(rows: PayrollRow[]): {
  hours: number;
  pay: number;
} {
  return rows.reduce(
    (acc, row) => {
      acc.hours += row.hoursWorked;
      acc.pay += row.totalPay;
      return acc;
    },
    { hours: 0, pay: 0 },
  );
}

export function buildEditingPayrollLogs(
  dailyRows: DailyLogRow[],
  editingPayrollRow: PayrollRow | null,
  attendancePeriod: string,
): DailyLogRow[] {
  if (!editingPayrollRow) return [];

  const matched = dailyRows.filter((row) => {
    const identity = parsePayrollIdentity(row.employee);
    return (
      identity.role === editingPayrollRow.role &&
      identity.name === editingPayrollRow.worker
    );
  });

  matched.sort((a, b) => a.date.localeCompare(b.date));

  const dateRange = expandDateSummary(
    editingPayrollRow.date,
    matched.map((row) => row.date),
    attendancePeriod,
  );

  const allDates = Array.from(
    new Set([...dateRange, ...matched.map((row) => row.date)]),
  ).sort((a, b) => a.localeCompare(b));

  if (allDates.length === 0) return matched;

  const byDate = new Map<string, DailyLogRow>();
  for (const row of matched) {
    if (!byDate.has(row.date)) byDate.set(row.date, row);
  }

  const employeeLabel = matched[0]?.employee ?? editingPayrollRow.worker;
  const siteLabel = matched[0]?.site ?? "";

  return allDates.map(
    (date) =>
      byDate.get(date) ?? {
        date,
        employee: employeeLabel,
        time1In: "",
        time1Out: "",
        time2In: "",
        time2Out: "",
        otIn: "",
        otOut: "",
        hours: 0,
        site: siteLabel,
      },
  );
}

export function buildEditingPayrollSummary(
  editingPayrollLogs: DailyLogRow[],
  editingPayrollRow: PayrollRow | null,
): PayrollEditSummary {
  if (!editingPayrollRow) {
    return {
      attendanceDays: 0,
      absenceDays: 0,
      regularHours: 0,
      otNormalHours: 0,
    };
  }

  const attendanceDays = editingPayrollLogs.filter((log) => log.hours > 0).length;
  const absenceDays = Math.max(editingPayrollLogs.length - attendanceDays, 0);
  const regularHours = attendanceDays * HOURS_PER_DAY;
  const otNormalHours = editingPayrollLogs.reduce((sum, log) => {
    if (!log.otIn || !log.otOut) return sum;
    return sum + pairMinutes(log.otIn, log.otOut) / 60;
  }, 0);

  return {
    attendanceDays,
    absenceDays,
    regularHours,
    otNormalHours,
  };
}

export function applyLogHourOverrides(
  editingPayrollLogs: DailyLogRow[],
  logHourOverrides: Record<string, number>,
  getLogKey: (log: DailyLogRow) => string,
): DailyLogRow[] {
  return editingPayrollLogs.map((log) => {
    const key = getLogKey(log);
    return {
      ...log,
      hours: logHourOverrides[key] ?? log.hours,
    };
  });
}

export function hasAnyLogHourOverrides(
  logHourOverrides: Record<string, number>,
): boolean {
  return Object.values(logHourOverrides).some(
    (value) => Number.isFinite(value) && value >= 0,
  );
}

export function calculateTotalEditedLogHours(logs: DailyLogRow[]): number {
  const hours = logs.reduce((sum, log) => sum + log.hours, 0);
  return Math.round(hours * 100) / 100;
}

export function buildEmployeeDailyHoursTrend(
  logs: DailyLogRow[],
): PayrollEmployeeDailyHoursTrend[] {
  return logs.map((log) => ({
    date: toShortDateLabel(log.date),
    isoDate: log.date,
    hoursWorked: Math.round(log.hours * 100) / 100,
  }));
}

export function buildEmployeeAttendanceBreakdown(
  logs: DailyLogRow[],
): PayrollAttendanceBreakdownItem[] {
  const attendanceDays = logs.filter((log) => log.hours > 0).length;
  const absences = Math.max(logs.length - attendanceDays, 0);
  const leaveDays = 0;
  const businessTripDays = 0;

  return [
    { name: "Attendance", value: attendanceDays },
    { name: "Absences", value: absences },
    { name: "Leave", value: leaveDays },
    { name: "Business Trip", value: businessTripDays },
  ];
}

export function buildEmployeeClockInConsistency(
  logs: DailyLogRow[],
): PayrollClockInConsistencyItem[] {
  return logs.map((log) => {
    const firstIn = earliestNonEmptyTime(log.time1In, log.time2In);
    const parsed = firstIn ? parseTimeToDecimal(firstIn) : null;

    return {
      date: toShortDateLabel(log.date),
      isoDate: log.date,
      timeIn: parsed ?? 0,
      timeInLabel: firstIn || "Missed",
    };
  });
}

export function buildPayrollEditPreview(
  editingPayrollRow: PayrollRow | null,
  payrollEditDraft: PayrollEditDraft | null,
  hasLogHourOverrides: boolean,
  totalEditedLogHours: number,
): PayrollRow | null {
  if (!editingPayrollRow || !payrollEditDraft) return null;

  const nextHours = hasLogHourOverrides
    ? totalEditedLogHours
    : parseNonNegativeOrFallback(
        payrollEditDraft.hoursWorked,
        editingPayrollRow.hoursWorked,
      );

  const nextOvertime = parseNonNegativeOrFallback(
    payrollEditDraft.overtimeHours,
    editingPayrollRow.overtimeHours,
  );

  const nextCustomRate =
    payrollEditDraft.rate.trim() === ""
      ? null
      : parseNonNegativeOrFallback(
          payrollEditDraft.rate,
          editingPayrollRow.customRate ?? editingPayrollRow.defaultRate,
        );

  return recalculatePayrollRow(
    {
      ...editingPayrollRow,
      date: payrollEditDraft.date.trim(),
      hoursWorked: nextHours,
      overtimeHours: nextOvertime,
      customRate: nextCustomRate,
    },
    DEFAULT_OVERTIME_MULTIPLIER,
  );
}


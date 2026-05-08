import type { AttendanceRecordInput, PayrollRow } from "@/lib/payrollEngine";
import {
  calculatePayroll,
  generatePayroll,
  recalculatePayrollRow,
  roundPayrollCalculation,
} from "@/lib/payrollEngine";
import {
  DEFAULT_OVERTIME_MULTIPLIER,
  HOURS_PER_DAY,
  normalizeRoleCode,
  type RoleCode,
} from "@/lib/payrollConfig";
import {
  calculateDailyWorkMinutes,
  compareStep2Rows,
  matchesSearchText,
} from "@/lib/utils";
import type { DailyLogRow, Step2Sort } from "@/types";
import { normalizePeriodLabel } from "@/features/payroll/utils/payrollDateHelpers";
import {
  areLikelySameEmployeeName,
  normalizeEmployeeNameKey,
  parsePayrollIdentity,
  parseTimeToDecimal,
  pickPreferredEmployeeDisplayName,
  pickPreferredRoleCode,
} from "@/features/payroll/utils/payrollMappers";
import type {
  LogHourOverrideValue,
  PayrollEditSummary,
  PayrollRowOverride,
} from "@/features/payroll/types";

export interface PayrollFilters {
  siteFilter: string;
  roleFilter: RoleCode | "ALL";
  nameFilter: string;
  dateFilter: string;
  sort: Step2Sort;
}

export const FULL_WORKDAY_HOURS = 8;
export const FIXED_PAY_RATE_PER_DAY = 500;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function getFirstInSortValue(log: DailyLogRow): number {
  const timeCandidates = [log.time1In, log.time2In, log.otIn]
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => parseTimeToDecimal(value))
    .filter((value): value is number => value !== null);

  if (timeCandidates.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.min(...timeCandidates);
}

export interface IsoDateSpan {
  start: string;
  end: string;
}

export interface CombinedBranchPayInput {
  site: string;
  hoursWorked: number;
  dailyRatePerDay: number;
}

export interface CombinedBranchPayBreakdown extends CombinedBranchPayInput {
  payableHours: number;
  payableDays: number;
  basePay: number;
}

export interface CombinedBranchPayResult {
  totalWorkedHours: number;
  totalPayableHours: number;
  totalPayableDays: number;
  ignoredHours: number;
  totalBasePay: number;
  breakdown: CombinedBranchPayBreakdown[];
}

export function computeDaysWorked(totalHours: number): number {
  if (!Number.isFinite(totalHours) || totalHours <= 0) return 0;
  return round2(totalHours / FULL_WORKDAY_HOURS);
}

export function computeBasePay(
  totalHours: number,
  dailyRatePerDay = FIXED_PAY_RATE_PER_DAY,
): number {
  return roundPayrollCalculation(
    calculatePayroll({
      dailyRate: dailyRatePerDay,
      regularHours: totalHours,
      overtimeHours: 0,
      allowance: 0,
      deductions: 0,
    }),
  ).regularPay;
}

export function allocateCombinedBranchPay(
  entries: CombinedBranchPayInput[],
): CombinedBranchPayResult {
  const breakdown = entries
    .map((entry) => ({
      site: entry.site,
      hoursWorked:
        Number.isFinite(entry.hoursWorked) && entry.hoursWorked > 0
          ? round2(entry.hoursWorked)
          : 0,
      dailyRatePerDay:
        Number.isFinite(entry.dailyRatePerDay) && entry.dailyRatePerDay > 0
          ? round2(entry.dailyRatePerDay)
          : 0,
      payableHours: 0,
      payableDays: 0,
      basePay: 0,
    }))
    .filter((entry) => entry.site.trim().length > 0 || entry.hoursWorked > 0);

  const totalWorkedHours = round2(
    breakdown.reduce((sum, entry) => sum + entry.hoursWorked, 0),
  );

  for (const entry of breakdown) {
    entry.payableHours = round2(entry.hoursWorked);
  }

  for (const entry of breakdown) {
    entry.payableDays = round2(entry.payableHours / FULL_WORKDAY_HOURS);
    entry.basePay = computeBasePay(entry.payableHours, entry.dailyRatePerDay);
  }

  const totalBasePay = round2(
    breakdown.reduce((sum, entry) => sum + entry.basePay, 0),
  );
  const totalPayableHours = round2(
    breakdown.reduce((sum, entry) => sum + entry.payableHours, 0),
  );

  return {
    totalWorkedHours,
    totalPayableHours,
    totalPayableDays: round2(totalPayableHours / FULL_WORKDAY_HOURS),
    ignoredHours: round2(totalWorkedHours - totalPayableHours),
    totalBasePay,
    breakdown,
  };
}

export function buildDateHoursMap(
  logs: Array<{ date: string; hours: number }>,
): Map<string, number> {
  const byDate = new Map<string, number>();

  for (const log of logs) {
    if (!log.date) continue;
    const current = byDate.get(log.date) ?? 0;
    const nextHours =
      Number.isFinite(log.hours) && log.hours >= 0 ? Number(log.hours) : 0;
    byDate.set(log.date, round2(current + nextHours));
  }

  return byDate;
}

export function buildDateSpanFromDates(
  dates: Iterable<string>,
): IsoDateSpan | null {
  let start: string | null = null;
  let end: string | null = null;

  for (const date of dates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (!start || date < start) start = date;
    if (!end || date > end) end = date;
  }

  if (!start || !end) return null;
  return { start, end };
}

export function buildWorkerDateSpanByKey(
  logs: AttendanceRecordInput[],
): Map<string, IsoDateSpan> {
  const spanByKey = new Map<string, IsoDateSpan>();

  for (const log of logs) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(log.date)) continue;
    const key = `${log.role}|||${log.name}|||${log.site}`;
    const existing = spanByKey.get(key);

    if (!existing) {
      spanByKey.set(key, { start: log.date, end: log.date });
      continue;
    }

    if (log.date < existing.start) existing.start = log.date;
    if (log.date > existing.end) existing.end = log.date;
  }

  return spanByKey;
}

export function countHolidayBonusDays(
  dateHours: Map<string, number>,
  holidayDates: Iterable<string>,
  eligibleSpan?: IsoDateSpan | null,
): number {
  const uniqueHolidayDates = new Set(holidayDates);
  let count = 0;

  for (const holidayDate of uniqueHolidayDates) {
    if (
      eligibleSpan &&
      (holidayDate < eligibleSpan.start || holidayDate > eligibleSpan.end)
    ) {
      continue;
    }

    const loggedHours = dateHours.get(holidayDate) ?? 0;
    if (loggedHours < FULL_WORKDAY_HOURS) {
      count += 1;
    }
  }

  return count;
}

export function mapDailyRowsToAttendanceInputs(
  dailyRows: DailyLogRow[],
): AttendanceRecordInput[] {
  return dailyRows
    .map((row) => {
      const identity = parsePayrollIdentity(row.employee);
      const dailyMinutes = calculateDailyWorkMinutes(row);
      const regularHours = round2(dailyMinutes.regularMinutes / 60);
      const overtimeHours = round2(dailyMinutes.overtimeMinutes / 60);
      const totalHours = round2(dailyMinutes.totalMinutes / 60);

      return {
        name: identity.name,
        role: identity.role,
        site: row.site,
        date: row.date,
        hours: regularHours,
        overtimeHours,
        totalHours,
      };
    })
    .filter(
      (record) =>
        record.name.length > 0 &&
        Number.isFinite(record.hours) &&
        record.hours >= 0,
    );
}

interface EmployeeIdentityGroup {
  role: string;
  displayName: string;
  aliases: Set<string>;
}

function hasKnownRole(role: string): boolean {
  const normalized = normalizeRoleCode(role);
  return Boolean(normalized && normalized !== "UNKNOWN");
}

export function coalescePayrollAttendanceInputs(
  inputs: AttendanceRecordInput[],
): AttendanceRecordInput[] {
  const aliasToGroup = new Map<string, EmployeeIdentityGroup>();
  const groups: EmployeeIdentityGroup[] = [];

  for (const record of inputs) {
    const name = record.name.trim();
    if (!name) continue;

    const alias = normalizeEmployeeNameKey(name);
    let group = aliasToGroup.get(alias);

    if (!group) {
      group = groups.find((candidate) => {
        if (!areLikelySameEmployeeName(candidate.displayName, name)) {
          return false;
        }

        return hasKnownRole(candidate.role) !== hasKnownRole(record.role);
      });
    }

    if (!group) {
      group = {
        role: normalizeRoleCode(record.role) ?? "UNKNOWN",
        displayName: name,
        aliases: new Set([alias]),
      };
      groups.push(group);
    } else {
      group.role = pickPreferredRoleCode(group.role, record.role);
      group.displayName = pickPreferredEmployeeDisplayName(
        group.displayName,
        name,
      );
      group.aliases.add(alias);
    }

    aliasToGroup.set(alias, group);
  }

  return inputs.map((record) => {
    const alias = normalizeEmployeeNameKey(record.name);
    const group =
      aliasToGroup.get(alias) ??
      groups.find((candidate) =>
        areLikelySameEmployeeName(candidate.displayName, record.name),
      );

    if (!group) {
      return {
        ...record,
        role: normalizeRoleCode(record.role) ?? "UNKNOWN",
      };
    }

    group.aliases.forEach((entryAlias) => aliasToGroup.set(entryAlias, group));

    return {
      ...record,
      name: group.displayName,
      role: group.role,
    };
  });
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

    if (nameFilter && !matchesSearchText(row.worker, nameFilter)) {
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

    if (nameFilter && !matchesSearchText(record.name, nameFilter)) {
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
  _attendancePeriod: string,
): DailyLogRow[] {
  if (!editingPayrollRow) return [];

  const matched = dailyRows.filter((row) => {
    const identity = parsePayrollIdentity(row.employee);
    return areLikelySameEmployeeName(identity.name, editingPayrollRow.worker);
  });

  matched.sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    const byFirstIn = getFirstInSortValue(a) - getFirstInSortValue(b);
    if (Math.abs(byFirstIn) > 0.0001) return byFirstIn;
    const bySite = a.site.localeCompare(b.site);
    if (bySite !== 0) return bySite;
    return a.employee.localeCompare(b.employee);
  });

  return matched;
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

  const attendanceDays = editingPayrollLogs.filter((log) => log.totalHours > 0).length;
  const absenceDays = Math.max(editingPayrollLogs.length - attendanceDays, 0);
  const regularHours = editingPayrollLogs.reduce(
    (sum, log) => sum + log.regularHours,
    0,
  );
  const otNormalHours = editingPayrollLogs.reduce(
    (sum, log) => sum + log.overtimeHours,
    0,
  );

  return {
    attendanceDays,
    absenceDays,
    regularHours,
    otNormalHours,
  };
}

export function applyLogHourOverrides(
  editingPayrollLogs: DailyLogRow[],
  logHourOverrides: Record<string, LogHourOverrideValue>,
  getLogKey: (log: DailyLogRow) => string,
): DailyLogRow[] {
  return editingPayrollLogs.map((log) => {
    const key = getLogKey(log);
    const override = logHourOverrides[key];
    const regularHours =
      typeof override === "number"
        ? override
        : typeof override?.regularHours === "number"
          ? override.regularHours
          : log.regularHours;
    const overtimeHours =
      typeof override === "number"
        ? log.overtimeHours
        : typeof override?.overtimeHours === "number"
          ? override.overtimeHours
          : log.overtimeHours;
    const normalizedRegularHours =
      Number.isFinite(regularHours) && regularHours >= 0
        ? round2(regularHours)
        : 0;
    const normalizedOvertimeHours =
      Number.isFinite(overtimeHours) && overtimeHours >= 0
        ? round2(overtimeHours)
        : 0;

    return {
      ...log,
      hours: normalizedRegularHours,
      regularHours: normalizedRegularHours,
      overtimeHours: normalizedOvertimeHours,
      totalHours: round2(normalizedRegularHours + normalizedOvertimeHours),
    };
  });
}

export function hasAnyLogHourOverrides(
  logHourOverrides: Record<string, LogHourOverrideValue>,
): boolean {
  return Object.values(logHourOverrides).some((value) => {
    if (typeof value === "number") return Number.isFinite(value) && value >= 0;
    return (
      (Number.isFinite(value.regularHours) && Number(value.regularHours) >= 0) ||
      (Number.isFinite(value.overtimeHours) && Number(value.overtimeHours) >= 0)
    );
  });
}


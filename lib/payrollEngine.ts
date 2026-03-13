import {
  DEFAULT_DAILY_RATE_BY_ROLE,
  DEFAULT_OVERTIME_MULTIPLIER,
  HOURS_PER_DAY,
  getDailyRateForRole,
  normalizeRoleCode,
  type RoleCode,
} from "@/lib/payrollConfig";

export interface AttendanceRecordInput {
  name: string;
  role: string;
  site: string;
  date: string;
  hours: number;
}

export interface PayrollRow {
  id: string;
  worker: string;
  role: string;
  site: string;
  date: string;
  hoursWorked: number;
  overtimeHours: number;
  defaultRate: number;
  customRate: number | null;
  rate: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
}

export interface GeneratePayrollOptions {
  roleRates?: Partial<Record<RoleCode, number>>;
  hoursPerDay?: number;
  overtimeMultiplier?: number;
}

interface WorkerGroup {
  worker: string;
  role: string;
  totalHours: number;
  sites: Set<string>;
  dates: Set<string>;
}

interface ParsedWorkerName {
  roleFromName: string | null;
  cleanName: string;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseWorkerName(rawName: string): ParsedWorkerName {
  const normalized = normalizeWhitespace(rawName);
  if (!normalized) return { roleFromName: null, cleanName: "" };

  const [firstToken, ...rest] = normalized.split(" ");
  const roleCode = normalizeRoleCode(firstToken);

  if (roleCode && rest.length > 0) {
    return {
      roleFromName: roleCode,
      cleanName: normalizeWhitespace(rest.join(" ")),
    };
  }

  return {
    roleFromName: null,
    cleanName: normalized,
  };
}

function normalizeRole(recordRole: string, roleFromName: string | null): string {
  const fromRoleField = normalizeRoleCode(recordRole);
  if (fromRoleField) return fromRoleField;
  if (roleFromName) return roleFromName;

  const fallback = normalizeWhitespace(recordRole).toUpperCase();
  return fallback || "UNKNOWN";
}

function summarizeSites(sites: Set<string>): string {
  const values = Array.from(sites);
  if (values.length === 0) return "Unknown Site";
  if (values.length === 1) return values[0];
  return values.sort((a, b) => a.localeCompare(b)).join(", ");
}

function summarizeDates(dates: Set<string>): string {
  const values = Array.from(dates).filter(Boolean);
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  values.sort((a, b) => a.localeCompare(b));
  return `${values[0]} to ${values[values.length - 1]}`;
}

function roundTo(value: number, decimals = 2): number {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

export function recalculatePayrollRow(
  row: PayrollRow,
  overtimeMultiplier = DEFAULT_OVERTIME_MULTIPLIER,
): PayrollRow {
  const rate = row.customRate ?? row.defaultRate;
  const regularPay = row.hoursWorked * rate;
  const overtimePay = row.overtimeHours * rate * overtimeMultiplier;
  const totalPay = regularPay + overtimePay;

  return {
    ...row,
    rate: roundTo(rate),
    regularPay: roundTo(regularPay),
    overtimePay: roundTo(overtimePay),
    totalPay: roundTo(totalPay),
  };
}

export function generatePayroll(
  records: AttendanceRecordInput[],
  options: GeneratePayrollOptions = {},
): PayrollRow[] {
  const roleRates = {
    ...DEFAULT_DAILY_RATE_BY_ROLE,
    ...(options.roleRates ?? {}),
  };
  const hoursPerDay =
    Number.isFinite(options.hoursPerDay) && Number(options.hoursPerDay) > 0
      ? Number(options.hoursPerDay)
      : HOURS_PER_DAY;
  const overtimeMultiplier = options.overtimeMultiplier ?? DEFAULT_OVERTIME_MULTIPLIER;
  const grouped = new Map<string, WorkerGroup>();

  for (const record of records) {
    const parsedName = parseWorkerName(record.name);
    const workerName = parsedName.cleanName;
    if (!workerName) continue;

    const role = normalizeRole(record.role, parsedName.roleFromName);
    const key = `${role}|||${workerName}`;
    const numericHours = Number(record.hours);
    if (!Number.isFinite(numericHours) || numericHours < 0) continue;

    const site = normalizeWhitespace(record.site) || "Unknown Site";
    const date = normalizeWhitespace(record.date);

    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        worker: workerName,
        role,
        totalHours: numericHours,
        sites: new Set([site]),
        dates: new Set(date ? [date] : []),
      });
      continue;
    }

    existing.totalHours += numericHours;
    existing.sites.add(site);
    if (date) existing.dates.add(date);
  }

  const rows = Array.from(grouped.values()).map((group) => {
    const dailyRate = getDailyRateForRole(group.role, roleRates);
    const defaultRate = roundTo(dailyRate / hoursPerDay);

    const baseRow: PayrollRow = {
      id: `${group.role}|||${group.worker}`,
      worker: group.worker,
      role: group.role,
      site: summarizeSites(group.sites),
      date: summarizeDates(group.dates),
      hoursWorked: roundTo(group.totalHours),
      overtimeHours: 0,
      defaultRate,
      customRate: null,
      rate: defaultRate,
      regularPay: 0,
      overtimePay: 0,
      totalPay: 0,
    };

    return recalculatePayrollRow(baseRow, overtimeMultiplier);
  });

  rows.sort((a, b) => {
    const byWorker = a.worker.localeCompare(b.worker);
    if (byWorker !== 0) return byWorker;
    return a.role.localeCompare(b.role);
  });

  return rows;
}

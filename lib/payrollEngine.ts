import {
  DEFAULT_DAILY_RATE_BY_ROLE,
  DEFAULT_OVERTIME_MULTIPLIER,
  HOURS_PER_DAY,
  getDailyRateForRole,
  normalizeRoleCode,
  type RoleCode,
} from "@/lib/payrollConfig";
import {
  calculatePaidRegularHours,
  calculateRegularPay,
} from "@/lib/payrollHours";

export type PayrollDeductionsInput =
  | number
  | Array<number | null | undefined>
  | Record<string, number | null | undefined>
  | null
  | undefined;

export interface CalculatePayrollInput {
  dailyRate: number | null | undefined;
  regularHours: number | null | undefined;
  overtimeHours: number | null | undefined;
  overtimeMultiplier?: number | null;
  allowance?: number | null;
  deductions?: PayrollDeductionsInput;
}

export interface PayrollCalculation {
  hourlyRate: number;
  regularPay: number;
  overtimePay: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
}

export interface AttendanceRecordInput {
  name: string;
  role: string;
  site: string;
  date: string;
  hours: number;
  overtimeHours?: number;
  totalHours?: number;
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
  allowance?: number;
  grossPay?: number;
  totalDeductions?: number;
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
  site: string;
  totalHours: number;
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

function toNonNegativeNumber(value: number | null | undefined): number {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
}

function sumDeductions(deductions: PayrollDeductionsInput): number {
  if (typeof deductions === "number") {
    return toNonNegativeNumber(deductions);
  }

  if (Array.isArray(deductions)) {
    return deductions.reduce<number>(
      (sum, deduction) => sum + toNonNegativeNumber(deduction),
      0,
    );
  }

  if (deductions && typeof deductions === "object") {
    return Object.values(deductions).reduce<number>(
      (sum, deduction) => sum + toNonNegativeNumber(deduction),
      0,
    );
  }

  return 0;
}

export function calculatePayroll(input: CalculatePayrollInput): PayrollCalculation {
  const dailyRate = toNonNegativeNumber(input.dailyRate);
  const regularHours = toNonNegativeNumber(input.regularHours);
  const overtimeHours = toNonNegativeNumber(input.overtimeHours);
  const overtimeMultiplier =
    Number.isFinite(Number(input.overtimeMultiplier)) &&
    Number(input.overtimeMultiplier) >= 0
      ? Number(input.overtimeMultiplier)
      : DEFAULT_OVERTIME_MULTIPLIER;
  const allowance = toNonNegativeNumber(input.allowance);
  const totalDeductions = sumDeductions(input.deductions);
  const hourlyRate = dailyRate / HOURS_PER_DAY;
  const regularPay = calculateRegularPay(
    dailyRate,
    regularHours,
    HOURS_PER_DAY,
  );
  const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier;
  const grossPay = regularPay + overtimePay + allowance;
  const netPay = grossPay - totalDeductions;

  return {
    hourlyRate,
    regularPay,
    overtimePay,
    grossPay,
    totalDeductions,
    netPay,
  };
}

export function roundPayrollCalculation(
  calculation: PayrollCalculation,
): PayrollCalculation {
  return {
    hourlyRate: roundTo(calculation.hourlyRate),
    regularPay: roundTo(calculation.regularPay),
    overtimePay: roundTo(calculation.overtimePay),
    grossPay: roundTo(calculation.grossPay),
    totalDeductions: roundTo(calculation.totalDeductions),
    netPay: roundTo(calculation.netPay),
  };
}

export function recalculatePayrollRow(
  row: PayrollRow,
  overtimeMultiplier = DEFAULT_OVERTIME_MULTIPLIER,
): PayrollRow {
  const rate = toNonNegativeNumber(row.customRate ?? row.defaultRate);
  const calculation = roundPayrollCalculation(
    calculatePayroll({
      dailyRate: rate * HOURS_PER_DAY,
      regularHours: row.hoursWorked,
      overtimeHours: row.overtimeHours,
      overtimeMultiplier,
      allowance: 0,
      deductions: 0,
    }),
  );

  return {
    ...row,
    rate: roundTo(rate),
    regularPay: calculation.regularPay,
    overtimePay: calculation.overtimePay,
    allowance: 0,
    grossPay: calculation.grossPay,
    totalDeductions: calculation.totalDeductions,
    totalPay: calculation.netPay,
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
    const numericHours = Number(record.hours);
    if (!Number.isFinite(numericHours) || numericHours < 0) continue;

    const paidRegularHours = calculatePaidRegularHours(numericHours);
    const site = normalizeWhitespace(record.site) || "Unknown Site";
    const date = normalizeWhitespace(record.date);
    const key = `${role}|||${workerName}|||${site}`;

    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        worker: workerName,
        role,
        site,
        totalHours: paidRegularHours,
        dates: new Set(date ? [date] : []),
      });
      continue;
    }

    existing.totalHours += paidRegularHours;
    if (date) existing.dates.add(date);
  }

  const rows = Array.from(grouped.values()).map((group) => {
    const dailyRate = getDailyRateForRole(group.role, roleRates);
    const defaultRate =
      Number.isFinite(dailyRate) && dailyRate > 0 ? dailyRate / hoursPerDay : 0;

    const baseRow: PayrollRow = {
      id: `${group.role}|||${group.worker}|||${group.site}`,
      worker: group.worker,
      role: group.role,
      site: group.site,
      date: summarizeDates(group.dates),
      hoursWorked: group.totalHours,
      overtimeHours: 0,
      defaultRate,
      customRate: null,
      rate: defaultRate,
      regularPay: 0,
      overtimePay: 0,
      allowance: 0,
      grossPay: 0,
      totalDeductions: 0,
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

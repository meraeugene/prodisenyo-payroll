import type {
  AttendanceRecord,
  DailyLogRow,
  PayrollEntry,
  PayrollSettingsState,
  PayrollSummary,
  PayrollSummaryRow,
  RoleRateSetting,
  WorkerRole,
} from "@/types";

interface DailyAccumulator {
  date: string;
  site: string;
  employee: string;
  workerName: string;
  role: WorkerRole;
  roleLabel: string;
  mergeKey: string;
  regularIn: string;
  regularOut: string;
  overtimeIn: string;
  overtimeOut: string;
}

export function buildDailyLogRows(records: AttendanceRecord[]): DailyLogRow[] {
  const grouped = new Map<string, DailyAccumulator>();

  for (const record of records) {
    const key = `${record.date}|||${record.site.toLowerCase()}|||${record.mergeKey}`;
    const current = grouped.get(key) ?? {
      date: record.date,
      site: record.site,
      employee: record.employee,
      workerName: record.workerName,
      role: record.role,
      roleLabel: record.roleLabel,
      mergeKey: record.mergeKey,
      regularIn: "",
      regularOut: "",
      overtimeIn: "",
      overtimeOut: "",
    };

    if (record.source === "OT") {
      if (record.type === "IN") {
        current.overtimeIn = earlierTime(current.overtimeIn, record.logTime);
      } else {
        current.overtimeOut = laterTime(current.overtimeOut, record.logTime);
      }
    } else if (record.type === "IN") {
      current.regularIn = earlierTime(current.regularIn, record.logTime);
    } else {
      current.regularOut = laterTime(current.regularOut, record.logTime);
    }

    grouped.set(key, current);
  }

  return Array.from(grouped.values())
    .map((row) => {
      const otAsRegularOut = !row.regularOut
        ? laterTime(row.overtimeOut, row.overtimeIn)
        : "";
      const effectiveRegularOut = row.regularOut || otAsRegularOut;
      const regularMinutes = pairMinutes(row.regularIn, effectiveRegularOut);

      const usedOtAsRegularBoundary =
        !row.regularOut && Boolean(otAsRegularOut) && Boolean(row.regularIn);
      const overtimeMinutes =
        row.overtimeIn && row.overtimeOut && !usedOtAsRegularBoundary
          ? pairMinutes(row.overtimeIn, row.overtimeOut)
          : 0;

      return {
        date: row.date,
        site: row.site,
        employee: row.employee,
        workerName: row.workerName,
        role: row.role,
        roleLabel: row.roleLabel,
        mergeKey: row.mergeKey,
        timeIn: row.regularIn,
        timeOut: effectiveRegularOut,
        overtimeIn: row.overtimeIn,
        overtimeOut: row.overtimeOut,
        regularHours: roundTo(regularMinutes / 60, 2),
        overtimeHours: roundTo(overtimeMinutes / 60, 2),
        totalHours: roundTo((regularMinutes + overtimeMinutes) / 60, 2),
      } satisfies DailyLogRow;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.workerName !== b.workerName) return a.workerName.localeCompare(b.workerName);
      return a.site.localeCompare(b.site);
    });
}

export function generatePayrollEntries(
  dailyRows: DailyLogRow[],
  settings: PayrollSettingsState,
): PayrollEntry[] {
  const ratesByRole = buildRateLookup(settings);

  return dailyRows
    .map((row) => {
      const roleRate = ratesByRole.get(row.role) ?? fallbackRate(row.role, settings);
      const rate = roleRate.dailyRate;
      const hourlyRate = rate / roleRate.hoursPerDay;
      const regularPay = roundTo(row.regularHours * hourlyRate, 2);
      const overtimePay = roundTo(row.overtimeHours * hourlyRate, 2);
      const netPay = roundTo(regularPay + overtimePay, 2);

      return {
        id: `${row.date}|||${row.site.toLowerCase()}|||${row.mergeKey}`,
        workerName: row.workerName,
        role: row.role,
        roleLabel: row.roleLabel,
        mergeKey: row.mergeKey,
        site: row.site,
        date: row.date,
        hoursWorked: row.regularHours,
        overtimeHours: row.overtimeHours,
        rate,
        bonuses: 0,
        deductions: 0,
        regularPay,
        overtimePay,
        netPay,
        customRate: false,
      } satisfies PayrollEntry;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.workerName !== b.workerName) return a.workerName.localeCompare(b.workerName);
      return a.site.localeCompare(b.site);
    });
}

export function recalculatePayrollEntry(
  entry: PayrollEntry,
  settings: PayrollSettingsState,
): PayrollEntry {
  const roleRate = buildRateLookup(settings).get(entry.role) ?? fallbackRate(entry.role, settings);
  const effectiveRate = entry.customRate ? entry.rate : roleRate.dailyRate;
  const hoursPerDay = roleRate.hoursPerDay;
  const hourlyRate = effectiveRate / hoursPerDay;
  const regularPay = roundTo(entry.hoursWorked * hourlyRate, 2);
  const overtimePay = roundTo(entry.overtimeHours * hourlyRate, 2);
  const netPay = roundTo(
    regularPay + overtimePay + entry.bonuses - entry.deductions,
    2,
  );

  return {
    ...entry,
    rate: roundTo(effectiveRate, 2),
    regularPay,
    overtimePay,
    netPay,
  };
}

export function summarizePayroll(entries: PayrollEntry[]): {
  summary: PayrollSummary;
  rows: PayrollSummaryRow[];
} {
  const grouped = new Map<string, PayrollSummaryRow>();

  for (const entry of entries) {
    const key = `${entry.site.toLowerCase()}|||${entry.mergeKey}`;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        workerName: entry.workerName,
        role: entry.role,
        roleLabel: entry.roleLabel,
        site: entry.site,
        mergeKey: entry.mergeKey,
        days: 1,
        totalHours: roundTo(entry.hoursWorked + entry.overtimeHours, 2),
        rate: entry.rate,
        totalPay: entry.netPay,
      });
      continue;
    }

    existing.days += 1;
    existing.totalHours = roundTo(
      existing.totalHours + entry.hoursWorked + entry.overtimeHours,
      2,
    );
    existing.totalPay = roundTo(existing.totalPay + entry.netPay, 2);
    if (entry.customRate) {
      existing.rate = entry.rate;
    }
  }

  const rows = Array.from(grouped.values()).sort((a, b) => {
    if (a.workerName !== b.workerName) return a.workerName.localeCompare(b.workerName);
    return a.site.localeCompare(b.site);
  });

  return {
    summary: {
      totalEmployees: rows.length,
      totalWorkers: rows.length,
      totalDays: entries.length,
      totalHours: roundTo(
        entries.reduce((sum, entry) => sum + entry.hoursWorked + entry.overtimeHours, 0),
        2,
      ),
      totalGross: roundTo(entries.reduce((sum, entry) => sum + entry.netPay, 0), 2),
      totalNetPay: roundTo(entries.reduce((sum, entry) => sum + entry.netPay, 0), 2),
    },
    rows,
  };
}

export async function exportPayrollToXlsx(
  entries: PayrollEntry[],
  summaryRows: PayrollSummaryRow[],
  periodLabel: string,
): Promise<void> {
  const XLSX = await import("xlsx");

  const detailRows = entries.map((entry) => ({
    Worker: entry.workerName,
    Role: entry.role,
    Site: entry.site,
    Date: entry.date,
    "Hours Worked": entry.hoursWorked,
    "Overtime Hours": entry.overtimeHours,
    "Daily Rate": entry.rate,
    "Regular Pay": entry.regularPay,
    "Overtime Pay": entry.overtimePay,
    Bonuses: entry.bonuses,
    Deductions: entry.deductions,
    "Net Pay": entry.netPay,
  }));

  const summary = summaryRows.map((row) => ({
    Worker: row.workerName,
    Role: row.role,
    Site: row.site,
    Days: row.days,
    "Total Hours": row.totalHours,
    Rate: row.rate,
    "Total Pay": row.totalPay,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Payroll Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), "Payroll Entries");

  const safePeriod = periodLabel
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  XLSX.writeFile(wb, `payroll_${safePeriod || "period"}.xlsx`);
}

export function formatPHP(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString("en-PH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function capitalize(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildRateLookup(settings: PayrollSettingsState): Map<WorkerRole, RoleRateSetting> {
  const map = new Map<WorkerRole, RoleRateSetting>();
  for (const roleSetting of settings.roleRates) {
    map.set(roleSetting.role, roleSetting);
  }
  return map;
}

function fallbackRate(role: WorkerRole, settings: PayrollSettingsState): RoleRateSetting {
  const fallback =
    settings.roleRates.find((item) => item.role === role) ??
    settings.roleRates.find((item) => item.role === "UNK") ??
    settings.roleRates[0];
  return fallback;
}

function earlierTime(current: string, incoming: string): string {
  if (!incoming) return current;
  if (!current) return incoming;
  return toMinutes(incoming) < toMinutes(current) ? incoming : current;
}

function laterTime(current: string, incoming: string): string {
  if (!incoming) return current;
  if (!current) return incoming;
  return toMinutes(incoming) > toMinutes(current) ? incoming : current;
}

function pairMinutes(inTime: string, outTime: string): number {
  if (!inTime || !outTime) return 0;
  const inMinutes = toMinutes(inTime);
  const outMinutes = toMinutes(outTime);
  if (outMinutes >= inMinutes) return outMinutes - inMinutes;
  return outMinutes + 24 * 60 - inMinutes;
}

function toMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function roundTo(value: number, decimals: number): number {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

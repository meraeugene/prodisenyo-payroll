import type { PayrollRow } from "@/lib/payrollEngine";
import { calculatePayroll, roundPayrollCalculation } from "@/lib/payrollEngine";
import { calculatePaidRegularHours } from "@/lib/payrollHours";
import { matchesSearchText } from "@/lib/utils";
import {
  DEFAULT_OVERTIME_MULTIPLIER,
  normalizeRoleCode,
  type RoleCode,
} from "@/lib/payrollConfig";
import type { Step2Sort } from "@/types";
import type { UsePayrollStateResult } from "@/features/payroll/hooks/usePayrollState";
import type { LogHourOverrideValue, PayrollRowOverride } from "@/features/payroll/types";
import {
  allocateCombinedBranchPay,
  buildEditingPayrollLogs,
  FIXED_PAY_RATE_PER_DAY,
} from "@/features/payroll/utils/payrollSelectors";
import {
  extractPayrollPeriod,
  extractSiteName,
  formatCompactPayrollPeriodLabel,
  formatLogTime,
  toWeekLabel,
} from "@/features/payroll/utils/payrollFormatters";
import {
  buildEmployeeBranchRateKey,
  getLogOverrideKey,
  parsePayrollIdentity,
} from "@/features/payroll/utils/payrollMappers";
import type { PayslipExportRecord } from "@/lib/payslipExport";

const EMPLOYEE_NAME_OVERRIDES: Record<string, string> = {
  pbryanm: "bryanmamerto",
};

export interface GroupedEmployeePayrollRow {
  name: string;
  role: string;
  sites: PayrollRow[];
  totalHours: number;
  totalPay: number;
}

export interface GroupedEmployeeMetrics {
  actualTotalHours: number;
  paidRegularHours: number;
  daysWorked: number;
  basePay: number;
  paidHolidayPay: number;
  approvedOvertimePay: number;
  paidLeavePay: number;
  cashAdvancePay: number;
  totalPay: number;
  dailyRates: number[];
}

export interface GroupedPayrollFilters {
  siteFilter: string;
  roleFilter: RoleCode | "ALL";
  nameFilter: string;
  dateFilter: string;
}

export function normalizeEmployeeName(name: string): string {
  const normalized = name.trim().toLowerCase();
  const compact = normalized.replace(/[^a-z0-9]/g, "");
  return EMPLOYEE_NAME_OVERRIDES[compact] ?? compact;
}

function pickPreferredRole(currentRole: string, candidateRole: string): string {
  const normalizedCurrent = normalizeRoleCode(currentRole) ?? "UNKNOWN";
  const normalizedCandidate = normalizeRoleCode(candidateRole) ?? "UNKNOWN";

  if (normalizedCurrent === "UNKNOWN" && normalizedCandidate !== "UNKNOWN") {
    return normalizedCandidate;
  }

  return normalizedCurrent;
}

export function pickRepresentativeRow(rows: PayrollRow[]): PayrollRow | null {
  if (rows.length === 0) return null;

  const preferred = rows.find((row) => {
    const role = normalizeRoleCode(row.role) ?? "UNKNOWN";
    return role !== "UNKNOWN";
  });

  return preferred ?? rows[0] ?? null;
}

export function formatDaysLabel(daysWorked: number): string {
  return `${daysWorked.toLocaleString("en-PH")} day${daysWorked === 1 ? "" : "s"}`;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumManualAllowanceFromOverride(
  override: PayrollRowOverride | undefined,
): number {
  if (!override) return 0;
  if (Number.isFinite(override.allowanceEntriesTotal)) {
    return round2(override.allowanceEntriesTotal ?? 0);
  }
  return round2(
    (override.allowanceEntries ?? []).reduce(
      (sum, entry) => sum + entry.amount,
      0,
    ),
  );
}

function sumPayrollDeductionsFromOverride(
  override: PayrollRowOverride | undefined,
): number {
  if (!override) return 0;
  if (Number.isFinite(override.deductionsTotal)) {
    return round2(override.deductionsTotal ?? 0);
  }
  return round2(
    (override.deductionEntries ?? []).reduce(
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
}

function compareGroupedEmployees(
  a: GroupedEmployeePayrollRow,
  b: GroupedEmployeePayrollRow,
  sort: Step2Sort,
): number {
  if (sort === "name-desc") {
    return b.name.localeCompare(a.name);
  }

  return a.name.localeCompare(b.name);
}

export function groupByEmployee(
  rows: PayrollRow[],
  sort: Step2Sort,
): GroupedEmployeePayrollRow[] {
  const grouped = new Map<string, GroupedEmployeePayrollRow>();

  for (const row of rows) {
    const key = normalizeEmployeeName(row.worker);
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, {
        name: row.worker,
        role: normalizeRoleCode(row.role) ?? "UNKNOWN",
        sites: [row],
        totalHours: row.hoursWorked,
        totalPay: row.totalPay,
      });
      continue;
    }

    existing.sites.push(row);
    existing.totalHours += row.hoursWorked;
    existing.totalPay += row.totalPay;
    existing.role = pickPreferredRole(existing.role, row.role);

    if (row.worker.length > existing.name.length) {
      existing.name = row.worker;
    }
  }

  return Array.from(grouped.values()).sort((a, b) =>
    compareGroupedEmployees(a, b, sort),
  );
}

export function matchesGroupedEmployeeFilters(
  employee: GroupedEmployeePayrollRow,
  filters: GroupedPayrollFilters,
): boolean {
  const normalizedNameFilter = filters.nameFilter.trim().toLowerCase();
  const normalizedDateFilter = filters.dateFilter.trim();

  if (filters.roleFilter !== "ALL" && employee.role !== filters.roleFilter) {
    return false;
  }

  if (normalizedNameFilter && !matchesSearchText(employee.name, normalizedNameFilter)) {
    return false;
  }

  if (
    filters.siteFilter !== "ALL" &&
    !employee.sites.some((row) =>
      (row.site || "")
        .split(",")
        .map((siteName) => siteName.trim())
        .includes(filters.siteFilter),
    )
  ) {
    return false;
  }

  if (
    normalizedDateFilter &&
    !employee.sites.some((row) => row.date.includes(normalizedDateFilter))
  ) {
    return false;
  }

  return true;
}

export function summarizeGroupedSites(rows: PayrollRow[]): Array<{ site: string }> {
  const summary = new Map<string, { site: string }>();

  for (const row of rows) {
    const normalizedSites = (row.site || "Unknown Site")
      .split(",")
      .map((site) => extractSiteName(site))
      .filter((site) => site.length > 0);

    for (const site of normalizedSites) {
      if (!summary.has(site)) {
        summary.set(site, { site });
      }
    }
  }

  return Array.from(summary.values()).sort((a, b) =>
    a.site.localeCompare(b.site),
  );
}

export function buildGroupedEmployeeCompensation(
  employee: GroupedEmployeePayrollRow,
  payroll: UsePayrollStateResult,
) {
  const employeeKey = normalizeEmployeeName(employee.name);
  const roleKey = employee.role;
  const hoursBySite = new Map<string, number>();

  payroll.payrollAttendanceInputs.forEach((record) => {
    if (normalizeEmployeeName(record.name) !== employeeKey) return;
    if ((normalizeRoleCode(record.role) ?? "UNKNOWN") !== roleKey) return;

    const siteName = extractSiteName(record.site) || record.site || "Unknown Site";
    hoursBySite.set(
      siteName,
      (hoursBySite.get(siteName) ?? 0) + calculatePaidRegularHours(record.hours),
    );
  });

  const breakdown =
    hoursBySite.size > 0
      ? Array.from(hoursBySite.entries()).map(([site, hoursWorked]) => {
          const matchingRow =
            employee.sites.find((row) =>
              row.site
                .split(",")
                .map((value) => extractSiteName(value) || value.trim())
                .includes(site),
            ) ?? employee.sites[0];
          const role = matchingRow?.role ?? employee.role;
          const rateKey = buildEmployeeBranchRateKey(employee.name, role, site);
          const fallbackRate = Number.isFinite(matchingRow?.rate)
            ? (matchingRow?.rate ?? 0) * 8
            : FIXED_PAY_RATE_PER_DAY;

          return {
            site,
            hoursWorked,
            dailyRatePerDay:
              payroll.employeeBranchRates[rateKey]?.dailyRate ?? fallbackRate,
          };
        })
      : employee.sites.map((row) => ({
          site: extractSiteName(row.site) || row.site || "Unknown Site",
          hoursWorked: row.hoursWorked,
          dailyRatePerDay: row.rate * 8,
        }));

  return allocateCombinedBranchPay(breakdown);
}

function buildMergedLogOverrides(
  payroll: UsePayrollStateResult,
): Record<string, LogHourOverrideValue> {
  return Object.values(payroll.payrollOverrides).reduce<
    Record<string, LogHourOverrideValue>
  >((acc, override) => {
    if (!override.logHours) return acc;
    Object.assign(acc, override.logHours);
    return acc;
  }, {});
}

function buildGroupedEmployeeLogMetrics(
  employee: GroupedEmployeePayrollRow,
  payroll: UsePayrollStateResult,
): {
  actualTotalHours: number;
  daysWorked: number;
} {
  const employeeKey = normalizeEmployeeName(employee.name);
  const roleKey = normalizeRoleCode(employee.role) ?? "UNKNOWN";
  const allowedSites = new Set(
    summarizeGroupedSites(employee.sites).map((entry) => entry.site),
  );
  const mergedLogOverrides = buildMergedLogOverrides(payroll);
  let actualTotalHours = 0;
  let daysWorked = 0;

  for (const log of payroll.dailyRows) {
    const identity = parsePayrollIdentity(log.employee);
    const normalizedName = normalizeEmployeeName(identity.name);
    const normalizedRole = normalizeRoleCode(identity.role) ?? "UNKNOWN";
    const normalizedSite = extractSiteName(log.site) || log.site || "Unknown Site";

    if (normalizedName !== employeeKey) continue;
    if (normalizedRole !== roleKey) continue;
    if (allowedSites.size > 0 && !allowedSites.has(normalizedSite)) continue;

    const override = mergedLogOverrides[getLogOverrideKey(log)];
    const regularHours =
      typeof override === "number"
        ? override
        : override?.regularHours ?? log.regularHours;
    const overtimeHours =
      typeof override === "number"
        ? log.overtimeHours
        : override?.overtimeHours ?? log.overtimeHours;
    const totalHours = round2(
      Math.max(0, Number(regularHours) || 0) +
        Math.max(0, Number(overtimeHours) || 0),
    );

    actualTotalHours += totalHours;
    if (totalHours > 0) {
      daysWorked += 1;
    }
  }

  return {
    actualTotalHours,
    daysWorked,
  };
}

export function buildGroupedEmployeeMetrics(
  employee: GroupedEmployeePayrollRow,
  payroll: UsePayrollStateResult,
): GroupedEmployeeMetrics {
  const compensation = buildGroupedEmployeeCompensation(employee, payroll);
  const logMetrics = buildGroupedEmployeeLogMetrics(employee, payroll);
  let paidLeavePay = 0;
  let cashAdvancePay = 0;
  let manualAllowancePay = 0;
  let payrollDeductionsPay = 0;

  for (const row of employee.sites) {
    const override = payroll.payrollOverrides[row.id];
    if (!override) continue;

    for (const entry of override.paidLeaveEntries ?? []) {
      paidLeavePay += entry.pay;
    }

    for (const entry of override.cashAdvanceEntries ?? []) {
      cashAdvancePay += entry.amount;
    }

    manualAllowancePay += sumManualAllowanceFromOverride(override);
    payrollDeductionsPay += sumPayrollDeductionsFromOverride(override);
  }

  const paidHolidayPay = payroll.payableHolidayDays * FIXED_PAY_RATE_PER_DAY;
  const allowance = round2(
    paidHolidayPay + paidLeavePay + manualAllowancePay,
  );
  const effectiveDailyRate =
    compensation.totalWorkedHours > 0
      ? (compensation.totalBasePay / compensation.totalWorkedHours) * 8
      : compensation.breakdown[0]?.dailyRatePerDay ?? 0;
  const calculation = roundPayrollCalculation(
    calculatePayroll({
      dailyRate: effectiveDailyRate,
      regularHours: compensation.totalWorkedHours,
      overtimeHours: employee.sites.reduce(
        (sum, row) => sum + row.overtimeHours,
        0,
      ),
      overtimeMultiplier: DEFAULT_OVERTIME_MULTIPLIER,
      allowance,
      deductions: {
        cashAdvance: cashAdvancePay,
        payrollDeductions: payrollDeductionsPay,
      },
    }),
  );
  const dailyRates = Array.from(
    new Set(
      compensation.breakdown
        .map((entry) => round2(entry.dailyRatePerDay))
        .filter((rate) => Number.isFinite(rate) && rate > 0),
    ),
  ).sort((a, b) => a - b);

  return {
    actualTotalHours: logMetrics.actualTotalHours,
    paidRegularHours: compensation.totalWorkedHours,
    daysWorked: logMetrics.daysWorked,
    basePay: compensation.totalBasePay,
    paidHolidayPay: round2(paidHolidayPay),
    approvedOvertimePay: calculation.overtimePay,
    paidLeavePay: round2(paidLeavePay),
    cashAdvancePay: round2(cashAdvancePay),
    totalPay: calculation.netPay,
    dailyRates,
  };
}

export function buildPayslipRecord(
  employee: GroupedEmployeePayrollRow,
  periodLabel: string | null,
  payroll: UsePayrollStateResult,
): PayslipExportRecord | null {
  const representativeRow = pickRepresentativeRow(employee.sites);
  if (!representativeRow) return null;
  const compensation = buildGroupedEmployeeCompensation(employee, payroll);
  const metrics = buildGroupedEmployeeMetrics(employee, payroll);

  const site = summarizeGroupedSites(employee.sites)
    .map((entry) => entry.site)
    .join(", ");
  const displayRow: PayrollRow = {
    ...representativeRow,
    worker: employee.name,
    role: employee.role,
    site,
    hoursWorked: metrics.paidRegularHours,
    overtimeHours: employee.sites.reduce((sum, row) => sum + row.overtimeHours, 0),
    regularPay: compensation.totalBasePay,
    totalPay: metrics.totalPay,
  };
  const mergedLogOverrides = Object.values(payroll.payrollOverrides).reduce<
    Record<string, LogHourOverrideValue>
  >((acc, override) => {
    if (!override.logHours) return acc;
    Object.assign(acc, override.logHours);
    return acc;
  }, {});
  const employeeLogs = buildEditingPayrollLogs(
    payroll.dailyRows,
    displayRow,
    representativeRow.date,
  );
  const holidayDateSet = new Set(
    payroll.paidHolidays.map((holiday) => holiday.date),
  );

  return {
    employee: employee.name,
    role: employee.role,
    site: site || "-",
    period: periodLabel ?? representativeRow.date ?? "-",
    daysWorked: metrics.daysWorked,
    totalHours: metrics.actualTotalHours,
    ratePerDay:
      compensation.totalPayableDays > 0
        ? compensation.totalBasePay / compensation.totalPayableDays
        : metrics.dailyRates[0] ?? 0,
    totalPay: metrics.totalPay,
    attendanceLogs: employeeLogs.map((log) => {
      const overrideHours = mergedLogOverrides[getLogOverrideKey(log)];
      const nextHours =
        typeof overrideHours === "number"
          ? overrideHours
          : overrideHours
            ? (overrideHours.regularHours ?? log.regularHours) +
              (overrideHours.overtimeHours ?? log.overtimeHours)
            : log.totalHours;

      return {
        dateLabel: toWeekLabel(log.date),
        site: extractSiteName(log.site) || "-",
        time1In: formatLogTime(log.time1In),
        time1Out: formatLogTime(log.time1Out),
        time2In: formatLogTime(log.time2In),
        time2Out: formatLogTime(log.time2Out),
        otIn: formatLogTime(log.otIn),
        otOut: formatLogTime(log.otOut),
        hours: nextHours,
        isPaidHoliday: holidayDateSet.has(log.date),
      };
    }),
  };
}

export function buildPayrollPeriodLabel(rows: PayrollRow[]): string | null {
  const periodCounts = new Map<string, number>();

  for (const row of rows) {
    const rowSites = (row.site || "Unknown Site")
      .split(",")
      .map((site) => site.trim())
      .filter((site) => site.length > 0);

    for (const site of rowSites) {
      const parsed = extractPayrollPeriod(site);
      if (!parsed) continue;
      const key = `${parsed.start}-${parsed.end}`;
      periodCounts.set(key, (periodCounts.get(key) ?? 0) + 1);
    }

    if (periodCounts.size > 0) continue;

    const fromDate = extractPayrollPeriod(row.date);
    if (!fromDate) continue;
    const key = `${fromDate.start}-${fromDate.end}`;
    periodCounts.set(key, (periodCounts.get(key) ?? 0) + 1);
  }

  if (periodCounts.size === 0) return null;

  const mostCommon = Array.from(periodCounts.entries()).sort(
    (a, b) => b[1] - a[1],
  )[0];

  if (!mostCommon) return null;
  const [start, end] = mostCommon[0].split("-");
  return formatCompactPayrollPeriodLabel(start, end);
}

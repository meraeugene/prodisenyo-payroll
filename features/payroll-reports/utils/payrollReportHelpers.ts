import type { DailyLogRow } from "@/types";
import {
  extractSiteName,
  formatPayrollNumber,
} from "@/features/payroll/utils/payrollFormatters";
import {
  buildEditingPayrollLogs,
  computeBasePay,
} from "@/features/payroll/utils/payrollSelectors";
import { normalizeEmployeeNameKey } from "@/features/payroll/utils/payrollMappers";
import { calculateDailyWorkMinutes } from "@/lib/utils";
import type {
  AttendanceLogRow,
  EmployeeAttendanceModalData,
  PayrollRunDailyTotalRow,
  PayrollRunItemRow,
  PayrollRunRow,
  ReportCompositionDatum,
  ReportSiteSummary,
  ReportTrendPoint,
} from "@/features/payroll-reports/types";
import type { PayrollRow } from "@/lib/payrollEngine";
import type { PayrollRunStatus } from "@/types/database";

const PESO_SIGN = "\u20B1";

export function roundPayrollReportValue(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getPayrollReportStatusBadgeClass(
  status: PayrollRunStatus,
): string {
  if (status === "approved") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (status === "submitted" || status === "draft") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-[#eef7f0] text-[#2d6a4f] border-[#cfe3d3]";
}

export function getPayrollReportStatusLabel(status: PayrollRunStatus): string {
  if (status === "submitted") return "Pending";
  if (status === "approved") return "Approved";
  if (status === "draft") return "Draft";
  return "Returned";
}

export function normalizePayrollReportKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function formatPayrollReportDateTime(value: string | null): string {
  if (!value) return "Not submitted";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not submitted";
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatPayrollReportPeso(value: number): string {
  return `${PESO_SIGN} ${formatPayrollNumber(value)}`;
}

export function formatPayrollReportCompactValue(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

export function formatPayrollReportLogDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatPayrollReportLogTime(value: string | null): string {
  if (!value) return "--";
  const date = new Date(`1970-01-01T${value}`);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatPayrollReportPeriodLabel(report: PayrollRunRow): string {
  if (report.period_start && report.period_end) {
    return `${report.period_start} to ${report.period_end}`;
  }
  return report.period_label || "Unknown period";
}

export function formatPayrollReportChartDateLabel(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

export function splitPayrollReportSiteNames(value: string): string[] {
  return value
    .split(",")
    .map((site) => extractSiteName(site) || site.trim())
    .filter((site) => site.length > 0);
}

function toMinutes(value: string | null): number {
  if (!value) return -1;
  const match = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return -1;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return -1;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return -1;
  return hours * 60 + minutes;
}

export function buildPayrollReportDailyRows(
  logs: AttendanceLogRow[],
): DailyLogRow[] {
  const map = new Map<string, DailyLogRow>();

  for (const log of logs) {
    const site =
      extractSiteName(log.site_name ?? "") ||
      log.site_name?.trim() ||
      "Unknown Site";
    const employee = log.employee_name?.trim() || "Unknown Employee";
    const employeeKey = normalizeEmployeeNameKey(employee);
    const key = `${employeeKey}|||${log.log_date}|||${site.toLowerCase()}`;
    const row = map.get(key) ?? {
      date: log.log_date,
      employee,
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
      site,
    };

    const currentMinutes = toMinutes(log.log_time);
    if (employee.length > row.employee.length) row.employee = employee;

    if (log.log_source === "Time1") {
      if (log.log_type === "IN") {
        row.time1In =
          !row.time1In ||
          (currentMinutes >= 0 && currentMinutes < toMinutes(row.time1In))
            ? (log.log_time ?? "")
            : row.time1In;
      } else {
        row.time1Out =
          !row.time1Out ||
          (currentMinutes >= 0 && currentMinutes > toMinutes(row.time1Out))
            ? (log.log_time ?? "")
            : row.time1Out;
      }
    }

    if (log.log_source === "Time2") {
      if (log.log_type === "IN") {
        row.time2In =
          !row.time2In ||
          (currentMinutes >= 0 && currentMinutes < toMinutes(row.time2In))
            ? (log.log_time ?? "")
            : row.time2In;
      } else {
        row.time2Out =
          !row.time2Out ||
          (currentMinutes >= 0 && currentMinutes > toMinutes(row.time2Out))
            ? (log.log_time ?? "")
            : row.time2Out;
      }
    }

    if (log.log_source === "OT") {
      if (log.log_type === "IN") {
        row.otIn =
          !row.otIn ||
          (currentMinutes >= 0 && currentMinutes < toMinutes(row.otIn))
            ? (log.log_time ?? "")
            : row.otIn;
      } else {
        row.otOut =
          !row.otOut ||
          (currentMinutes >= 0 && currentMinutes > toMinutes(row.otOut))
            ? (log.log_time ?? "")
            : row.otOut;
      }
    }

    map.set(key, row);
  }

  return Array.from(map.values())
    .map((row) => {
      const minutes = calculateDailyWorkMinutes(row);
      const regularHours = roundPayrollReportValue(
        minutes.regularMinutes / 60,
      );
      const overtimeHours = roundPayrollReportValue(
        minutes.overtimeMinutes / 60,
      );
      const totalHours = roundPayrollReportValue(minutes.totalMinutes / 60);

      return {
        ...row,
        regularHours,
        overtimeHours,
        totalHours,
        hours: totalHours,
      };
    })
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      const bySite = a.site.localeCompare(b.site);
      if (bySite !== 0) return bySite;
      return a.employee.localeCompare(b.employee);
    });
}

export function buildPayrollReportSiteSummaries(
  payrollItems: PayrollRunItemRow[],
): ReportSiteSummary[] {
  const siteMap = new Map<
    string,
    { employeeIds: Set<string>; payroll: number; hours: number }
  >();

  for (const item of payrollItems) {
    const siteNames = splitPayrollReportSiteNames(item.site_name);
    const normalizedSiteNames =
      siteNames.length > 0 ? siteNames : ["Unknown Site"];
    const payrollShare = item.total_pay / normalizedSiteNames.length;
    const hoursShare = item.hours_worked / normalizedSiteNames.length;

    for (const siteName of normalizedSiteNames) {
      const existing = siteMap.get(siteName) ?? {
        employeeIds: new Set<string>(),
        payroll: 0,
        hours: 0,
      };
      existing.employeeIds.add(item.id);
      existing.payroll = roundPayrollReportValue(
        existing.payroll + payrollShare,
      );
      existing.hours = roundPayrollReportValue(existing.hours + hoursShare);
      siteMap.set(siteName, existing);
    }
  }

  return Array.from(siteMap.entries())
    .map(([siteName, value]) => ({
      siteName,
      employees: value.employeeIds.size,
      payroll: roundPayrollReportValue(value.payroll),
      hours: roundPayrollReportValue(value.hours),
    }))
    .sort((a, b) => b.payroll - a.payroll);
}

export function buildPayrollReportDailyTrend(
  dailyTotals: PayrollRunDailyTotalRow[],
): ReportTrendPoint[] {
  const dateMap = new Map<
    string,
    { paid: number; hours: number; employeeIds: Set<string> }
  >();
  for (const row of dailyTotals) {
    const existing = dateMap.get(row.payout_date) ?? {
      paid: 0,
      hours: 0,
      employeeIds: new Set<string>(),
    };
    existing.paid = roundPayrollReportValue(
      existing.paid + (row.total_pay ?? 0),
    );
    existing.hours = roundPayrollReportValue(
      existing.hours + (row.hours_worked ?? 0),
    );
    if (row.payroll_run_item_id)
      existing.employeeIds.add(row.payroll_run_item_id);
    dateMap.set(row.payout_date, existing);
  }
  return Array.from(dateMap.entries())
    .map(([date, value]) => ({
      date,
      label: formatPayrollReportChartDateLabel(date),
      paid: roundPayrollReportValue(value.paid),
      hours: roundPayrollReportValue(value.hours),
      employees: value.employeeIds.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildPayrollReportSiteDistribution(
  payrollItems: PayrollRunItemRow[],
): ReportCompositionDatum[] {
  const colors = PAYROLL_REPORT_SITE_COLORS;
  return buildPayrollReportSiteSummaries(payrollItems).map((item, index) => ({
    name: item.siteName,
    value: item.payroll,
    color: colors[index % colors.length],
  }));
}

export const PAYROLL_REPORT_SITE_COLORS = [
  "#14532d",
  "#166534",
  "#15803d",
  "#16a34a",
  "#22c55e",
  "#4ade80",
];

export function buildEmployeeAttendanceModalData(
  report: PayrollRunRow,
  item: PayrollRunItemRow,
  attendanceLogs: AttendanceLogRow[],
): EmployeeAttendanceModalData {
  const scopedLogs = buildPayrollReportDailyRows(attendanceLogs);
  const payrollStyleRow: PayrollRow = {
    id: item.id,
    worker: item.employee_name,
    role: item.role_code,
    site: item.site_name,
    date: formatPayrollReportPeriodLabel(report),
    hoursWorked: item.hours_worked,
    overtimeHours: item.overtime_hours,
    defaultRate: item.rate_per_day / 8,
    customRate: null,
    rate: item.rate_per_day / 8,
    regularPay: item.regular_pay,
    overtimePay: item.overtime_pay,
    totalPay: item.total_pay,
  };
  const dailyRows = buildEditingPayrollLogs(
    scopedLogs,
    payrollStyleRow,
    formatPayrollReportPeriodLabel(report),
  );
  const totalsByDate = new Map<string, { hours: number; paid: number }>();
  for (const row of dailyRows) {
    const existing = totalsByDate.get(row.date) ?? { hours: 0, paid: 0 };
    existing.hours = roundPayrollReportValue(existing.hours + row.hours);
    totalsByDate.set(row.date, existing);
  }
  const scopedDailyTotals = Array.from(totalsByDate.entries())
    .map(([date, value]) => ({
      id: `${item.id}-${date}`,
      payout_date: date,
      hours_worked: value.hours,
      total_pay: computeBasePay(value.hours, item.rate_per_day),
    }))
    .sort((a, b) => a.payout_date.localeCompare(b.payout_date));
  return {
    dailyRows,
    scopedDailyTotals,
    attendanceDays: dailyRows.filter((row) => row.hours > 0).length,
    inLogs: dailyRows.filter((row) => row.time1In || row.time2In || row.otIn)
      .length,
    outLogs: dailyRows.filter(
      (row) => row.time1Out || row.time2Out || row.otOut,
    ).length,
    otLogs: dailyRows.filter((row) => row.otIn || row.otOut).length,
  };
}

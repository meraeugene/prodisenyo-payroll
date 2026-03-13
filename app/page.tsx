"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { X, Search, ArrowRight, ArrowLeft, Calculator } from "lucide-react";
import { motion } from "framer-motion";
import StepIndicator from "@/components/StepIndicator";
import UploadZone from "@/components/UploadZone";
import type { AttendanceRecord, Employee, Step } from "@/types";
import type { ParseResult } from "@/app/lib/parser";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import { DailyLogRow, Step2Sort, Step2View } from "@/types/index";
import {
  compareStep2Rows,
  earlierTime,
  earliestNonEmptyTime,
  laterTime,
  latestNonEmptyTime,
  pairMinutes,
} from "@/lib/utils";
import { highlight } from "@/components/Highlight";
import ChartTooltip from "@/components/charts/ChartTooltip";
import {
  DEFAULT_DAILY_RATE_BY_ROLE,
  DEFAULT_OVERTIME_MULTIPLIER,
  HOURS_PER_DAY,
  ROLE_CODES,
  ROLE_CODE_TO_NAME,
  normalizeRoleCode,
  type RoleCode,
} from "@/lib/payrollConfig";
import {
  generatePayroll,
  recalculatePayrollRow,
  type AttendanceRecordInput,
  type PayrollRow,
} from "@/lib/payrollEngine";
import { exportPayrollToExcel } from "@/lib/payrollExport";
import PayrollInsightsDashboard from "@/components/PayrollInsightsDashboard";

const PREVIEW_LIMIT = 10;
const EMPLOYEE_ANALYTICS_COLORS = ["#2563EB", "#F59E0B", "#10B981", "#8B5CF6"];

interface PayrollEditDraft {
  date: string;
  hoursWorked: string;
  rate: string;
  overtimeHours: string;
}

interface PayrollRowOverride {
  date: string;
  hoursWorked: number;
  overtimeHours: number;
  customRate: number | null;
  logHours?: Record<string, number>;
}

function formatPayrollNumber(value: number): string {
  return value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseNonNegativeOrFallback(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function normalizeNumericInput(value: string): string {
  if (value === "") return "";
  return value.replace(/^0+(?=\d)/, "");
}

function parsePayrollIdentity(employeeText: string): {
  role: string;
  name: string;
} {
  const normalizedEmployee = employeeText.replace(/\s+/g, " ").trim();
  const [firstToken, ...rest] = normalizedEmployee.split(" ");
  const roleFromPrefix = normalizeRoleCode(firstToken);

  if (roleFromPrefix && rest.length > 0) {
    return {
      role: roleFromPrefix,
      name: rest.join(" ").trim(),
    };
  }

  return {
    role: "UNKNOWN",
    name: normalizedEmployee,
  };
}

function toWeekLabel(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${parsed.getDate()}/${days[parsed.getDay()]}`;
}

function parseIsoDate(isoDate: string): Date | null {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  )
    return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function formatIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function expandIsoRange(startText: string, endText: string): string[] {
  const startDate = parseIsoDate(startText);
  const endDate = parseIsoDate(endText);
  if (!startDate || !endDate) return [];

  const orderedStart =
    startDate.getTime() <= endDate.getTime() ? startDate : endDate;
  const orderedEnd =
    startDate.getTime() <= endDate.getTime() ? endDate : startDate;

  const dates: string[] = [];
  const cursor = new Date(orderedStart.getTime());
  let guard = 0;

  while (cursor.getTime() <= orderedEnd.getTime() && guard < 370) {
    dates.push(formatIsoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    guard += 1;
  }

  return dates;
}

function normalizePeriodLabel(label: string): string | null {
  const match = label.match(/(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/i);
  if (!match) return null;

  const dates = expandIsoRange(match[1], match[2]);
  if (dates.length === 0) return null;
  return `${dates[0]} to ${dates[dates.length - 1]}`;
}

function expandDateSummary(
  dateSummary: string,
  fallbackDates: string[],
  payrollPeriodLabel?: string,
): string[] {
  const periodMatch = payrollPeriodLabel?.match(
    /(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/i,
  );
  if (periodMatch) {
    const periodDates = expandIsoRange(periodMatch[1], periodMatch[2]);
    if (periodDates.length > 0) return periodDates;
  }

  const trimmed = dateSummary.trim();
  const [startText, endText] = trimmed
    .split(" to ")
    .map((value) => value.trim());
  const summaryDates = expandIsoRange(
    startText || "",
    endText || startText || "",
  );
  if (summaryDates.length > 0) return summaryDates;

  const validFallback = fallbackDates
    .map((dateText) => dateText.trim())
    .filter((dateText) => parseIsoDate(dateText))
    .sort((a, b) => a.localeCompare(b));

  return Array.from(new Set(validFallback));
}

function toClockHours(value: number): string {
  const totalMinutes = Math.max(0, Math.round(value * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getLogOverrideKey(log: DailyLogRow): string {
  return `${log.date}|||${log.employee}|||${log.site}`;
}

function toShortDateLabel(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
}

function parseTimeToDecimal(timeText: string): number | null {
  const match = timeText.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return Math.round((hours + minutes / 60) * 100) / 100;
}

function inferMinutesFromPunches(times: string[]): number {
  const punches = times.filter(Boolean);
  if (punches.length < 2) return 0;

  let best = 0;
  const maxShiftMinutes = 16 * 60;

  for (let i = 0; i < punches.length; i++) {
    for (let j = 0; j < punches.length; j++) {
      if (i === j) continue;
      const diff = pairMinutes(punches[i], punches[j]);
      if (diff > best && diff <= maxShiftMinutes) {
        best = diff;
      }
    }
  }

  return best;
}

export default function HomePage() {
  const [step, setStep] = useState<Step>(1);
  const [step2View, setStep2View] = useState<Step2View>("daily");
  const [step2Sort, setStep2Sort] = useState<Step2Sort>("date-asc");
  const [recordsPage, setRecordsPage] = useState(1);
  const [step2SiteFilter, setStep2SiteFilter] = useState("ALL");
  const [step2NameFilter, setStep2NameFilter] = useState("");
  const [step2DateFilter, setStep2DateFilter] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [site, setSite] = useState("Unknown Site");
  const [attendancePeriod, setAttendancePeriod] = useState("Current Period");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRoleRates, setPayrollRoleRates] = useState<
    Record<RoleCode, number>
  >(DEFAULT_DAILY_RATE_BY_ROLE);
  const [payrollGenerated, setPayrollGenerated] = useState(false);
  const [payrollTab, setPayrollTab] = useState<"payroll" | "logs">("payroll");
  const [payrollPage, setPayrollPage] = useState(1);
  const [payrollSiteFilter, setPayrollSiteFilter] = useState("ALL");
  const [payrollNameFilter, setPayrollNameFilter] = useState("");
  const [payrollDateFilter, setPayrollDateFilter] = useState("");
  const [payrollSort, setPayrollSort] = useState<Step2Sort>("date-asc");
  const [showPayrollRateModal, setShowPayrollRateModal] = useState(false);
  const [payrollRateDraft, setPayrollRateDraft] = useState<
    Record<RoleCode, number>
  >(DEFAULT_DAILY_RATE_BY_ROLE);
  const [editingPayrollRowId, setEditingPayrollRowId] = useState<string | null>(
    null,
  );
  const [payrollEditDraft, setPayrollEditDraft] =
    useState<PayrollEditDraft | null>(null);
  const [payrollOverrides, setPayrollOverrides] = useState<
    Record<string, PayrollRowOverride>
  >({});
  const [payrollRoleFilter, setPayrollRoleFilter] = useState<RoleCode | "ALL">(
    "ALL",
  );
  const [logHourOverrides, setLogHourOverrides] = useState<
    Record<string, number>
  >({});
  const [payrollSaveNotice, setPayrollSaveNotice] = useState<string | null>(
    null,
  );

  const dailyRows = useMemo<DailyLogRow[]>(() => {
    const grouped = new Map<string, DailyLogRow>();

    for (const record of records) {
      const key = `${record.date}|||${record.employee.trim().toLowerCase()}`;
      const current = grouped.get(key) ?? {
        date: record.date,
        employee: record.employee,
        time1In: "",
        time1Out: "",
        time2In: "",
        time2Out: "",
        otIn: "",
        otOut: "",
        hours: 0,
        site: record.site,
      };

      if (!current.site && record.site) current.site = record.site;

      if (record.source === "Time1" && record.type === "IN") {
        current.time1In = earlierTime(current.time1In, record.logTime);
      } else if (record.source === "Time1" && record.type === "OUT") {
        current.time1Out = laterTime(current.time1Out, record.logTime);
      } else if (record.source === "Time2" && record.type === "IN") {
        current.time2In = earlierTime(current.time2In, record.logTime);
      } else if (record.source === "Time2" && record.type === "OUT") {
        current.time2Out = laterTime(current.time2Out, record.logTime);
      } else if (record.source === "OT" && record.type === "IN") {
        current.otIn = earlierTime(current.otIn, record.logTime);
      } else if (record.source === "OT" && record.type === "OUT") {
        current.otOut = laterTime(current.otOut, record.logTime);
      }

      grouped.set(key, current);
    }

    const rows = Array.from(grouped.values()).map((row) => {
      const regularIn = earliestNonEmptyTime(row.time1In, row.time2In);
      const regularOut = latestNonEmptyTime(row.time1Out, row.time2Out);

      // Some exports place late end-of-day punches in OT In/Out instead of regular Out.
      const otAsRegularOut = !regularOut
        ? latestNonEmptyTime(row.otOut, row.otIn)
        : "";
      const effectiveRegularOut = regularOut || otAsRegularOut;
      const regularMinutes = pairMinutes(regularIn, effectiveRegularOut);

      const usedOtAsRegularBoundary =
        !regularOut && Boolean(otAsRegularOut) && Boolean(regularIn);
      const otMinutes =
        row.otIn && row.otOut && !usedOtAsRegularBoundary
          ? pairMinutes(row.otIn, row.otOut)
          : 0;

      const strictMinutes = regularMinutes + otMinutes;
      const inferredMinutes =
        strictMinutes === 0
          ? inferMinutesFromPunches([
              row.time1In,
              row.time1Out,
              row.time2In,
              row.time2Out,
              row.otIn,
              row.otOut,
            ])
          : 0;
      const minutes = strictMinutes || inferredMinutes;
      return {
        ...row,
        hours: Math.round((minutes / 60) * 100) / 100,
      };
    });

    return rows;
  }, [records]);

  const availableSites = useMemo(() => {
    return Array.from(
      new Set(
        records
          .map((record) => record.site.trim())
          .filter((value) => value.length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [records]);

  const filteredDetailedRecords = useMemo(() => {
    const nameFilter = step2NameFilter.trim().toLowerCase();
    const dateFilter = step2DateFilter.trim();

    const filtered = records.filter((record) => {
      if (step2SiteFilter !== "ALL" && record.site !== step2SiteFilter)
        return false;
      if (dateFilter && record.date !== dateFilter) return false;
      if (nameFilter && !record.employee.toLowerCase().includes(nameFilter))
        return false;
      return true;
    });

    filtered.sort((a, b) => {
      const byPrimary = compareStep2Rows(
        a.date,
        a.employee,
        b.date,
        b.employee,
        step2Sort,
      );
      if (byPrimary !== 0) return byPrimary;
      if (a.logTime !== b.logTime) return a.logTime.localeCompare(b.logTime);
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.source.localeCompare(b.source);
    });

    return filtered;
  }, [records, step2SiteFilter, step2DateFilter, step2NameFilter, step2Sort]);

  const filteredDailyRows = useMemo(() => {
    const nameFilter = step2NameFilter.trim().toLowerCase();
    const dateFilter = step2DateFilter.trim();

    const filtered = dailyRows.filter((row) => {
      if (step2SiteFilter !== "ALL" && row.site !== step2SiteFilter)
        return false;
      if (dateFilter && row.date !== dateFilter) return false;
      if (nameFilter && !row.employee.toLowerCase().includes(nameFilter))
        return false;
      return true;
    });

    filtered.sort((a, b) =>
      compareStep2Rows(a.date, a.employee, b.date, b.employee, step2Sort),
    );

    return filtered;
  }, [dailyRows, step2SiteFilter, step2DateFilter, step2NameFilter, step2Sort]);

  const activeRowsCount =
    step2View === "daily"
      ? filteredDailyRows.length
      : filteredDetailedRecords.length;
  const totalRowsForCurrentView =
    step2View === "daily" ? dailyRows.length : records.length;

  const totalRecordPages = useMemo(
    () => Math.max(1, Math.ceil(activeRowsCount / PREVIEW_LIMIT)),
    [activeRowsCount],
  );

  const previewStart = (recordsPage - 1) * PREVIEW_LIMIT;
  const previewEnd = previewStart + PREVIEW_LIMIT;

  const previewRecords = useMemo(() => {
    return filteredDetailedRecords.slice(previewStart, previewEnd);
  }, [filteredDetailedRecords, previewStart, previewEnd]);

  const previewDailyRows = useMemo(() => {
    return filteredDailyRows.slice(previewStart, previewEnd);
  }, [filteredDailyRows, previewStart, previewEnd]);

  const branchSummaries = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const record of records) {
      const siteKey = record.site?.trim().toUpperCase().split(" ")[0];
      if (!siteKey) continue;
      if (!map.has(siteKey)) {
        map.set(siteKey, new Set<string>());
      }
      map.get(siteKey)!.add(record.employee.trim());
    }
    return Array.from(map.entries())
      .map(([siteName, employeesSet]) => ({
        siteName,
        employeeCount: employeesSet.size,
      }))
      .sort((a, b) => a.siteName.localeCompare(b.siteName));
  }, [records]);

  const overtimeByBranch = useMemo(() => {
    const map = new Map<string, number>();

    employees.forEach((emp) => {
      const rec = records.find(
        (r) =>
          r.employee.trim().toLowerCase() === emp.name.trim().toLowerCase(),
      );

      const branch = rec?.site?.split(" ")[0] ?? "Unknown";

      map.set(branch, (map.get(branch) ?? 0) + emp.otHours);
    });

    return Array.from(map.entries())
      .map(([branch, hours]) => ({
        branch,
        hours: Number(hours.toFixed(2)),
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [employees, records]);

  const workforceByBranch = useMemo(() => {
    const map = new Map<string, Set<string>>();

    records.forEach((r) => {
      const branch = r.site.split(" ")[0];
      if (!map.has(branch)) map.set(branch, new Set());
      map.get(branch)!.add(r.employee);
    });

    return Array.from(map.entries())
      .map(([branch, set]) => ({
        branch,
        employees: set.size,
      }))
      .sort((a, b) => b.employees - a.employees);
  }, [records]);

  const dailyLaborHours = useMemo(() => {
    const map = new Map<string, number>();

    records.forEach((r) => {
      map.set(r.date, (map.get(r.date) ?? 0) + 1);
    });

    return Array.from(map.entries())
      .map(([date, logs]) => ({
        date,
        hours: logs / 2,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [records]);

  const topOTEmployees = useMemo(() => {
    return [...employees]
      .sort((a, b) => b.otHours - a.otHours)
      .slice(0, 5)
      .map((e) => ({
        name: e.name,
        hours: e.otHours,
      }));
  }, [employees]);

  const payrollAttendanceInputs = useMemo<AttendanceRecordInput[]>(() => {
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
  }, [dailyRows]);

  const payrollBaseRows = useMemo<PayrollRow[]>(() => {
    const generated = generatePayroll(payrollAttendanceInputs, {
      roleRates: payrollRoleRates,
      hoursPerDay: HOURS_PER_DAY,
      overtimeMultiplier: DEFAULT_OVERTIME_MULTIPLIER,
    });
    const normalizedPeriod = normalizePeriodLabel(attendancePeriod);
    if (!normalizedPeriod) return generated;
    return generated.map((row) => ({ ...row, date: normalizedPeriod }));
  }, [payrollAttendanceInputs, payrollRoleRates, attendancePeriod]);

  const payrollRows = useMemo<PayrollRow[]>(() => {
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
  }, [payrollBaseRows, payrollOverrides, attendancePeriod]);

  const filteredPayrollRows = useMemo(() => {
    const nameFilter = payrollNameFilter.trim().toLowerCase();
    const dateFilter = payrollDateFilter.trim();

    const filtered = payrollRows.filter((row) => {
      if (
        payrollSiteFilter !== "ALL" &&
        !row.site
          .split(",")
          .map((siteName) => siteName.trim())
          .includes(payrollSiteFilter)
      ) {
        return false;
      }

      if (payrollRoleFilter !== "ALL" && row.role !== payrollRoleFilter) {
        return false;
      }

      if (dateFilter && !row.date.includes(dateFilter)) return false;

      if (nameFilter && !row.worker.toLowerCase().includes(nameFilter))
        return false;

      return true;
    });

    filtered.sort((a, b) => {
      const dateA = a.date.split(" to ")[0] ?? a.date;
      const dateB = b.date.split(" to ")[0] ?? b.date;
      return compareStep2Rows(dateA, a.worker, dateB, b.worker, payrollSort);
    });

    return filtered;
  }, [
    payrollRows,
    payrollSiteFilter,
    payrollNameFilter,
    payrollDateFilter,
    payrollSort,
    payrollRoleFilter,
  ]);

  const filteredPayrollLogs = useMemo(() => {
    const nameFilter = payrollNameFilter.trim().toLowerCase();
    const dateFilter = payrollDateFilter.trim();

    const filtered = payrollAttendanceInputs.filter((record) => {
      if (payrollSiteFilter !== "ALL" && record.site !== payrollSiteFilter)
        return false;

      if (payrollRoleFilter !== "ALL" && record.role !== payrollRoleFilter)
        return false;

      if (dateFilter && record.date !== dateFilter) return false;

      if (nameFilter && !record.name.toLowerCase().includes(nameFilter))
        return false;

      return true;
    });

    filtered.sort((a, b) =>
      compareStep2Rows(a.date, a.name, b.date, b.name, payrollSort),
    );

    return filtered;
  }, [
    payrollAttendanceInputs,
    payrollSiteFilter,
    payrollNameFilter,
    payrollDateFilter,
    payrollSort,
    payrollRoleFilter,
  ]);

  const payrollActiveRowsCount =
    payrollTab === "payroll"
      ? filteredPayrollRows.length
      : filteredPayrollLogs.length;
  const payrollTotalPages = useMemo(
    () => Math.max(1, Math.ceil(payrollActiveRowsCount / PREVIEW_LIMIT)),
    [payrollActiveRowsCount],
  );
  const payrollPreviewStart = (payrollPage - 1) * PREVIEW_LIMIT;
  const payrollPreviewEnd = payrollPreviewStart + PREVIEW_LIMIT;

  const payrollPreviewRows = useMemo(() => {
    return filteredPayrollRows.slice(payrollPreviewStart, payrollPreviewEnd);
  }, [filteredPayrollRows, payrollPreviewStart, payrollPreviewEnd]);

  const payrollPreviewLogs = useMemo(() => {
    return filteredPayrollLogs.slice(payrollPreviewStart, payrollPreviewEnd);
  }, [filteredPayrollLogs, payrollPreviewStart, payrollPreviewEnd]);

  const payrollTotals = useMemo(() => {
    return filteredPayrollRows.reduce(
      (acc, row) => {
        acc.hours += row.hoursWorked;
        acc.pay += row.totalPay;
        return acc;
      },
      { hours: 0, pay: 0 },
    );
  }, [filteredPayrollRows]);

  const editingPayrollRow = useMemo(
    () => payrollRows.find((row) => row.id === editingPayrollRowId) ?? null,
    [payrollRows, editingPayrollRowId],
  );

  const editingPayrollLogs = useMemo(() => {
    if (!editingPayrollRow) return [] as DailyLogRow[];

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
  }, [dailyRows, editingPayrollRow, attendancePeriod]);

  const editingPayrollSummary = useMemo(() => {
    if (!editingPayrollRow) {
      return {
        attendanceDays: 0,
        absenceDays: 0,
        regularHours: 0,
        otNormalHours: 0,
      };
    }

    const attendanceDays = editingPayrollLogs.filter(
      (log) => log.hours > 0,
    ).length;
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
  }, [editingPayrollLogs, editingPayrollRow]);

  const editingPayrollLogsForAnalytics = useMemo(() => {
    return editingPayrollLogs.map((log) => {
      const key = getLogOverrideKey(log);
      return {
        ...log,
        hours: logHourOverrides[key] ?? log.hours,
      };
    });
  }, [editingPayrollLogs, logHourOverrides]);

  const hasLogHourOverrides = useMemo(
    () =>
      Object.values(logHourOverrides).some(
        (value) => Number.isFinite(value) && value >= 0,
      ),
    [logHourOverrides],
  );

  const totalEditedLogHours = useMemo(() => {
    const hours = editingPayrollLogsForAnalytics.reduce(
      (sum, log) => sum + log.hours,
      0,
    );
    return Math.round(hours * 100) / 100;
  }, [editingPayrollLogsForAnalytics]);

  const employeeDailyHoursTrend = useMemo(() => {
    return editingPayrollLogsForAnalytics.map((log) => ({
      date: toShortDateLabel(log.date),
      isoDate: log.date,
      hoursWorked: Math.round(log.hours * 100) / 100,
    }));
  }, [editingPayrollLogsForAnalytics]);

  const employeeAttendanceBreakdown = useMemo(() => {
    const attendanceDays = editingPayrollLogsForAnalytics.filter(
      (log) => log.hours > 0,
    ).length;
    const absences = Math.max(
      editingPayrollLogsForAnalytics.length - attendanceDays,
      0,
    );
    const leaveDays = 0;
    const businessTripDays = 0;

    return [
      { name: "Attendance", value: attendanceDays },
      { name: "Absences", value: absences },
      { name: "Leave", value: leaveDays },
      { name: "Business Trip", value: businessTripDays },
    ];
  }, [editingPayrollLogsForAnalytics]);

  const employeeClockInConsistency = useMemo(() => {
    return editingPayrollLogsForAnalytics.map((log) => {
      const firstIn = earliestNonEmptyTime(log.time1In, log.time2In);
      const parsed = firstIn ? parseTimeToDecimal(firstIn) : null;
      return {
        date: toShortDateLabel(log.date),
        isoDate: log.date,
        timeIn: parsed ?? 0,
        timeInLabel: firstIn || "Missed",
      };
    });
  }, [editingPayrollLogsForAnalytics]);

  const payrollEditPreview = useMemo(() => {
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
  }, [
    editingPayrollRow,
    payrollEditDraft,
    hasLogHourOverrides,
    totalEditedLogHours,
  ]);

  const handleParsed = useCallback((result: ParseResult) => {
    setEmployees(result.employees);
    setRecords(result.records);
    setAttendancePeriod(result.period);
    setStep2View("daily");
    setStep2Sort("date-asc");
    setStep2SiteFilter("ALL");
    setStep2NameFilter("");
    setStep2DateFilter("");
    setRecordsPage(1);
    setSite(result.site);
    setPayrollOverrides({});
    setPayrollGenerated(false);
    setPayrollTab("payroll");
    setPayrollPage(1);
    setPayrollSiteFilter("ALL");
    setPayrollNameFilter("");
    setPayrollDateFilter("");
    setPayrollSort("date-asc");
    setEditingPayrollRowId(null);
    setPayrollEditDraft(null);
    setStep(2);
  }, []);

  function handleReset() {
    setRecords([]);
    setStep2View("daily");
    setStep2Sort("date-asc");
    setStep2SiteFilter("ALL");
    setStep2NameFilter("");
    setStep2DateFilter("");
    setRecordsPage(1);
    setSite("Unknown Site");
    setAttendancePeriod("Current Period");
    setPayrollOverrides({});
    setPayrollGenerated(false);
    setPayrollTab("payroll");
    setPayrollPage(1);
    setPayrollSiteFilter("ALL");
    setPayrollNameFilter("");
    setPayrollDateFilter("");
    setPayrollSort("date-asc");
    setShowPayrollRateModal(false);
    setEditingPayrollRowId(null);
    setPayrollEditDraft(null);
    setStep(1);
  }

  function handleGeneratePayroll() {
    if (payrollRows.length === 0) return;
    setPayrollSaveNotice(null);
    setPayrollGenerated(true);
    setPayrollTab("payroll");
    setPayrollPage(1);
    setPayrollSiteFilter("ALL");
    setPayrollNameFilter("");
    setPayrollDateFilter("");
    setPayrollSort("date-asc");
    setStep(3);
  }

  function handleExportPayroll() {
    if (filteredPayrollRows.length === 0) return;
    exportPayrollToExcel(filteredPayrollRows);
  }

  function openPayrollRateModal() {
    setPayrollRateDraft({ ...payrollRoleRates });
    setShowPayrollRateModal(true);
    document.body.style.overflow = "hidden";
  }
  function applyPayrollRates() {
    setPayrollRoleRates({ ...payrollRateDraft });
    setShowPayrollRateModal(false);
    document.body.style.overflow = "auto";
  }

  function clearPayrollFilters() {
    setPayrollSiteFilter("ALL");
    setPayrollNameFilter("");
    setPayrollDateFilter("");
    setPayrollSort("date-asc");
    setPayrollRoleFilter("ALL");
  }

  function openPayrollEditModal(row: PayrollRow) {
    const existingOverride = payrollOverrides[row.id];
    const normalizedPeriod = normalizePeriodLabel(attendancePeriod);
    setPayrollSaveNotice(null);
    setEditingPayrollRowId(row.id);
    setLogHourOverrides(existingOverride?.logHours ?? {});
    setPayrollEditDraft({
      date: normalizedPeriod ?? row.date,
      hoursWorked: String(row.hoursWorked),
      rate: row.customRate === null ? "" : String(row.customRate),
      overtimeHours: String(row.overtimeHours),
    });
    document.body.style.overflow = "hidden";
  }

  function closePayrollEditModal() {
    setEditingPayrollRowId(null);
    setPayrollEditDraft(null);
    setLogHourOverrides({});
    document.body.style.overflow = "auto";
  }

  function savePayrollEdit() {
    if (!editingPayrollRow || !payrollEditDraft) return;

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
    const nextLogHours =
      hasLogHourOverrides && editingPayrollLogs.length > 0
        ? Object.fromEntries(
            editingPayrollLogs.map((log) => {
              const key = getLogOverrideKey(log);
              const value = logHourOverrides[key] ?? log.hours;
              const normalized =
                Number.isFinite(value) && value >= 0
                  ? Math.round(value * 100) / 100
                  : 0;
              return [key, normalized];
            }),
          )
        : undefined;

    const normalizedPeriod = normalizePeriodLabel(attendancePeriod);
    setPayrollOverrides((prev) => ({
      ...prev,
      [editingPayrollRow.id]: {
        date: normalizedPeriod ?? payrollEditDraft.date.trim(),
        hoursWorked: nextHours,
        overtimeHours: nextOvertime,
        customRate: nextCustomRate,
        logHours: nextLogHours,
      },
    }));
    setPayrollSaveNotice(
      `Saved ${editingPayrollRow.worker}: ${formatPayrollNumber(nextHours)} hours`,
    );

    closePayrollEditModal();
  }

  const step2Pages = useMemo(() => {
    const arr = [];
    const maxVisible = 5;

    let start = Math.max(1, recordsPage - 2);
    let end = Math.min(totalRecordPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      arr.push(i);
    }

    return arr;
  }, [recordsPage, totalRecordPages]);

  const payrollPages = useMemo(() => {
    const arr = [];
    const maxVisible = 5;

    let start = Math.max(1, payrollPage - 2);
    let end = Math.min(payrollTotalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      arr.push(i);
    }

    return arr;
  }, [payrollPage, payrollTotalPages]);

  useEffect(() => {
    setRecordsPage((prev) => Math.min(prev, totalRecordPages));
  }, [totalRecordPages]);

  useEffect(() => {
    setPayrollPage((prev) => Math.min(prev, payrollTotalPages));
  }, [payrollTotalPages]);

  useEffect(() => {
    setRecordsPage(1);
  }, [step2View, step2Sort, step2SiteFilter, step2NameFilter, step2DateFilter]);

  useEffect(() => {
    setPayrollPage(1);
  }, [
    payrollTab,
    payrollSiteFilter,
    payrollNameFilter,
    payrollDateFilter,
    payrollSort,
  ]);

  useEffect(() => {
    if (!payrollEditDraft || !editingPayrollRowId || !hasLogHourOverrides) {
      return;
    }

    const nextHoursText = String(totalEditedLogHours);
    if (payrollEditDraft.hoursWorked === nextHoursText) return;

    setPayrollEditDraft((prev) =>
      prev ? { ...prev, hoursWorked: nextHoursText } : prev,
    );
  }, [
    payrollEditDraft,
    editingPayrollRowId,
    hasLogHourOverrides,
    totalEditedLogHours,
  ]);

  useEffect(() => {
    if (
      step2SiteFilter !== "ALL" &&
      !availableSites.includes(step2SiteFilter)
    ) {
      setStep2SiteFilter("ALL");
    }

    if (
      payrollSiteFilter !== "ALL" &&
      !availableSites.includes(payrollSiteFilter)
    ) {
      setPayrollSiteFilter("ALL");
    }
  }, [availableSites, step2SiteFilter, payrollSiteFilter]);

  useEffect(() => {
    if (step === 2) {
      window.scrollTo({ top: 500, behavior: "smooth" });
    }
  }, [step]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/") {
        e.preventDefault();
        if (step === 3 && payrollGenerated) {
          document.getElementById("searchPayrollEmployee")?.focus();
        } else {
          document.getElementById("searchEmployee")?.focus();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step, payrollGenerated]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        if (step === 3 && payrollGenerated) {
          setPayrollPage((p) => Math.min(payrollTotalPages, p + 1));
        } else {
          setRecordsPage((p) => Math.min(totalRecordPages, p + 1));
        }
      }
      if (e.key === "ArrowLeft") {
        if (step === 3 && payrollGenerated) {
          setPayrollPage((p) => Math.max(1, p - 1));
        } else {
          setRecordsPage((p) => Math.max(1, p - 1));
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step, payrollGenerated, payrollTotalPages, totalRecordPages]);

  useEffect(() => {
    const validIds = new Set(payrollBaseRows.map((row) => row.id));
    setPayrollOverrides((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([id]) => validIds.has(id)),
      );
      return Object.keys(next).length === Object.keys(prev).length
        ? prev
        : next;
    });
  }, [payrollBaseRows]);

  return (
    <div className="min-h-screen bg-apple-snow">
      <Nav step={step} handleReset={handleReset} />

      <div className="md:hidden border-b border-apple-mist bg-white px-5 py-3">
        <StepIndicator current={step} />
      </div>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* Step 1: Upload Attendance Reports */}
        <section
          className="animate-fade-up"
          style={{ animationFillMode: "both" }}
        >
          <div className="bg-white rounded-3xl border border-apple-mist shadow-apple-xs overflow-hidden">
            <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6 border-b border-apple-mist flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xs font-mono font-semibold text-apple-steel uppercase tracking-widest">
                    Step 1
                  </span>
                  {step > 1 && (
                    <span className="text-2xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                      Complete
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-apple-charcoal tracking-tight">
                  Upload Attendance Reports
                </h2>
                <p className="text-sm text-apple-smoke mt-1">
                  Upload one or more biometric attendance exports as XLS, XLSX,
                  or CSV.
                </p>
              </div>
            </div>

            <div
              className={`px-5 sm:px-8 py-6 sm:py-8 transition-opacity duration-300 ${step > 1 ? "opacity-50 pointer-events-none" : ""}`}
            >
              <UploadZone onParsed={handleParsed} />
            </div>
          </div>
        </section>
        {/* Step 2: Review Attendance Logs */}
        {step >= 2 && (
          <section
            className="animate-fade-up"
            style={{ animationFillMode: "both", animationDelay: "40ms" }}
          >
            <div className="bg-white rounded-3xl border border-apple-mist shadow-apple-xs overflow-hidden">
              <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6 border-b border-apple-mist">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-2xs font-mono font-semibold text-apple-steel uppercase tracking-widest">
                    Step 2
                  </span>
                  <span className="text-2xs font-semibold text-apple-smoke bg-apple-snow px-2 py-0.5 rounded-full border border-apple-mist">
                    {site}
                  </span>
                  {step > 2 && (
                    <span className="text-2xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                      Complete
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-apple-charcoal tracking-tight">
                  Review Attendance Logs
                </h2>
                <p className="text-sm text-apple-smoke mt-1">
                  Your biometric files are cleaned and converted into readable
                  daily time logs.
                </p>
              </div>

              <div className="px-5 sm:px-8 py-6 sm:py-8 space-y-5">
                {branchSummaries.length > 0 && (
                  <div className="rounded-2xl border border-apple-mist bg-white px-5 py-4">
                    <p className="text-2xs font-semibold text-apple-steel uppercase tracking-widest mb-4">
                      Branch Summary
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {branchSummaries.map((branch, i) => (
                        <motion.div
                          key={branch.siteName}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="rounded-xl border border-apple-mist bg-apple-snow px-4 py-3 hover:shadow-sm transition"
                        >
                          <p className="text-[11px] text-apple-steel uppercase tracking-wider">
                            Branch
                          </p>

                          <p className="text-sm font-semibold text-apple-charcoal mt-1">
                            {branch.siteName.split(" ")[0]}
                          </p>

                          <p className="text-sm text-apple-steel mt-1">
                            {branch.employeeCount}{" "}
                            {branch.employeeCount === 1
                              ? "employee"
                              : "employees"}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {records.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setStep2View("daily");
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150
                        ${
                          step2View === "daily"
                            ? "bg-apple-charcoal text-white border-apple-charcoal"
                            : "bg-white text-apple-charcoal border-apple-silver hover:border-apple-charcoal"
                        }`}
                    >
                      Daily View
                    </button>
                    <button
                      onClick={() => {
                        setStep2View("detailed");
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150
                        ${
                          step2View === "detailed"
                            ? "bg-apple-charcoal text-white border-apple-charcoal"
                            : "bg-white text-apple-charcoal border-apple-silver hover:border-apple-charcoal"
                        }`}
                    >
                      Detailed Logs
                    </button>
                  </div>
                )}

                {records.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <select
                      value={step2SiteFilter}
                      onChange={(e) => setStep2SiteFilter(e.target.value)}
                      className="w-full px-3 h-10 rounded-2xl border border-apple-silver  hover:border-apple-charcoal cursor-pointer bg-white text-sm text-apple-charcoal
                        focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal transition-all"
                    >
                      <option value="ALL">All files/sites</option>
                      {availableSites.map((siteOption) => (
                        <option key={siteOption} value={siteOption}>
                          {siteOption}
                        </option>
                      ))}
                    </select>

                    <div className="relative w-full">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-silver"
                        size={16}
                      />

                      <input
                        type="text"
                        value={step2NameFilter}
                        onChange={(e) => setStep2NameFilter(e.target.value)}
                        placeholder="Search employee… ( / )"
                        id="searchEmployee"
                        className="w-full hover:border-apple-charcoal pl-9 pr-9 py-2.5 rounded-2xl border border-apple-silver bg-white text-sm"
                      />

                      {step2NameFilter && (
                        <button
                          onClick={() => setStep2NameFilter("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-apple-steel"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <input
                      type="date"
                      value={step2DateFilter}
                      onChange={(e) => setStep2DateFilter(e.target.value)}
                      className="w-full hover:border-apple-charcoal px-3 h-10 rounded-2xl border border-apple-silver bg-white text-sm text-apple-charcoal
                        focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal transition-all"
                    />

                    <select
                      value={step2Sort}
                      onChange={(e) =>
                        setStep2Sort(e.target.value as Step2Sort)
                      }
                      className="w-full px-3 h-10 rounded-2xl border border-apple-silver hover:border-apple-charcoal cursor-pointer bg-white text-sm text-apple-charcoal
                        focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal transition-all"
                    >
                      <option value="date-asc">Date first (oldest)</option>
                      <option value="date-desc">Date first (newest)</option>
                      <option value="name-asc">Name first (A-Z)</option>
                      <option value="name-desc">Name first (Z-A)</option>
                    </select>

                    <button
                      onClick={() => {
                        setStep2SiteFilter("ALL");
                        setStep2NameFilter("");
                        setStep2DateFilter("");
                        setStep2Sort("date-asc");
                      }}
                      className="w-full px-3 h-10 rounded-2xl border border-apple-silver bg-white text-sm font-semibold text-apple-charcoal
                        hover:border-apple-charcoal transition-all"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}

                {records.length > 0 ? (
                  step2View === "daily" ? (
                    <div className="rounded-3xl border border-apple-mist bg-white shadow-apple-xs w-full">
                      <table className="w-full text-sm table-auto">
                        <thead>
                          <tr className="border-b border-apple-mist">
                            {[
                              "Date",
                              "Employee",
                              "Time1 In",
                              "Time1 Out",
                              "Time2 In",
                              "Time2 Out",
                              "OT In",
                              "OT Out",
                              "Hrs",
                              "Site",
                            ].map((h) => (
                              <th
                                key={h}
                                className="px-4 py-3.5 text-left text-2xs font-semibold uppercase tracking-widest text-apple-steel"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewDailyRows.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="py-10">
                                <div className="flex flex-col items-center justify-center text-center gap-3 text-apple-steel">
                                  <Search
                                    size={22}
                                    className="text-apple-silver"
                                  />

                                  <p className="text-sm font-semibold text-apple-charcoal">
                                    No employees found
                                  </p>

                                  <p className="text-xs text-apple-steel max-w-sm">
                                    Try clearing filters, searching another
                                    name, or changing the date.
                                  </p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            previewDailyRows.map((row) => (
                              <tr
                                key={`${row.date}-${row.employee}`}
                                className="border-b border-apple-mist/60 last:border-0 odd:bg-apple-snow/40 hover:bg-apple-snow/70 transition"
                              >
                                <td className="px-4 py-3 text-sm  text-apple-ash">
                                  {row.date}
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                                  {highlight(row.employee, step2NameFilter)}
                                </td>
                                <td className="px-4 py-3 text-sm  text-apple-ash">
                                  {row.time1In ? (
                                    row.time1In
                                  ) : (
                                    <span className="text-red-500 ">
                                      Missed
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm  text-apple-ash">
                                  {row.time1Out ? (
                                    row.time1Out
                                  ) : (
                                    <span className="text-red-500 ">
                                      Missed
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm  text-apple-ash">
                                  {row.time2In ? (
                                    row.time2In
                                  ) : (
                                    <span className="text-red-500 ">
                                      Missed
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm  text-apple-ash">
                                  {row.time2Out ? (
                                    row.time2Out
                                  ) : (
                                    <span className="text-red-500 ">
                                      Missed
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm  text-apple-ash">
                                  {row.otIn || "--:--"}
                                </td>
                                <td className="px-4 py-3 text-sm  text-apple-ash">
                                  {row.otOut || "--:--"}
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                                  {row.hours.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-xs text-apple-smoke">
                                  {row.site.split(" ")[0]}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-3xl border border-apple-mist bg-white shadow-apple-xs [-webkit-overflow-scrolling:touch]">
                      <table className="w-full text-sm table-auto">
                        <thead>
                          <tr className="border-b border-apple-mist">
                            {[
                              "Date",
                              "Employee",
                              "Log Time",
                              "Type",
                              "Source",
                              "Site",
                            ].map((h) => (
                              <th
                                key={h}
                                className="px-4 py-3.5 text-left text-2xs font-semibold uppercase tracking-widest text-apple-steel"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRecords.map((r, idx) => (
                            <tr
                              key={`${r.employee}-${r.date}-${r.logTime}-${r.type}-${idx}`}
                              className="border-b border-apple-mist/60 last:border-0 odd:bg-apple-snow/40 hover:bg-apple-snow/70 transition"
                            >
                              <td className="px-4 py-3 text-sm font-mono text-apple-ash">
                                {r.date}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                                {r.employee}
                              </td>
                              <td className="px-4 py-3 text-sm font-mono text-apple-ash">
                                {r.logTime}
                              </td>
                              <td className="px-4 py-3 text-xs font-semibold text-apple-charcoal">
                                {r.type}
                              </td>
                              <td className="px-4 py-3 text-xs font-semibold text-apple-steel">
                                {r.source}
                              </td>
                              <td className="px-4 py-3 text-xs text-apple-smoke">
                                {r.site}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-apple-smoke">
                    No detailed time logs detected. Upload a raw biometric
                    attendance sheet with Date/Week or Date/Weekday and IN/OUT
                    time columns.
                  </p>
                )}

                {activeRowsCount > 0 && (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-apple-steel">
                      Showing {previewStart + 1}-
                      {Math.min(previewEnd, activeRowsCount)} of{" "}
                      {activeRowsCount}{" "}
                      {step2View === "daily"
                        ? "employee-day rows"
                        : "cleaned logs"}
                      {activeRowsCount !== totalRowsForCurrentView
                        ? ` (filtered from ${totalRowsForCurrentView}).`
                        : "."}
                    </p>

                    {activeRowsCount > PREVIEW_LIMIT && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {/* First */}
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.05 }}
                          onClick={() => setRecordsPage(1)}
                          disabled={recordsPage === 1}
                          className={`px-2.5 h-8 rounded-xl text-xs font-semibold border
      ${
        recordsPage === 1
          ? "border-apple-mist text-apple-silver cursor-not-allowed"
          : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
      }`}
                        >
                          First
                        </motion.button>

                        {/* Previous */}
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.05 }}
                          onClick={() =>
                            setRecordsPage((p) => Math.max(1, p - 1))
                          }
                          disabled={recordsPage === 1}
                          className={`px-3 h-8 rounded-xl text-xs font-semibold border
      ${
        recordsPage === 1
          ? "border-apple-mist text-apple-silver cursor-not-allowed"
          : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
      }`}
                        >
                          <ArrowLeft size={16} />
                        </motion.button>

                        {/* Page numbers */}
                        {step2Pages.map((p) => (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            whileHover={{ scale: 1.05 }}
                            key={p}
                            onClick={() => setRecordsPage(p)}
                            className={`w-8 h-8 rounded-lg text-xs font-semibold border transition
        ${
          recordsPage === p
            ? "bg-apple-charcoal text-white border-apple-charcoal"
            : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
        }`}
                          >
                            {p}
                          </motion.button>
                        ))}

                        {/* Next */}
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.05 }}
                          onClick={() =>
                            setRecordsPage((p) =>
                              Math.min(totalRecordPages, p + 1),
                            )
                          }
                          disabled={recordsPage === totalRecordPages}
                          className={`px-3 h-8 rounded-xl text-xs font-semibold border
      ${
        recordsPage === totalRecordPages
          ? "border-apple-mist text-apple-silver cursor-not-allowed"
          : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
      }`}
                        >
                          <ArrowRight size={16} />
                        </motion.button>

                        {/* Last */}
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.05 }}
                          onClick={() => setRecordsPage(totalRecordPages)}
                          disabled={recordsPage === totalRecordPages}
                          className={`px-2.5 h-8 rounded-xl text-xs font-semibold border
      ${
        recordsPage === totalRecordPages
          ? "border-apple-mist text-apple-silver cursor-not-allowed"
          : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
      }`}
                        >
                          Last
                        </motion.button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Charts */}
        {employees.length > 0 && records.length > 0 && (
          <section
            className="animate-fade-up"
            style={{ animationFillMode: "both", animationDelay: "40ms" }}
          >
            <div className="bg-white rounded-3xl border border-[#F5F5F7] shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6 border-b border-[#F5F5F7]">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] font-mono font-semibold text-[#86868B] uppercase tracking-widest">
                    Data Analytics
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#1D1D1F] tracking-tight">
                  Visualized Attendance Data
                </h2>
                <p className="text-sm text-[#86868B] mt-1">
                  Overview of labor distribution and overtime trends across all
                  sites.
                </p>
              </div>

              {/* Content Area */}
              <div className="px-5 sm:px-8 py-6 sm:py-8 space-y-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Overtime Hours */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider ">
                      Overtime Hours by Branch
                    </h3>
                    <div className="h-[300px] w-full bg-white rounded-2xl border border-[#F5F5F7] p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={overtimeByBranch}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <XAxis
                            dataKey="branch"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#86868B", fontSize: 11 }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#86868B", fontSize: 11 }}
                          />
                          <Tooltip
                            cursor={{ fill: "#F5F5F7" }}
                            content={(props) => (
                              <ChartTooltip {...props} unit="OT hours" />
                            )}
                          />
                          <Bar
                            dataKey="hours"
                            fill="#1D1D1F"
                            radius={[4, 4, 0, 0]}
                            barSize={48}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Workforce */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider">
                      Employees per Branch
                    </h3>
                    <div className="h-[300px] w-full bg-white rounded-2xl border border-[#F5F5F7] p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={workforceByBranch}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <XAxis
                            dataKey="branch"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#86868B", fontSize: 11 }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#86868B", fontSize: 11 }}
                          />
                          <Tooltip
                            cursor={{ fill: "#F5F5F7" }}
                            content={(props) => (
                              <ChartTooltip {...props} unit="employees" />
                            )}
                          />
                          <Bar
                            dataKey="employees"
                            fill="#1D1D1F"
                            radius={[4, 4, 0, 0]}
                            barSize={48}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Interactive Daily Labor Utilization */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider">
                        Daily Labor Attendance{" "}
                      </h3>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-[#1D1D1F]"></div>
                          <span className="text-[10px] font-medium text-[#1D1D1F]">
                            Current Period
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="h-[360px] w-full bg-white rounded-2xl border border-[#F5F5F7] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={dailyLaborHours}
                          margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                          onMouseMove={(e) => {
                            /* You can hook into state here for custom hover effects elsewhere */
                          }}
                        >
                          <defs>
                            <linearGradient
                              id="colorHours"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#1D1D1F"
                                stopOpacity={0.15}
                              />
                              <stop
                                offset="95%"
                                stopColor="#1D1D1F"
                                stopOpacity={0.01}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#F5F5F7"
                          />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fill: "#86868B",
                              fontSize: 10,
                              fontWeight: 500,
                            }}
                            dy={10}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#86868B", fontSize: 10 }}
                          />
                          <Tooltip
                            cursor={{
                              stroke: "#1D1D1F",
                              strokeWidth: 2,
                              strokeDasharray: "6 6",
                            }}
                            content={(props) => (
                              <ChartTooltip {...props} unit="hrs utilized" />
                            )}
                          />
                          <Area
                            type="monotone"
                            dataKey="hours"
                            stroke="#1D1D1F"
                            strokeWidth={1}
                            fillOpacity={1}
                            fill="url(#colorHours)"
                            dot={{
                              r: 3,
                              fill: "#1D1D1F",
                              stroke: "#fff",
                              strokeWidth: 1,
                            }}
                            activeDot={{
                              r: 5,
                              fill: "#1D1D1F",
                              stroke: "#fff",
                              strokeWidth: 2,
                              style: {
                                filter:
                                  "drop-shadow(0px 2px 4px rgba(0,0,0,0.2))",
                              },
                            }}
                            animationBegin={200}
                            animationDuration={1200}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top OT Employees */}
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider">
                      Top Overtime Performers
                    </h3>
                    <div className="h-[350px] w-full bg-white rounded-2xl border border-[#F5F5F7] p-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topOTEmployees}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        >
                          <XAxis type="number" hide />
                          <YAxis
                            dataKey="name"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fill: "#1D1D1F",
                              fontSize: 12,
                              fontWeight: 500,
                            }}
                            width={140}
                          />
                          <Tooltip
                            cursor={{ fill: "#F5F5F7" }}
                            content={(props) => (
                              <ChartTooltip {...props} unit="overtime hrs" />
                            )}
                          />
                          <Bar
                            dataKey="hours"
                            fill="#1D1D1F"
                            radius={[0, 4, 4, 0]}
                            barSize={32}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {dailyRows.length > 0 && (
          <section
            className="animate-fade-up"
            style={{ animationFillMode: "both", animationDelay: "80ms" }}
          >
            <div className="bg-white rounded-3xl border border-apple-mist shadow-apple-xs overflow-hidden">
              <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6 border-b border-apple-mist flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xs font-mono font-semibold text-apple-steel uppercase tracking-widest">
                      Step 3
                    </span>
                    {payrollGenerated && (
                      <span className="text-2xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                        Complete
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-apple-charcoal tracking-tight">
                    Generate Payroll
                  </h2>
                  <p className="text-sm text-apple-smoke mt-1">
                    Generate payroll after reviewing attendance logs.
                  </p>
                  {payrollSaveNotice && (
                    <p className="mt-2 text-xs font-semibold text-green-700">
                      {payrollSaveNotice}
                    </p>
                  )}
                </div>

                {!payrollGenerated && (
                  <button
                    type="button"
                    onClick={handleGeneratePayroll}
                    disabled={payrollRows.length === 0}
                    className="px-5 py-3 rounded-2xl bg-apple-charcoal text-white text-sm font-semibold hover:bg-apple-black transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Calculator size={18} />
                    Generate Payroll
                  </button>
                )}
              </div>

              {payrollGenerated && (
                <div className="px-5 sm:px-8 py-6 sm:py-8 space-y-5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setPayrollTab("payroll")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150
                        ${
                          payrollTab === "payroll"
                            ? "bg-apple-charcoal text-white border-apple-charcoal"
                            : "bg-white text-apple-charcoal border-apple-silver hover:border-apple-charcoal"
                        }`}
                    >
                      Payroll Summary
                    </button>
                    <button
                      onClick={() => setPayrollTab("logs")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150
                        ${
                          payrollTab === "logs"
                            ? "bg-apple-charcoal text-white border-apple-charcoal"
                            : "bg-white text-apple-charcoal border-apple-silver hover:border-apple-charcoal"
                        }`}
                    >
                      Attendance Logs
                    </button>

                    <div className="ml-auto flex gap-2">
                      <button
                        type="button"
                        onClick={handleExportPayroll}
                        disabled={filteredPayrollRows.length === 0}
                        className="px-3.5 py-2 rounded-xl border border-apple-silver text-xs font-semibold text-apple-ash hover:border-apple-charcoal transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Export Excel
                      </button>
                      <button
                        type="button"
                        onClick={openPayrollRateModal}
                        className="px-3.5 py-2 rounded-xl border border-apple-silver text-xs font-semibold text-apple-ash hover:border-apple-charcoal transition"
                      >
                        Edit Rates
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    <select
                      value={payrollSiteFilter}
                      onChange={(e) => setPayrollSiteFilter(e.target.value)}
                      className="w-full px-3 h-10 rounded-2xl border border-apple-silver  hover:border-apple-charcoal cursor-pointer bg-white text-sm text-apple-charcoal
                        focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal transition-all"
                    >
                      <option value="ALL">All files/sites</option>
                      {availableSites.map((siteOption) => (
                        <option key={siteOption} value={siteOption}>
                          {siteOption}
                        </option>
                      ))}
                    </select>

                    <select
                      value={payrollRoleFilter}
                      onChange={(e) =>
                        setPayrollRoleFilter(e.target.value as RoleCode | "ALL")
                      }
                      className="w-full h-10 px-3 rounded-2xl border border-apple-silver
  focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15
  focus:border-apple-charcoal hover:border-apple-charcoal cursor-pointer text-sm text-apple-charcoal bg-white"
                    >
                      <option value="ALL">All Roles</option>

                      {ROLE_CODES.map((role) => (
                        <option key={role} value={role}>
                          {role} - {ROLE_CODE_TO_NAME[role]}
                        </option>
                      ))}
                    </select>

                    <div className="relative w-full">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-silver"
                        size={16}
                      />

                      <input
                        type="text"
                        value={payrollNameFilter}
                        onChange={(e) => setPayrollNameFilter(e.target.value)}
                        placeholder="Search employee… ( / )"
                        id="searchPayrollEmployee"
                        className="w-full  hover:border-apple-charcoal h-10 pl-9 pr-3 rounded-2xl border border-apple-silver
                          focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal
                          text-sm text-apple-charcoal placeholder:text-apple-silver transition-all"
                      />
                    </div>

                    <input
                      type="date"
                      value={payrollDateFilter}
                      onChange={(e) => setPayrollDateFilter(e.target.value)}
                      className="w-full h-10 hover:border-apple-charcoal px-3 rounded-2xl border border-apple-silver
                        focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal
                        text-sm text-apple-charcoal placeholder:text-apple-silver transition-all"
                    />

                    <select
                      value={payrollSort}
                      onChange={(e) =>
                        setPayrollSort(e.target.value as Step2Sort)
                      }
                      className="w-full h-10 px-3 rounded-2xl border border-apple-silver
                        focus:outline-none hover:border-apple-charcoal cursor-pointer  focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal
                        text-sm text-apple-charcoal bg-white transition-all"
                    >
                      <option value="date-asc">Date first (oldest)</option>
                      <option value="date-desc">Date first (latest)</option>
                      <option value="name-asc">Name A-Z</option>
                      <option value="name-desc">Name Z-A</option>
                    </select>

                    <button
                      type="button"
                      onClick={clearPayrollFilters}
                      className="w-full h-10 rounded-2xl border border-apple-silver text-sm font-semibold text-apple-ash hover:border-apple-charcoal transition-all"
                    >
                      Clear Filters
                    </button>
                  </div>

                  {payrollTab === "payroll" ? (
                    <div className="overflow-x-auto rounded-3xl border border-apple-mist bg-white shadow-apple-xs [-webkit-overflow-scrolling:touch]">
                      <table className="w-full text-sm table-auto min-w-[900px]">
                        <thead>
                          <tr className="border-b border-apple-mist">
                            {[
                              "Worker",
                              "Role",
                              "Site",
                              "Date",
                              "Hours",
                              "Rate",
                              "Total Pay",
                              "Edit",
                            ].map((h) => (
                              <th
                                key={h}
                                className={`px-4 py-3.5 text-2xs font-semibold uppercase tracking-widest text-apple-steel ${
                                  h === "Hours" ||
                                  h === "Rate" ||
                                  h === "Total Pay"
                                    ? "text-right"
                                    : h === "Edit"
                                      ? "text-center"
                                      : "text-left"
                                }`}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {payrollPreviewRows.length === 0 ? (
                            <tr>
                              <td
                                colSpan={8}
                                className="px-4 py-6 text-center text-sm text-apple-smoke"
                              >
                                No payroll rows match the selected filters.
                              </td>
                            </tr>
                          ) : (
                            payrollPreviewRows.map((row) => (
                              <tr
                                key={row.id}
                                className="border-b border-apple-mist/60 last:border-0 odd:bg-apple-snow/40 hover:bg-apple-snow/70 transition"
                              >
                                <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                                  {highlight(row.worker, payrollNameFilter)}
                                </td>

                                <td className="px-4 py-3 text-xs font-semibold text-apple-charcoal">
                                  {row.role}
                                </td>
                                <td className="px-4 py-3 text-xs text-apple-smoke">
                                  {row.site}
                                </td>
                                <td className="px-4 py-3 text-xs text-apple-smoke">
                                  {row.date || "-"}
                                </td>
                                <td className="px-4 py-3 text-sm font-mono text-apple-ash text-right">
                                  {formatPayrollNumber(row.hoursWorked)}
                                </td>
                                <td className="px-4 py-3 text-sm font-mono text-apple-ash text-right">
                                  {formatPayrollNumber(row.rate)}
                                </td>
                                <td className="px-4 py-3 text-sm font-mono text-apple-charcoal font-semibold text-right">
                                  {formatPayrollNumber(row.totalPay)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => openPayrollEditModal(row)}
                                    className="px-3 py-1.5 rounded-lg border border-apple-silver text-2xs font-semibold text-apple-ash hover:border-apple-charcoal transition"
                                  >
                                    Edit
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-apple-silver bg-apple-snow/70">
                            <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                              Summary
                            </td>
                            <td className="px-4 py-3" />
                            <td className="px-4 py-3" />
                            <td className="px-4 py-3" />
                            <td className="px-4 py-3 text-right text-sm font-mono font-semibold text-apple-charcoal">
                              {formatPayrollNumber(payrollTotals.hours)}
                            </td>
                            <td className="px-4 py-3" />
                            <td className="px-4 py-3 text-right text-sm font-mono font-semibold text-apple-charcoal">
                              {formatPayrollNumber(payrollTotals.pay)}
                            </td>
                            <td className="px-4 py-3" />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-3xl border border-apple-mist bg-white shadow-apple-xs [-webkit-overflow-scrolling:touch]">
                      <table className="w-full text-sm table-auto min-w-[760px]">
                        <thead>
                          <tr className="border-b border-apple-mist">
                            {["Worker", "Role", "Site", "Date", "Hours"].map(
                              (h) => (
                                <th
                                  key={h}
                                  className={`px-4 py-3.5 text-2xs font-semibold uppercase tracking-widest text-apple-steel ${
                                    h === "Hours" ? "text-right" : "text-left"
                                  }`}
                                >
                                  {h}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {payrollPreviewLogs.length === 0 ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-4 py-6 text-center text-sm text-apple-smoke"
                              >
                                No attendance logs match the selected filters.
                              </td>
                            </tr>
                          ) : (
                            payrollPreviewLogs.map((record, index) => (
                              <tr
                                key={`${record.role}-${record.name}-${record.date}-${record.site}-${index}`}
                                className="border-b border-apple-mist/60 last:border-0 odd:bg-apple-snow/40 hover:bg-apple-snow/70 transition"
                              >
                                <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                                  {record.name}
                                </td>
                                <td className="px-4 py-3 text-xs font-semibold text-apple-charcoal">
                                  {record.role}
                                </td>
                                <td className="px-4 py-3 text-xs text-apple-smoke">
                                  {record.site}
                                </td>
                                <td className="px-4 py-3 text-xs text-apple-smoke">
                                  {record.date}
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-mono text-apple-ash">
                                  {formatPayrollNumber(record.hours)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm  text-apple-steel">
                      Showing{" "}
                      {payrollActiveRowsCount === 0
                        ? 0
                        : payrollPreviewStart + 1}
                      -{Math.min(payrollPreviewEnd, payrollActiveRowsCount)} of{" "}
                      {payrollActiveRowsCount}{" "}
                      {payrollTab === "payroll"
                        ? "employee payroll rows"
                        : "attendance log rows"}
                      .
                    </p>

                    {payrollActiveRowsCount > PREVIEW_LIMIT && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.05 }}
                          onClick={() => setPayrollPage(1)}
                          disabled={payrollPage === 1}
                          className={`px-2.5 h-8 rounded-xl text-xs font-semibold border
      ${
        payrollPage === 1
          ? "border-apple-mist text-apple-silver cursor-not-allowed"
          : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
      }`}
                        >
                          First
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.05 }}
                          onClick={() =>
                            setPayrollPage((p) => Math.max(1, p - 1))
                          }
                          disabled={payrollPage === 1}
                          className={`px-3 h-8 rounded-xl text-xs font-semibold border
      ${
        payrollPage === 1
          ? "border-apple-mist text-apple-silver cursor-not-allowed"
          : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
      }`}
                        >
                          <ArrowLeft size={16} />
                        </motion.button>

                        {payrollPages.map((p) => (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            whileHover={{ scale: 1.05 }}
                            key={p}
                            onClick={() => setPayrollPage(p)}
                            className={`w-8 h-8 rounded-lg text-xs font-semibold border transition
        ${
          payrollPage === p
            ? "bg-apple-charcoal text-white border-apple-charcoal"
            : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
        }`}
                          >
                            {p}
                          </motion.button>
                        ))}

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.05 }}
                          onClick={() =>
                            setPayrollPage((p) =>
                              Math.min(payrollTotalPages, p + 1),
                            )
                          }
                          disabled={payrollPage === payrollTotalPages}
                          className={`px-3 h-8 rounded-xl text-xs font-semibold border
      ${
        payrollPage === payrollTotalPages
          ? "border-apple-mist text-apple-silver cursor-not-allowed"
          : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
      }`}
                        >
                          <ArrowRight size={16} />
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.05 }}
                          onClick={() => setPayrollPage(payrollTotalPages)}
                          disabled={payrollPage === payrollTotalPages}
                          className={`px-2.5 h-8 rounded-xl text-xs font-semibold border
      ${
        payrollPage === payrollTotalPages
          ? "border-apple-mist text-apple-silver cursor-not-allowed"
          : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
      }`}
                        >
                          Last
                        </motion.button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {payrollTab === "payroll" && (
          <PayrollInsightsDashboard
            payrollRows={payrollRows}
            attendanceRows={payrollAttendanceInputs}
          />
        )}
      </main>

      {showPayrollRateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl rounded-2xl border border-apple-mist bg-white shadow-apple-xs p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-apple-charcoal">
                Edit Role Rates
              </h3>
              <p className="text-sm text-apple-smoke">
                Hourly rate is calculated as daily rate / 8.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLE_CODES.map((roleCode) => (
                <label key={roleCode} className="space-y-1.5">
                  <span className="text-xs font-semibold text-apple-steel uppercase tracking-wider">
                    {roleCode} - {ROLE_CODE_TO_NAME[roleCode]}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={payrollRateDraft[roleCode]}
                    onChange={(e) => {
                      const parsed = Number.parseFloat(e.target.value);
                      setPayrollRateDraft((prev) => ({
                        ...prev,
                        [roleCode]:
                          Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
                      }));
                    }}
                    className="w-full px-3 h-10 rounded-2xl border border-apple-silver bg-white text-sm text-apple-charcoal focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal transition-all"
                  />
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPayrollRateModal(false);
                  document.body.style.overflow = "auto";
                }}
                className="px-4 h-10 rounded-2xl border border-apple-silver text-sm font-semibold text-apple-ash hover:border-apple-charcoal transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyPayrollRates}
                className="px-4 h-10 rounded-2xl bg-apple-charcoal text-white text-sm font-semibold hover:bg-apple-black transition"
              >
                Save Rates
              </button>
            </div>
          </div>
        </div>
      )}

      {editingPayrollRow && payrollEditDraft && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-6xl max-h-[88vh] overflow-y-auto rounded-lg border border-apple-mist bg-white shadow-apple-xs">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-apple-mist px-5 sm:px-7 py-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-2xs font-semibold text-apple-steel uppercase tracking-widest">
                  Calculation Details
                </p>
                <h3 className="text-xl font-semibold text-apple-charcoal tracking-tight">
                  {editingPayrollRow.worker} | ({editingPayrollRow.role}) |{" "}
                  {editingPayrollRow.site}
                </h3>
              </div>
              <button
                type="button"
                onClick={closePayrollEditModal}
                className="w-9 h-9 rounded-full border border-apple-silver text-apple-smoke hover:text-apple-charcoal hover:border-apple-charcoal transition flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 sm:px-7 py-5 sm:py-6 space-y-5">
              <div className="rounded-2xl border border-apple-mist bg-apple-snow px-4 py-3 text-sm text-apple-charcoal space-y-1">
                <p>
                  <span className="font-semibold">Reg Hours</span> = Attendance
                  Days x 8 = {editingPayrollSummary.attendanceDays} x{" "}
                  {HOURS_PER_DAY} ={" "}
                  {formatPayrollNumber(editingPayrollSummary.regularHours)}
                </p>
                <p>
                  <span className="font-semibold">OT Hours</span> = OT Normal +
                  OT Special ={" "}
                  {toClockHours(editingPayrollSummary.otNormalHours)} + 00:00 ={" "}
                  {toClockHours(editingPayrollSummary.otNormalHours)}
                </p>
              </div>

              <div className="rounded-2xl border border-apple-mist bg-white">
                <div className="px-4 py-3 border-b border-apple-mist">
                  <p className="text-2xs font-semibold text-apple-steel uppercase tracking-widest">
                    Source Summary
                  </p>
                  <p className="text-xs text-apple-smoke mt-1">
                    {editingPayrollLogs.length} attendance log row
                    {editingPayrollLogs.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    {
                      label: "Absences (Day)",
                      value: String(editingPayrollSummary.absenceDays),
                    },
                    { label: "Leave (Day)", value: "0" },
                    { label: "Business Trip (Day)", value: "0" },
                    {
                      label: "Attendance (Day)",
                      value: String(editingPayrollSummary.attendanceDays),
                    },
                    {
                      label: "OT Normal",
                      value: toClockHours(editingPayrollSummary.otNormalHours),
                    },
                    { label: "OT Special", value: "00:00" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-apple-mist bg-apple-snow px-3 py-2"
                    >
                      <p className="text-2xs font-semibold text-apple-steel uppercase tracking-wider">
                        {item.label}
                      </p>
                      <p className="mt-1 text-lg font-mono text-apple-charcoal">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-apple-mist bg-white">
                <div className="px-4 py-3 border-b border-apple-mist">
                  <p className="text-2xs font-semibold text-apple-steel uppercase tracking-widest">
                    Finance Adjustments
                  </p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-apple-steel uppercase tracking-wider">
                      Date
                    </span>
                    <input
                      type="text"
                      value={payrollEditDraft.date}
                      readOnly
                      className="w-full px-3 h-10 rounded-2xl border border-apple-silver bg-apple-snow text-sm text-apple-charcoal cursor-not-allowed"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-apple-steel uppercase tracking-wider">
                      Hours Worked
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={payrollEditDraft.hoursWorked}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) =>
                        setPayrollEditDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                hoursWorked: normalizeNumericInput(
                                  e.target.value,
                                ),
                              }
                            : prev,
                        )
                      }
                      className="w-full hover:border-apple-charcoal px-3 h-10 rounded-2xl border border-apple-silver bg-white text-sm text-apple-charcoal focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal transition-all"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-apple-steel uppercase tracking-wider">
                      Rate (Hourly)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={payrollEditDraft.rate}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) =>
                        setPayrollEditDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                rate: normalizeNumericInput(e.target.value),
                              }
                            : prev,
                        )
                      }
                      className="w-full hover:border-apple-charcoal px-3 h-10 rounded-2xl border border-apple-silver bg-white text-sm text-apple-charcoal focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal transition-all"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-apple-steel uppercase tracking-wider">
                      Overtime Hours
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={payrollEditDraft.overtimeHours}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) =>
                        setPayrollEditDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                overtimeHours: normalizeNumericInput(
                                  e.target.value,
                                ),
                              }
                            : prev,
                        )
                      }
                      className="w-full hover:border-apple-charcoal px-3 h-10 rounded-2xl border border-apple-silver bg-white text-sm text-apple-charcoal focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal transition-all"
                    />
                  </label>
                </div>
              </div>

              {payrollEditPreview && (
                <div className="rounded-xl border border-apple-mist bg-apple-snow px-3 py-2 text-sm text-apple-ash">
                  Preview Total Pay:{" "}
                  <span className="font-semibold text-apple-charcoal">
                    {formatPayrollNumber(payrollEditPreview.totalPay)}
                  </span>
                </div>
              )}

              <div className="rounded-2xl border border-apple-mist bg-white">
                <div className="px-4 py-3 border-b border-apple-mist">
                  <h4 className="text-base font-semibold text-apple-charcoal">
                    Employee Analytics
                  </h4>
                  <p className="text-xs text-apple-smoke mt-1">
                    Visual insights into the employee&apos;s attendance and work
                    patterns.
                  </p>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold text-apple-charcoal mb-2">
                      Daily Hours Worked Trend
                    </p>
                    <div className="h-[220px]">
                      {employeeDailyHoursTrend.length === 0 ? (
                        <p className="text-sm text-apple-smoke">
                          No attendance logs yet.
                        </p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={employeeDailyHoursTrend}
                            margin={{ top: 8, right: 8, left: -18, bottom: 8 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#F1F5F9"
                            />
                            <XAxis
                              dataKey="date"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#64748B", fontSize: 10 }}
                              minTickGap={12}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#64748B", fontSize: 10 }}
                            />
                            <Tooltip
                              formatter={(value: number) => [
                                formatPayrollNumber(value),
                                "Hours Worked",
                              ]}
                              labelFormatter={(label: string) =>
                                `Date: ${label}`
                              }
                            />
                            <Line
                              type="monotone"
                              dataKey="hoursWorked"
                              stroke="#2563EB"
                              strokeWidth={2.2}
                              dot={{ r: 2 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold text-apple-charcoal mb-2">
                      Attendance Breakdown
                    </p>
                    <div className="h-[220px]">
                      {employeeAttendanceBreakdown.every(
                        (item) => item.value === 0,
                      ) ? (
                        <p className="text-sm text-apple-smoke">
                          No attendance distribution yet.
                        </p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={employeeAttendanceBreakdown}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={42}
                              outerRadius={72}
                              paddingAngle={2}
                              isAnimationActive={false}
                            >
                              {employeeAttendanceBreakdown.map(
                                (entry, index) => (
                                  <Cell
                                    key={`${entry.name}-${index}`}
                                    fill={
                                      EMPLOYEE_ANALYTICS_COLORS[
                                        index % EMPLOYEE_ANALYTICS_COLORS.length
                                      ]
                                    }
                                  />
                                ),
                              )}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold text-apple-charcoal mb-2">
                      Clock-in Time Consistency
                    </p>
                    <div className="h-[220px]">
                      {employeeClockInConsistency.length === 0 ? (
                        <p className="text-sm text-apple-smoke">
                          No clock-in data yet.
                        </p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={employeeClockInConsistency}
                            margin={{ top: 8, right: 8, left: -18, bottom: 8 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#F1F5F9"
                            />
                            <XAxis
                              dataKey="date"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#64748B", fontSize: 10 }}
                              minTickGap={12}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#64748B", fontSize: 10 }}
                              domain={[0, 24]}
                            />
                            <Tooltip
                              formatter={(
                                _value: number,
                                _name: string,
                                item: { payload?: { timeInLabel?: string } },
                              ) => [
                                item.payload?.timeInLabel ?? "-",
                                "Time In",
                              ]}
                              labelFormatter={(label: string) =>
                                `Date: ${label}`
                              }
                            />
                            <Bar
                              dataKey="timeIn"
                              fill="#10B981"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-apple-mist bg-white overflow-x-auto">
                <div className="px-4 py-3 border-b border-apple-mist">
                  <p className="text-2xs font-semibold text-apple-steel uppercase tracking-widest">
                    All Report Logs
                  </p>
                </div>
                <table className="w-full text-sm min-w-[980px]">
                  <thead>
                    <tr className="border-b border-apple-mist">
                      {[
                        "Date/Week",
                        "Time1 In",
                        "Time1 Out",
                        "Time2 In",
                        "Time2 Out",
                        "OT In",
                        "OT Out",
                        "Hours",
                      ].map((h) => (
                        <th
                          key={h}
                          className={`px-3 py-2.5 text-2xs font-semibold uppercase tracking-widest text-apple-steel ${
                            h === "Hours" ? "text-right" : "text-left"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {editingPayrollLogs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-3 py-5 text-center text-sm text-apple-smoke"
                        >
                          No attendance logs found for this worker.
                        </td>
                      </tr>
                    ) : (
                      editingPayrollLogs.map((log) => (
                        <tr
                          key={`${log.date}-${log.employee}`}
                          className="border-b border-apple-mist/60 last:border-0 odd:bg-apple-snow/40"
                        >
                          <td className="px-3 py-2.5 text-sm text-apple-charcoal">
                            {toWeekLabel(log.date)}
                          </td>

                          <td className="px-3 py-2.5 text-sm text-apple-charcoal">
                            {log.time1In ? (
                              log.time1In
                            ) : (
                              <span className="text-red-500 ">Missed</span>
                            )}
                          </td>

                          <td className="px-3 py-2.5 text-sm text-apple-charcoal">
                            {log.time1Out ? (
                              log.time1Out
                            ) : (
                              <span className="text-red-500 ">Missed</span>
                            )}
                          </td>

                          <td className="px-3 py-2.5 text-sm text-apple-charcoal">
                            {log.time2In ? (
                              log.time2In
                            ) : (
                              <span className="text-red-500 ">Missed</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-sm text-apple-charcoal">
                            {log.time2Out ? (
                              log.time2Out
                            ) : (
                              <span className="text-red-500 ">Missed</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-sm text-apple-charcoal">
                            {log.otIn || "-"}
                          </td>
                          <td className="px-3 py-2.5 text-sm text-apple-charcoal">
                            {log.otOut || "-"}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              onFocus={(e) => e.currentTarget.select()}
                              value={normalizeNumericInput(
                                String(
                                  logHourOverrides[getLogOverrideKey(log)] ??
                                    log.hours,
                                ),
                              )}
                              onChange={(e) => {
                                const normalized = normalizeNumericInput(
                                  e.target.value,
                                );
                                const value = Number.parseFloat(normalized);

                                setLogHourOverrides((prev) => ({
                                  ...prev,
                                  [getLogOverrideKey(log)]:
                                    Number.isFinite(value) && value >= 0
                                      ? Math.round(value * 100) / 100
                                      : 0,
                                }));
                              }}
                              className="w-20 hover:border-apple-charcoal text-right px-2 py-1 rounded-lg border border-apple-charcoal/40 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-apple-charcoal/20"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-apple-steel">
                  Saving total hours:{" "}
                  <span className="font-semibold text-apple-charcoal">
                    {formatPayrollNumber(
                      hasLogHourOverrides
                        ? totalEditedLogHours
                        : parseNonNegativeOrFallback(
                            payrollEditDraft.hoursWorked,
                            editingPayrollRow.hoursWorked,
                          ),
                    )}
                  </span>
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closePayrollEditModal}
                    className="px-4 h-10 rounded-2xl border border-apple-silver text-sm font-semibold text-apple-ash hover:border-apple-charcoal transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={savePayrollEdit}
                    className="px-4 h-10 rounded-2xl bg-apple-charcoal text-white text-sm font-semibold hover:bg-apple-black transition"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { syncAdvanceOvertimeRequestsForPayrollAction } from "@/actions/payroll";
import type { AttendanceRecordInput, PayrollRow } from "@/lib/payrollEngine";
import { calculatePayroll, roundPayrollCalculation } from "@/lib/payrollEngine";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  DEFAULT_DAILY_RATE_BY_ROLE,
  DEFAULT_OVERTIME_MULTIPLIER,
  ROLE_CODES,
  type RoleCode,
} from "@/lib/payrollConfig";
import type { DailyLogRow, Step2Sort } from "@/types";
import { buildVisiblePages } from "@/features/shared/pagination";
import {
  normalizeNumericInput,
  parseNonNegativeOrFallback,
} from "@/features/payroll/utils/payrollFormatters";
import {
  capRegularWorkedHours,
  DEFAULT_REGULAR_PAID_HOURS,
  normalizeEmployeeBranchRateConfig,
  type EmployeeBranchRateConfig,
} from "@/features/payroll/utils/branchRateConfig";
import {
  extractIsoPayrollRange,
  isIsoDateWithinRange,
  normalizePeriodLabel,
} from "@/features/payroll/utils/payrollDateHelpers";
import {
  buildEmployeeBranchRateKey,
  getLogOverrideKey,
  normalizeEmployeeNameKey,
  parsePayrollIdentity,
} from "@/features/payroll/utils/payrollMappers";
import {
  applyLogHourOverrides,
  buildEditingPayrollLogs,
  buildEditingPayrollSummary,
  buildPayrollBaseRows,
  buildPayrollRows,
  coalescePayrollAttendanceInputs,
  computeBasePay,
  filterPayrollLogs,
  filterPayrollRows,
  FIXED_PAY_RATE_PER_DAY,
  FULL_WORKDAY_HOURS,
  hasAnyLogHourOverrides,
  summarizePayrollTotals,
} from "@/features/payroll/utils/payrollSelectors";
import type {
  PayrollAllowanceEntry,
  PayrollAdjustmentSet,
  PayrollCashAdvanceEntry,
  PayrollDeductionEntry,
  LogHourOverride,
  LogHourOverrideMap,
  LogHourOverrideValue,
  PaidHolidayItem,
  PayrollDateRange,
  PayrollEditDraft,
  PayrollOvertimeEntry,
  PayrollPaidLeaveEntry,
  PayrollRowOverride,
} from "@/features/payroll/types";

const PREVIEW_LIMIT = 10;
const MAX_LOG_HOURS_PER_DAY = 16;
const EMPTY_ADJUSTMENTS: PayrollAdjustmentSet = {
  cashAdvanceEntries: [],
  overtimeEntries: [],
  paidLeaveEntries: [],
  allowanceEntries: [],
  deductionEntries: [],
  biometricOvertimeStatus: null,
};

function sanitizeEditableHours(
  value: unknown,
  maxHours = MAX_LOG_HOURS_PER_DAY,
): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) return 0;
  return Math.round(Math.min(numericValue, maxHours) * 100) / 100;
}

function normalizeLogHourOverrideValue(
  value: LogHourOverrideValue | undefined,
  fallback: LogHourOverride,
): LogHourOverride {
  if (typeof value === "number") {
    return {
      regularHours: sanitizeEditableHours(value),
      overtimeHours: fallback.overtimeHours,
    };
  }

  return {
    regularHours:
      value?.regularHours === undefined
        ? fallback.regularHours
        : sanitizeEditableHours(value.regularHours),
    overtimeHours:
      value?.overtimeHours === undefined
        ? fallback.overtimeHours
        : sanitizeEditableHours(value.overtimeHours),
  };
}

function sumDeductionEntries(entries?: PayrollDeductionEntry[]): number {
  return round2(
    (entries ?? []).reduce(
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

function sanitizeDeductionEntries(
  entries?: PayrollDeductionEntry[],
): PayrollDeductionEntry[] {
  return (entries ?? [])
    .map((entry) => ({
      id: entry.id || `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
      sssGsis: sanitizeEditableHours(entry.sssGsis, Number.POSITIVE_INFINITY),
      philHealth: sanitizeEditableHours(entry.philHealth, Number.POSITIVE_INFINITY),
      pagIbig: sanitizeEditableHours(entry.pagIbig, Number.POSITIVE_INFINITY),
      withholdingTax: sanitizeEditableHours(
        entry.withholdingTax,
        Number.POSITIVE_INFINITY,
      ),
      otherDeductions: sanitizeEditableHours(
        entry.otherDeductions,
        Number.POSITIVE_INFINITY,
      ),
    }))
    .filter((entry) => sumDeductionEntries([entry]) > 0);
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getLastMondayOfAugust(year: number): string {
  const date = new Date(year, 7, 31);
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() - 1);
  }
  return toIsoDate(year, 8, date.getDate());
}

function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

function toIsoFromDate(date: Date): string {
  return toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function shiftDate(date: Date, dayOffset: number): string {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + dayOffset);
  return toIsoFromDate(copy);
}

function getPhilippineHolidaysByYear(year: number): PaidHolidayItem[] {
  const fixed: PaidHolidayItem[] = [
    { date: toIsoDate(year, 1, 1), name: "New Year's Day", source: "ph" },
    { date: toIsoDate(year, 2, 25), name: "EDSA People Power Revolution", source: "ph" },
    { date: toIsoDate(year, 4, 9), name: "Araw ng Kagitingan", source: "ph" },
    { date: toIsoDate(year, 5, 1), name: "Labor Day", source: "ph" },
    { date: toIsoDate(year, 6, 12), name: "Independence Day", source: "ph" },
    { date: toIsoDate(year, 8, 21), name: "Ninoy Aquino Day", source: "ph" },
    { date: getLastMondayOfAugust(year), name: "National Heroes Day", source: "ph" },
    { date: toIsoDate(year, 11, 30), name: "Bonifacio Day", source: "ph" },
    { date: toIsoDate(year, 12, 8), name: "Feast of the Immaculate Conception", source: "ph" },
    { date: toIsoDate(year, 12, 25), name: "Christmas Day", source: "ph" },
    { date: toIsoDate(year, 12, 30), name: "Rizal Day", source: "ph" },
    { date: toIsoDate(year, 12, 31), name: "Last Day of the Year", source: "ph" },
  ];

  const easterSunday = getEasterSunday(year);
  const holyWeekItems: PaidHolidayItem[] = [
    { date: shiftDate(easterSunday, -3), name: "Maundy Thursday", source: "ph" },
    { date: shiftDate(easterSunday, -2), name: "Good Friday", source: "ph" },
  ];

  const merged = new Map<string, PaidHolidayItem>();
  [...fixed, ...holyWeekItems].forEach((holiday) => {
    merged.set(holiday.date, holiday);
  });

  return Array.from(merged.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function mergeHolidayItems(
  existing: PaidHolidayItem[],
  additions: PaidHolidayItem[],
): PaidHolidayItem[] {
  const byDate = new Map<string, PaidHolidayItem>();

  for (const holiday of existing) {
    byDate.set(holiday.date, holiday);
  }

  for (const holiday of additions) {
    const existingHoliday = byDate.get(holiday.date);
    if (!existingHoliday || holiday.source === "manual") {
      byDate.set(holiday.date, holiday);
    }
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function buildDailyHoursByWorker(
  logs: AttendanceRecordInput[],
): Map<string, Map<string, number>> {
  const hoursByWorker = new Map<string, Map<string, number>>();

  for (const log of logs) {
    const key = `${log.role}|||${log.name}|||${log.site}`;
    const byDate = hoursByWorker.get(key) ?? new Map<string, number>();
    byDate.set(log.date, (byDate.get(log.date) ?? 0) + log.hours);
    hoursByWorker.set(key, byDate);
  }

  return hoursByWorker;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sanitizeCashAdvanceEntries(
  entries: PayrollCashAdvanceEntry[] | undefined,
): PayrollCashAdvanceEntry[] {
  if (!entries || entries.length === 0) return [];
  return entries
    .map((entry) => ({
      id: String(entry.id || `${Date.now()}-${Math.random()}`),
      amount:
        Number.isFinite(entry.amount) && entry.amount > 0
          ? round2(entry.amount)
          : 0,
      notes: String(entry.notes ?? "").trim(),
    }))
    .filter((entry) => entry.amount > 0);
}

function sanitizeOvertimeEntries(
  entries: PayrollOvertimeEntry[] | undefined,
): PayrollOvertimeEntry[] {
  if (!entries || entries.length === 0) return [];
  return entries
      .map((entry) => ({
        id: String(entry.id || `${Date.now()}-${Math.random()}`),
        requestId: entry.requestId ?? null,
        hours: Number.isFinite(entry.hours) && entry.hours > 0 ? round2(entry.hours) : 0,
        pay: Number.isFinite(entry.pay) && entry.pay > 0 ? round2(entry.pay) : 0,
        notes: String(entry.notes ?? "").trim(),
        status: entry.status ?? "pending",
      }))
      .filter((entry) => entry.hours > 0 || entry.pay > 0);
  }

function sanitizePaidLeaveEntries(
  entries: PayrollPaidLeaveEntry[] | undefined,
): PayrollPaidLeaveEntry[] {
  if (!entries || entries.length === 0) return [];
  return entries
    .map((entry) => ({
      id: String(entry.id || `${Date.now()}-${Math.random()}`),
      days: Number.isFinite(entry.days) && entry.days > 0 ? round2(entry.days) : 0,
      pay: Number.isFinite(entry.pay) && entry.pay > 0 ? round2(entry.pay) : 0,
      notes: String(entry.notes ?? "").trim(),
    }))
    .filter((entry) => entry.days > 0 || entry.pay > 0);
}

function sumCashAdvance(entries: PayrollCashAdvanceEntry[] | undefined): number {
  return round2((entries ?? []).reduce((sum, entry) => sum + entry.amount, 0));
}

function sumOvertimePay(
  entries: PayrollOvertimeEntry[] | undefined,
  status?: "pending" | "approved" | "rejected",
): number {
  return round2(
    (entries ?? []).reduce((sum, entry) => {
      if (status && (entry.status ?? "pending") !== status) return sum;
      return sum + entry.pay;
    }, 0),
  );
}

function sumOvertimeHours(
  entries: PayrollOvertimeEntry[] | undefined,
  status?: "pending" | "approved" | "rejected",
): number {
  return round2(
    (entries ?? []).reduce((sum, entry) => {
      if (status && (entry.status ?? "pending") !== status) return sum;
      return sum + entry.hours;
    }, 0),
  );
}

function sumPaidLeavePay(entries: PayrollPaidLeaveEntry[] | undefined): number {
  return round2((entries ?? []).reduce((sum, entry) => sum + entry.pay, 0));
}

function sanitizeAllowanceEntries(
  entries: PayrollAllowanceEntry[] | undefined,
): PayrollAllowanceEntry[] {
  if (!entries || entries.length === 0) return [];
  return entries
    .map((entry) => ({
      id: String(entry.id || `${Date.now()}-${Math.random()}`),
      amount:
        Number.isFinite(entry.amount) && entry.amount > 0
          ? round2(entry.amount)
          : 0,
      notes: String(entry.notes ?? "").trim(),
    }))
    .filter((entry) => entry.amount > 0);
}

function sumAllowanceEntries(
  entries: PayrollAllowanceEntry[] | undefined,
): number {
  return round2((entries ?? []).reduce((sum, entry) => sum + entry.amount, 0));
}

export interface UsePayrollStateArgs {
  dailyRows: DailyLogRow[];
  attendancePeriod: string;
  availableSites: string[];
  currentAttendanceImportId: string | null;
}

export interface UsePayrollStateResult {
  dailyRows: DailyLogRow[];
  payrollRoleRates: Record<RoleCode, number>;
  setPayrollRoleRates: (
    value:
      | Record<RoleCode, number>
      | ((prev: Record<RoleCode, number>) => Record<RoleCode, number>),
  ) => void;
  payrollGenerated: boolean;
  setPayrollGenerated: (value: boolean) => void;
  payrollTab: "payroll" | "logs";
  setPayrollTab: (value: "payroll" | "logs") => void;
  payrollPage: number;
  setPayrollPage: (value: number | ((prev: number) => number)) => void;
  payrollSiteFilter: string;
  setPayrollSiteFilter: (value: string) => void;
  payrollNameFilter: string;
  setPayrollNameFilter: (value: string) => void;
  payrollDateFilter: string;
  setPayrollDateFilter: (value: string) => void;
  payrollSort: Step2Sort;
  setPayrollSort: (value: Step2Sort) => void;
  payrollRoleFilter: RoleCode | "ALL";
  setPayrollRoleFilter: (value: RoleCode | "ALL") => void;
  showPayrollRateModal: boolean;
  payrollRateDraft: Record<string, EmployeeBranchRateConfig>;
  setPayrollRateDraft: (
    value:
      | Record<string, EmployeeBranchRateConfig>
      | ((
          prev: Record<string, EmployeeBranchRateConfig>,
        ) => Record<string, EmployeeBranchRateConfig>),
  ) => void;
  employeeBranchRates: Record<string, EmployeeBranchRateConfig>;
  setEmployeeBranchRates: (
    value:
      | Record<string, EmployeeBranchRateConfig>
      | ((
          prev: Record<string, EmployeeBranchRateConfig>,
        ) => Record<string, EmployeeBranchRateConfig>),
  ) => void;
  payrollAttendanceInputs: AttendanceRecordInput[];
  payrollOverrides: Record<string, PayrollRowOverride>;
  setPayrollOverrides: (
    value:
      | Record<string, PayrollRowOverride>
      | ((
          prev: Record<string, PayrollRowOverride>,
        ) => Record<string, PayrollRowOverride>),
  ) => void;
  payrollRows: PayrollRow[];
  payrollBaseComputedRows: PayrollRow[];
  filteredPayrollRows: PayrollRow[];
  filteredPayrollLogs: AttendanceRecordInput[];
  paidHolidays: PaidHolidayItem[];
  setPaidHolidays: (
    value:
      | PaidHolidayItem[]
      | ((prev: PaidHolidayItem[]) => PaidHolidayItem[]),
  ) => void;
  payrollDateRange: PayrollDateRange | null;
  payableHolidayDays: number;
  payrollActiveRowsCount: number;
  payrollTotalPages: number;
  payrollPreviewStart: number;
  payrollPreviewEnd: number;
  payrollPreviewRows: PayrollRow[];
  payrollPreviewLogs: AttendanceRecordInput[];
  payrollTotals: { hours: number; pay: number };
  payrollPages: number[];
  editingPayrollRow: PayrollRow | null;
  editingPayrollSourceRow: PayrollRow | null;
  editingPayrollLogs: DailyLogRow[];
  editingPayrollSummary: {
    attendanceDays: number;
    absenceDays: number;
    regularHours: number;
    otNormalHours: number;
  };
  editingPayrollAdjustments: PayrollAdjustmentSet;
  editingPayrollLogsForAnalytics: DailyLogRow[];
  payrollEditDraft: PayrollEditDraft | null;
  setPayrollEditDraft: (
    value: PayrollEditDraft | null | ((prev: PayrollEditDraft | null) => PayrollEditDraft | null),
  ) => void;
  logHourOverrides: LogHourOverrideMap;
  setLogHourOverrides: (
    value:
      | LogHourOverrideMap
      | ((prev: LogHourOverrideMap) => LogHourOverrideMap),
  ) => void;
  hasLogHourOverrides: boolean;
  clearPayrollFilters: () => void;
  resetPayrollState: () => void;
  handleGeneratePayroll: () => boolean;
  openPayrollRateModal: () => void;
  closePayrollRateModal: () => void;
  applyPayrollRates: () => void;
  addManualPaidHoliday: (date: string, name: string) => void;
  removePaidHoliday: (date: string) => void;
  clearPaidHolidays: () => void;
  loadPhilippinePaidHolidays: () => void;
  openPayrollEditModal: (row: PayrollRow, displayRow?: PayrollRow) => void;
  closePayrollEditModal: () => void;
  savePayrollEdit: (adjustments?: PayrollAdjustmentSet) => void;
  updateLogHour: (
    log: DailyLogRow,
    field: keyof LogHourOverride,
    valueText: string,
  ) => void;
  normalizeNumericInput: (value: string) => string;
  roleCodes: RoleCode[];
}

export function usePayrollState({
  dailyRows,
  attendancePeriod,
  availableSites,
  currentAttendanceImportId,
}: UsePayrollStateArgs): UsePayrollStateResult {
  const [payrollRoleRates, setPayrollRoleRates] = useState<
    Record<RoleCode, number>
  >(DEFAULT_DAILY_RATE_BY_ROLE);
  const [payrollGenerated, setPayrollGenerated] = useState(false);
  const [payrollTab, setPayrollTab] = useState<"payroll" | "logs">("payroll");
  const [payrollPage, setPayrollPage] = useState(1);
  const [payrollSiteFilter, setPayrollSiteFilter] = useState("ALL");
  const [payrollNameFilter, setPayrollNameFilter] = useState("");
  const [payrollDateFilter, setPayrollDateFilter] = useState("");
  const [payrollSort, setPayrollSort] = useState<Step2Sort>("name-asc");
  const [showPayrollRateModal, setShowPayrollRateModal] = useState(false);
  const [payrollRateDraft, setPayrollRateDraft] = useState<
    Record<string, EmployeeBranchRateConfig>
  >({});
  const [employeeBranchRates, setEmployeeBranchRates] = useState<
    Record<string, EmployeeBranchRateConfig>
  >({});
  const [editingPayrollRowId, setEditingPayrollRowId] = useState<string | null>(
    null,
  );
  const [editingPayrollDisplayRow, setEditingPayrollDisplayRow] =
    useState<PayrollRow | null>(null);
  const [payrollEditDraft, setPayrollEditDraft] =
    useState<PayrollEditDraft | null>(null);
  const [payrollOverrides, setPayrollOverrides] = useState<
    Record<string, PayrollRowOverride>
  >({});
  const [payrollRoleFilter, setPayrollRoleFilter] = useState<RoleCode | "ALL">(
    "ALL",
  );
  const [logHourOverrides, setLogHourOverrides] = useState<LogHourOverrideMap>({});
  const [paidHolidays, setPaidHolidays] = useState<PaidHolidayItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadEmployeeBranchRates() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("employee_branch_rates")
          .select(
            "employee_name, role_code, site_name, daily_rate, regular_paid_hours",
          );

        if (error || cancelled) return;

        const nextRates = ((data ?? []) as Array<{
          employee_name: string;
          role_code: string;
          site_name: string;
          daily_rate: number;
          regular_paid_hours: number | null;
        }>).reduce<Record<string, EmployeeBranchRateConfig>>((acc, row) => {
          const key = buildEmployeeBranchRateKey(
            row.employee_name,
            row.role_code,
            row.site_name,
          );
          acc[key] = normalizeEmployeeBranchRateConfig(
            {
              dailyRate: row.daily_rate,
              regularPaidHours: row.regular_paid_hours,
            },
            Number(row.daily_rate ?? 0),
          );
          return acc;
        }, {});

        setEmployeeBranchRates(nextRates);
      } catch {
        return;
      }
    }

    void loadEmployeeBranchRates();

    return () => {
      cancelled = true;
    };
  }, []);

  const persistedLogHourOverrides = useMemo(() => {
    const merged: Record<string, LogHourOverrideValue> = {};

    for (const override of Object.values(payrollOverrides)) {
      if (!override.logHours) continue;

      for (const [key, value] of Object.entries(override.logHours)) {
        if (typeof value === "number") {
          merged[key] = sanitizeEditableHours(value);
          continue;
        }

        merged[key] = {
          regularHours: sanitizeEditableHours(value.regularHours),
          overtimeHours: sanitizeEditableHours(value.overtimeHours),
        };
      }
    }

    return merged;
  }, [payrollOverrides]);

  const payrollAttendanceInputs = useMemo(() => {
    const normalizedInputs = dailyRows
      .map((row) => {
        const identity = parsePayrollIdentity(row.employee);
        const key = getLogOverrideKey(row);
        const overrideHours = normalizeLogHourOverrideValue(
          persistedLogHourOverrides[key],
          {
            regularHours:
              row.regularHours > 0 || row.overtimeHours > 0
                ? row.regularHours
                : row.hours,
            overtimeHours:
              Number.isFinite(row.overtimeHours) && row.overtimeHours > 0
                ? row.overtimeHours
                : 0,
          },
        );
        const baseRegularHours =
          row.regularHours > 0 || row.overtimeHours > 0
            ? row.regularHours
            : row.hours;
        const regularHours = overrideHours.regularHours ?? baseRegularHours;
        const overtimeHours = overrideHours.overtimeHours ?? 0;

        return {
          name: identity.name,
          role: identity.role,
          site: row.site,
          date: row.date,
          hours: round2(regularHours),
          overtimeHours: round2(overtimeHours),
          totalHours: round2(regularHours + overtimeHours),
        };
      })
      .filter(
        (record) =>
          record.name.length > 0 &&
          Number.isFinite(record.hours) &&
          record.hours >= 0,
      );

    return coalescePayrollAttendanceInputs(normalizedInputs).map((record) => {
      const branchRateConfig =
        employeeBranchRates[
          buildEmployeeBranchRateKey(record.name, record.role, record.site)
        ];
      const cappedRegularHours = capRegularWorkedHours(
        record.hours,
        branchRateConfig?.regularPaidHours ?? DEFAULT_REGULAR_PAID_HOURS,
      );

      return {
        ...record,
        hours: cappedRegularHours,
        totalHours: round2(cappedRegularHours + (record.overtimeHours ?? 0)),
      };
    });
  }, [dailyRows, employeeBranchRates, persistedLogHourOverrides]);
  const payrollBaseRows = useMemo(
    () =>
      buildPayrollBaseRows(
        payrollAttendanceInputs,
        payrollRoleRates,
        attendancePeriod,
      ).map((row) => {
        const branchRateConfig = employeeBranchRates[
          buildEmployeeBranchRateKey(row.worker, row.role, row.site)
        ];
        const branchRate = branchRateConfig?.dailyRate;

        if (!Number.isFinite(branchRate) || branchRate <= 0) {
          return row;
        }

        const hourlyRate = round2(branchRate / FULL_WORKDAY_HOURS);
        const basePay = computeBasePay(row.hoursWorked, branchRate);
        return {
          ...row,
          defaultRate: hourlyRate,
          customRate: null,
          rate: hourlyRate,
          regularPay: basePay,
          overtimePay: 0,
          totalPay: basePay,
        };
      }),
    [payrollAttendanceInputs, payrollRoleRates, attendancePeriod, employeeBranchRates],
  );

  const payrollBaseComputedRows = useMemo(
    () => buildPayrollRows(payrollBaseRows, payrollOverrides, attendancePeriod),
    [payrollBaseRows, payrollOverrides, attendancePeriod],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadStandaloneOvertimeRequests() {
      if (!attendancePeriod.trim()) return;

      try {
        if (payrollBaseComputedRows.length > 0) {
          await syncAdvanceOvertimeRequestsForPayrollAction({
            attendanceImportId: currentAttendanceImportId,
            attendancePeriod,
            payrollRows: payrollBaseComputedRows.map((row) => ({
              worker: row.worker,
              role: row.role,
              site: row.site,
              defaultRate: row.defaultRate,
              customRate: row.customRate,
            })),
          });
        }
      } catch {
        // Keep payroll usable if auto-approval cannot run; save performs a second server-side check.
      }

      try {
        const supabase = createSupabaseBrowserClient();
        let query = supabase
          .from("payroll_adjustments")
            .select(
              "id, attendance_import_id, employee_name, role_code, site_name, period_label, status, quantity, amount, notes",
            )
            .eq("adjustment_type", "overtime")
            .in("status", ["pending", "approved", "rejected"])
            .eq("period_label", attendancePeriod);

        query = currentAttendanceImportId
          ? query.eq("attendance_import_id", currentAttendanceImportId)
          : query.is("attendance_import_id", null);

        const { data, error } = await query.order("created_at", {
          ascending: true,
        });

        if (error || cancelled) return;

        const requestRows = (data ?? []) as Array<{
          id: string;
          attendance_import_id: string | null;
          employee_name: string | null;
          role_code: string | null;
          site_name: string | null;
          period_label: string | null;
          status: "pending" | "approved" | "rejected";
          quantity: number;
          amount: number;
          notes: string | null;
        }>;

        setPayrollOverrides((prev) => {
          const next = { ...prev };
          let changed = false;

          for (const row of payrollBaseComputedRows) {
            const persistedEntries = requestRows
              .filter(
                (request) =>
                  normalizeEmployeeNameKey(request.employee_name ?? "") ===
                    normalizeEmployeeNameKey(row.worker) &&
                  (request.role_code ?? "").trim().toUpperCase() ===
                    row.role.trim().toUpperCase() &&
                  normalizeEmployeeNameKey(request.site_name ?? "") ===
                    normalizeEmployeeNameKey(row.site),
              )
              .map<PayrollOvertimeEntry>((request) => ({
                id: request.id,
                requestId: request.id,
                hours: round2(request.quantity ?? 0),
                pay: round2(request.amount ?? 0),
                notes: request.notes ?? "",
                status: request.status,
              }));

            const existingOverride = next[row.id];
            const localOnlyEntries = (existingOverride?.overtimeEntries ?? []).filter(
              (entry) => !entry.requestId,
            );
            const mergedEntries = [...persistedEntries, ...localOnlyEntries];
            const previousSerialized = JSON.stringify(
              existingOverride?.overtimeEntries ?? [],
            );
            const nextSerialized = JSON.stringify(mergedEntries);

            if (mergedEntries.length === 0 && !existingOverride) continue;

            if (
              existingOverride &&
              previousSerialized === nextSerialized &&
              (existingOverride.overtimeEntriesPayTotal ?? 0) ===
                sumOvertimePay(mergedEntries, "approved") &&
              (existingOverride.overtimeEntriesHoursTotal ?? 0) ===
                sumOvertimeHours(mergedEntries, "approved")
            ) {
              continue;
            }

            next[row.id] = {
              date: existingOverride?.date ?? row.date,
              hoursWorked: existingOverride?.hoursWorked ?? row.hoursWorked,
              overtimeHours: existingOverride?.overtimeHours ?? row.overtimeHours,
              customRate:
                existingOverride?.customRate ?? row.customRate ?? null,
              logHours: existingOverride?.logHours,
              cashAdvanceEntries: existingOverride?.cashAdvanceEntries ?? [],
              paidLeaveEntries: existingOverride?.paidLeaveEntries ?? [],
              allowanceEntries: existingOverride?.allowanceEntries ?? [],
              deductionEntries: existingOverride?.deductionEntries ?? [],
              cashAdvanceTotal: existingOverride?.cashAdvanceTotal ?? 0,
              paidLeaveEntriesPayTotal:
                existingOverride?.paidLeaveEntriesPayTotal ?? 0,
              allowanceEntriesTotal:
                existingOverride?.allowanceEntriesTotal ?? 0,
              deductionsTotal: existingOverride?.deductionsTotal ?? 0,
              biometricOvertimeHours:
                existingOverride?.biometricOvertimeHours ?? null,
              biometricOvertimeStatus:
                existingOverride?.biometricOvertimeStatus ?? null,
              overtimeEntries: mergedEntries,
              overtimeEntriesPayTotal: sumOvertimePay(
                mergedEntries,
                "approved",
              ),
              overtimeEntriesHoursTotal: sumOvertimeHours(
                mergedEntries,
                "approved",
              ),
            };
            changed = true;
          }

          return changed ? next : prev;
        });
      } catch {
        return;
      }
    }

    void loadStandaloneOvertimeRequests();

    function handleWindowFocus() {
      void loadStandaloneOvertimeRequests();
    }

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [attendancePeriod, currentAttendanceImportId, payrollBaseComputedRows]);

  const payrollDateRange = useMemo<PayrollDateRange | null>(() => {
    const normalizedPeriod = normalizePeriodLabel(attendancePeriod);
    const parsedAttendanceRange = normalizedPeriod
      ? extractIsoPayrollRange(normalizedPeriod)
      : null;

    if (parsedAttendanceRange) {
      const parsedYear = Number.parseInt(parsedAttendanceRange.start.slice(0, 4), 10);
      return {
        start: parsedAttendanceRange.start,
        end: parsedAttendanceRange.end,
        year: Number.isFinite(parsedYear)
          ? parsedYear
          : new Date().getFullYear(),
      };
    }

    let earliestStart: string | null = null;
    let latestEnd: string | null = null;

    for (const row of payrollBaseComputedRows) {
      const parsedRange = extractIsoPayrollRange(row.date);
      if (!parsedRange) continue;

      if (!earliestStart || parsedRange.start < earliestStart) {
        earliestStart = parsedRange.start;
      }
      if (!latestEnd || parsedRange.end > latestEnd) {
        latestEnd = parsedRange.end;
      }
    }

    if (!earliestStart || !latestEnd) return null;

    const parsedYear = Number.parseInt(earliestStart.slice(0, 4), 10);
    return {
      start: earliestStart,
      end: latestEnd,
      year: Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear(),
    };
  }, [attendancePeriod, payrollBaseComputedRows]);

  const payableHolidayDays = useMemo(() => {
    if (!payrollDateRange || paidHolidays.length === 0) return 0;

    return paidHolidays.filter((holiday) =>
      isIsoDateWithinRange(
        holiday.date,
        payrollDateRange.start,
        payrollDateRange.end,
      ),
    ).length;
  }, [paidHolidays, payrollDateRange]);
  const payableHolidayDates = useMemo(() => {
    if (!payrollDateRange || paidHolidays.length === 0) return [];
    return paidHolidays
      .filter((holiday) =>
        isIsoDateWithinRange(
          holiday.date,
          payrollDateRange.start,
          payrollDateRange.end,
        ),
      )
      .map((holiday) => holiday.date);
  }, [paidHolidays, payrollDateRange]);
  const payableHolidayDateSet = useMemo(
    () => new Set(payableHolidayDates),
    [payableHolidayDates],
  );

  const editingPayrollAdjustments = useMemo<PayrollAdjustmentSet>(() => {
    if (!editingPayrollRowId) return EMPTY_ADJUSTMENTS;

    const override = payrollOverrides[editingPayrollRowId];
    return {
      cashAdvanceEntries: override?.cashAdvanceEntries ?? [],
      overtimeEntries: override?.overtimeEntries ?? [],
      paidLeaveEntries: override?.paidLeaveEntries ?? [],
      allowanceEntries: override?.allowanceEntries ?? [],
      deductionEntries: override?.deductionEntries ?? [],
      biometricOvertimeStatus: override?.biometricOvertimeStatus ?? null,
      biometricOvertimeHours: override?.biometricOvertimeHours ?? null,
    };
  }, [editingPayrollRowId, payrollOverrides]);

  const payrollRows = useMemo(
    () => {
      const preparedRows = payrollBaseComputedRows.map((row) => {
        const override = payrollOverrides[row.id];
        const branchRateKey = buildEmployeeBranchRateKey(
          row.worker,
          row.role,
          row.site,
        );
        const rateConfig = employeeBranchRates[branchRateKey];
        const ratePerDay = round2(
          rateConfig?.dailyRate ??
            (row.customRate ?? row.defaultRate) * FULL_WORKDAY_HOURS,
        );
        const basePay = computeBasePay(row.hoursWorked, ratePerDay);
        const leavePay =
          Number.isFinite(override?.paidLeaveEntriesPayTotal)
            ? round2(override?.paidLeaveEntriesPayTotal ?? 0)
            : sumPaidLeavePay(override?.paidLeaveEntries);
        const manualAllowance =
          Number.isFinite(override?.allowanceEntriesTotal)
            ? round2(override?.allowanceEntriesTotal ?? 0)
            : sumAllowanceEntries(override?.allowanceEntries);
        const approvedOvertimePay = sumOvertimePay(
          override?.overtimeEntries,
          "approved",
        );
        const approvedOvertimeHours = sumOvertimeHours(
          override?.overtimeEntries,
          "approved",
        );
        const biometricOvertimeApproved =
          override?.biometricOvertimeStatus === "approved";
        const storedBiometricHours = override?.biometricOvertimeHours;
        const biometricOvertimeHours = biometricOvertimeApproved
          ? round2(
              storedBiometricHours != null &&
                Number.isFinite(storedBiometricHours)
                ? Number(storedBiometricHours)
                : row.overtimeHours,
            )
          : 0;
        const cashAdvance =
          Number.isFinite(override?.cashAdvanceTotal)
            ? round2(override?.cashAdvanceTotal ?? 0)
            : sumCashAdvance(override?.cashAdvanceEntries);
        const deductions =
          Number.isFinite(override?.deductionsTotal)
            ? round2(override?.deductionsTotal ?? 0)
            : sumDeductionEntries(override?.deductionEntries);
        const effectiveHourlyRate = round2(ratePerDay / FULL_WORKDAY_HOURS);

        return {
          row,
          basePay,
          leavePay,
          manualAllowance,
          approvedOvertimePay,
          approvedOvertimeHours,
          biometricOvertimeHours,
          cashAdvance,
          deductions,
          ratePerDay,
          effectiveHourlyRate,
        };
      });

      const holidayPayByRowId = new Map<string, number>();
      const rowsByEmployee = new Map<string, typeof preparedRows>();

      for (const entry of preparedRows) {
        const employeeKey = normalizeEmployeeNameKey(entry.row.worker);
        const existing = rowsByEmployee.get(employeeKey);
        if (existing) {
          existing.push(entry);
        } else {
          rowsByEmployee.set(employeeKey, [entry]);
        }
      }

      for (const [employeeKey, employeeRows] of rowsByEmployee.entries()) {
        const holidayBonusDays = payableHolidayDateSet.size;

        if (holidayBonusDays <= 0) continue;

        const firstRowId = employeeRows[0]?.row.id;
        if (!firstRowId) continue;

        holidayPayByRowId.set(
          firstRowId,
          round2(holidayBonusDays * FIXED_PAY_RATE_PER_DAY),
        );
      }

      return preparedRows.map((entry) => {
        const holidayPay = holidayPayByRowId.get(entry.row.id) ?? 0;
        const allowance = round2(
          holidayPay + entry.leavePay + entry.manualAllowance,
        );
        const overtimeHours = round2(
          entry.biometricOvertimeHours + entry.approvedOvertimeHours,
        );
        const calculation = roundPayrollCalculation(
          calculatePayroll({
            dailyRate: entry.ratePerDay,
            regularHours: entry.row.hoursWorked,
            overtimeHours,
            overtimeMultiplier: DEFAULT_OVERTIME_MULTIPLIER,
            allowance,
            deductions: {
              cashAdvance: entry.cashAdvance,
              payrollDeductions: entry.deductions,
            },
          }),
        );

        return {
          ...entry.row,
          defaultRate: entry.effectiveHourlyRate,
          rate: entry.effectiveHourlyRate,
          customRate: entry.row.customRate,
          overtimeHours,
          regularPay: calculation.regularPay,
          overtimePay: calculation.overtimePay,
          allowance: round2(
            calculation.grossPay -
              calculation.regularPay -
              calculation.overtimePay,
          ),
          grossPay: calculation.grossPay,
          totalDeductions: calculation.totalDeductions,
          totalPay: calculation.netPay,
        };
      });
    },
    [
      employeeBranchRates,
      payrollBaseComputedRows,
      payrollOverrides,
      payableHolidayDateSet,
    ],
  );

  const filteredPayrollRows = useMemo(
    () =>
      filterPayrollRows(payrollRows, {
        siteFilter: payrollSiteFilter,
        roleFilter: payrollRoleFilter,
        nameFilter: payrollNameFilter,
        dateFilter: payrollDateFilter,
        sort: payrollSort,
      }),
    [
      payrollRows,
      payrollSiteFilter,
      payrollRoleFilter,
      payrollNameFilter,
      payrollDateFilter,
      payrollSort,
    ],
  );

  const filteredPayrollLogs = useMemo(
    () =>
      filterPayrollLogs(payrollAttendanceInputs, {
        siteFilter: payrollSiteFilter,
        roleFilter: payrollRoleFilter,
        nameFilter: payrollNameFilter,
        dateFilter: payrollDateFilter,
        sort: payrollSort,
      }),
    [
      payrollAttendanceInputs,
      payrollSiteFilter,
      payrollRoleFilter,
      payrollNameFilter,
      payrollDateFilter,
      payrollSort,
    ],
  );

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

  const payrollPreviewRows = useMemo(
    () => filteredPayrollRows.slice(payrollPreviewStart, payrollPreviewEnd),
    [filteredPayrollRows, payrollPreviewStart, payrollPreviewEnd],
  );

  const payrollPreviewLogs = useMemo(
    () => filteredPayrollLogs.slice(payrollPreviewStart, payrollPreviewEnd),
    [filteredPayrollLogs, payrollPreviewStart, payrollPreviewEnd],
  );

  const payrollTotals = useMemo(
    () => summarizePayrollTotals(filteredPayrollRows),
    [filteredPayrollRows],
  );

  const editingPayrollRow = useMemo(() => {
    if (editingPayrollDisplayRow) return editingPayrollDisplayRow;
    return payrollBaseComputedRows.find((row) => row.id === editingPayrollRowId) ?? null;
  }, [editingPayrollDisplayRow, payrollBaseComputedRows, editingPayrollRowId]);
  const editingPayrollSourceRow = useMemo(
    () =>
      payrollBaseComputedRows.find((row) => row.id === editingPayrollRowId) ?? null,
    [payrollBaseComputedRows, editingPayrollRowId],
  );

  const editingPayrollLogs = useMemo(
    () => buildEditingPayrollLogs(dailyRows, editingPayrollRow, attendancePeriod),
    [dailyRows, editingPayrollRow, attendancePeriod],
  );

  const editingPayrollSummary = useMemo(
    () => buildEditingPayrollSummary(editingPayrollLogs, editingPayrollRow),
    [editingPayrollLogs, editingPayrollRow],
  );

  const editingPayrollLogsForAnalytics = useMemo(
    () =>
      applyLogHourOverrides(editingPayrollLogs, logHourOverrides, getLogOverrideKey),
    [editingPayrollLogs, logHourOverrides],
  );

  const hasLogHourOverrides = useMemo(
    () => hasAnyLogHourOverrides(logHourOverrides),
    [logHourOverrides],
  );

  const regularEditedLogHours = useMemo(
    () =>
      round2(
        editingPayrollLogsForAnalytics.reduce(
          (sum, log) => sum + log.regularHours,
          0,
        ),
      ),
    [editingPayrollLogsForAnalytics],
  );
  const overtimeEditedLogHours = useMemo(
    () =>
      round2(
        editingPayrollLogsForAnalytics.reduce(
          (sum, log) => sum + log.overtimeHours,
          0,
        ),
      ),
    [editingPayrollLogsForAnalytics],
  );

  const payrollPages = useMemo(
    () => buildVisiblePages(payrollPage, payrollTotalPages),
    [payrollPage, payrollTotalPages],
  );

  useEffect(() => {
    setPayrollPage((prev) => Math.min(prev, payrollTotalPages));
  }, [payrollTotalPages]);

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

    const nextHoursText = String(regularEditedLogHours);
    const nextOvertimeText = String(overtimeEditedLogHours);
    if (
      payrollEditDraft.hoursWorked === nextHoursText &&
      payrollEditDraft.overtimeHours === nextOvertimeText
    ) {
      return;
    }

    setPayrollEditDraft((prev) =>
      prev
        ? {
            ...prev,
            hoursWorked: nextHoursText,
            overtimeHours: nextOvertimeText,
          }
        : prev,
    );
  }, [
    payrollEditDraft,
    editingPayrollRowId,
    hasLogHourOverrides,
    regularEditedLogHours,
    overtimeEditedLogHours,
  ]);

  useEffect(() => {
    if (payrollSiteFilter !== "ALL" && !availableSites.includes(payrollSiteFilter)) {
      setPayrollSiteFilter("ALL");
    }
  }, [availableSites, payrollSiteFilter]);

  useEffect(() => {
    const validIds = new Set(payrollBaseRows.map((row) => row.id));
    setPayrollOverrides((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([id]) => validIds.has(id)),
      );

      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [payrollBaseRows]);

  function clearPayrollFilters() {
    setPayrollSiteFilter("ALL");
    setPayrollNameFilter("");
    setPayrollDateFilter("");
    setPayrollSort("name-asc");
    setPayrollRoleFilter("ALL");
  }

  function resetPayrollState() {
    setPayrollRoleRates(DEFAULT_DAILY_RATE_BY_ROLE);
    setPayrollGenerated(false);
    setPayrollTab("payroll");
    setPayrollPage(1);
    setPayrollSiteFilter("ALL");
    setPayrollNameFilter("");
    setPayrollDateFilter("");
    setPayrollSort("name-asc");
    setShowPayrollRateModal(false);
    setPayrollRateDraft({});
    setEditingPayrollRowId(null);
    setPayrollEditDraft(null);
    setPayrollOverrides({});
    setPayrollRoleFilter("ALL");
    setLogHourOverrides({});
    setPaidHolidays([]);
    document.body.style.overflow = "auto";
  }

  function handleGeneratePayroll(): boolean {
    if (payrollRows.length === 0) return false;

    setPayrollGenerated(true);
    setPayrollTab("payroll");
    setPayrollPage(1);
    setPayrollSiteFilter("ALL");
    setPayrollNameFilter("");
    setPayrollDateFilter("");
    setPayrollSort("name-asc");

    return true;
  }

  function openPayrollRateModal() {
    const nextDraft = payrollBaseComputedRows.reduce<
      Record<string, EmployeeBranchRateConfig>
    >(
      (acc, row) => {
        const key = buildEmployeeBranchRateKey(row.worker, row.role, row.site);
        const fallbackRate = round2(
          (row.customRate ?? row.defaultRate) * FULL_WORKDAY_HOURS,
        );
        acc[key] = normalizeEmployeeBranchRateConfig(
          employeeBranchRates[key],
          fallbackRate,
        );
        return acc;
      },
      {},
    );
    setPayrollRateDraft(nextDraft);
    setShowPayrollRateModal(true);
    document.body.style.overflow = "hidden";
  }

  function closePayrollRateModal() {
    setShowPayrollRateModal(false);
    document.body.style.overflow = "auto";
  }

  function applyPayrollRates() {
    setEmployeeBranchRates({ ...payrollRateDraft });
    setShowPayrollRateModal(false);
    document.body.style.overflow = "auto";
  }

  function addManualPaidHoliday(date: string, name: string) {
    const normalizedDate = date.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) return;

    const label = name.trim() || "Manual Holiday";
    setPaidHolidays((prev) =>
      mergeHolidayItems(prev, [
        {
          date: normalizedDate,
          name: label,
          source: "manual",
        },
      ]),
    );
  }

  function removePaidHoliday(date: string) {
    const normalizedDate = date.trim();
    setPaidHolidays((prev) =>
      prev.filter((holiday) => holiday.date !== normalizedDate),
    );
  }

  function clearPaidHolidays() {
    setPaidHolidays([]);
  }

  function loadPhilippinePaidHolidays() {
    if (!payrollDateRange) {
      toast.error("Unable to load holidays", {
        description: "Payroll period is not available yet.",
      });
      return;
    }

    const startYear = Number.parseInt(payrollDateRange.start.slice(0, 4), 10);
    const endYear = Number.parseInt(payrollDateRange.end.slice(0, 4), 10);

    if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return;

    const fromYear = Math.min(startYear, endYear);
    const toYear = Math.max(startYear, endYear);
    const years = Array.from(
      { length: toYear - fromYear + 1 },
      (_value, index) => fromYear + index,
    );

    const generated = years.flatMap((year) => getPhilippineHolidaysByYear(year));

    if (generated.length === 0) {
      toast.info("No PH holidays in this payroll range", {
        description: `No built-in Philippine holidays were generated for ${fromYear}${fromYear === toYear ? "" : ` to ${toYear}`}.`,
      });
      return;
    }

    setPaidHolidays((prev) => {
      const retainedManualHolidays = prev.filter(
        (holiday) => holiday.source === "manual",
      );
      const retainedOutsideYearPhHolidays = prev.filter(
        (holiday) =>
          holiday.source === "ph" &&
          !years.includes(Number.parseInt(holiday.date.slice(0, 4), 10)),
      );

      return mergeHolidayItems(
        [...retainedManualHolidays, ...retainedOutsideYearPhHolidays],
        generated,
      );
    });

    toast.success("Philippine holidays loaded", {
      description: `${generated.length} holiday(s) merged for ${fromYear}${fromYear === toYear ? "" : ` to ${toYear}`}.`,
    });
  }

  function openPayrollEditModal(row: PayrollRow, displayRow?: PayrollRow) {
    const existingOverride = payrollOverrides[row.id];
    const baseRow =
      payrollBaseComputedRows.find((candidate) => candidate.id === row.id) ?? row;
    const normalizedPeriod = normalizePeriodLabel(attendancePeriod);

    setEditingPayrollRowId(row.id);
    setEditingPayrollDisplayRow(displayRow ?? baseRow);
    const baseLogs = buildEditingPayrollLogs(
      dailyRows,
      baseRow,
      attendancePeriod,
    );
    const sanitizedLogHours = Object.fromEntries(
      Object.entries(existingOverride?.logHours ?? {})
        .map(([key, value]) => {
          const baseLog = baseLogs.find(
            (log) => getLogOverrideKey(log) === key,
          );
          const fallback = {
            regularHours: baseLog?.regularHours ?? 0,
            overtimeHours: baseLog?.overtimeHours ?? 0,
          };
          return [key, normalizeLogHourOverrideValue(value, fallback)] as const;
        }),
    );
    setLogHourOverrides(sanitizedLogHours);
    setPayrollEditDraft({
      date: normalizedPeriod ?? baseRow.date,
      hoursWorked: String(existingOverride?.hoursWorked ?? baseRow.hoursWorked),
      rate:
        (existingOverride?.customRate ?? baseRow.customRate) === null
          ? ""
          : String(existingOverride?.customRate ?? baseRow.customRate),
      overtimeHours: String(existingOverride?.overtimeHours ?? baseRow.overtimeHours),
    });

    document.body.style.overflow = "hidden";
  }

  function closePayrollEditModal() {
    setEditingPayrollRowId(null);
    setEditingPayrollDisplayRow(null);
    setPayrollEditDraft(null);
    setLogHourOverrides({});
    document.body.style.overflow = "auto";
  }

  function savePayrollEdit(adjustments?: PayrollAdjustmentSet) {
    if (!editingPayrollRow || !payrollEditDraft) return;
    const existingOverride = payrollOverrides[editingPayrollRow.id];

    const nextHours = hasLogHourOverrides
      ? regularEditedLogHours
      : parseNonNegativeOrFallback(
          payrollEditDraft.hoursWorked,
          editingPayrollRow.hoursWorked,
        );

    const nextOvertime = hasLogHourOverrides
      ? overtimeEditedLogHours
      : parseNonNegativeOrFallback(
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
            editingPayrollLogs
              .map((log) => {
              const key = getLogOverrideKey(log);
              const normalized = normalizeLogHourOverrideValue(
                logHourOverrides[key],
                {
                  regularHours: log.regularHours,
                  overtimeHours: log.overtimeHours,
                },
              );
              const baseRegularHours = sanitizeEditableHours(log.regularHours);
              const baseOvertimeHours = sanitizeEditableHours(log.overtimeHours);
              return [
                key,
                normalized,
                baseRegularHours,
                baseOvertimeHours,
              ] as const;
            })
              .filter(([, normalized, baseRegularHours, baseOvertimeHours]) =>
                Math.abs(normalized.regularHours - baseRegularHours) > 0.001 ||
                Math.abs(normalized.overtimeHours - baseOvertimeHours) > 0.001,
              )
              .map(([key, normalized]) => [key, normalized]),
          )
        : undefined;

    const normalizedPeriod = normalizePeriodLabel(attendancePeriod);
    const nextCashAdvanceEntries = sanitizeCashAdvanceEntries(
      adjustments?.cashAdvanceEntries ?? existingOverride?.cashAdvanceEntries,
    );
    const nextOvertimeEntries = sanitizeOvertimeEntries(
      adjustments?.overtimeEntries ?? existingOverride?.overtimeEntries,
    );
    const nextPaidLeaveEntries = sanitizePaidLeaveEntries(
      adjustments?.paidLeaveEntries ?? existingOverride?.paidLeaveEntries,
    );
    const nextAllowanceEntries = sanitizeAllowanceEntries(
      adjustments?.allowanceEntries ?? existingOverride?.allowanceEntries,
    );
    const nextDeductionEntries = sanitizeDeductionEntries(
      adjustments?.deductionEntries ?? existingOverride?.deductionEntries,
    );
    const nextCashAdvanceTotal = sumCashAdvance(nextCashAdvanceEntries);
    const nextOvertimeEntriesPayTotal = sumOvertimePay(
      nextOvertimeEntries,
      "approved",
    );
    const nextOvertimeEntriesHoursTotal = sumOvertimeHours(
      nextOvertimeEntries,
      "approved",
    );
    const nextPaidLeaveEntriesPayTotal = sumPaidLeavePay(nextPaidLeaveEntries);
    const nextAllowanceEntriesTotal = sumAllowanceEntries(nextAllowanceEntries);
    const nextDeductionsTotal = sumDeductionEntries(nextDeductionEntries);

    const nextBiometricStatus =
      adjustments?.biometricOvertimeStatus ??
      existingOverride?.biometricOvertimeStatus ??
      null;

    let nextBiometricHours: number | null =
      existingOverride?.biometricOvertimeHours ?? null;
    if (nextBiometricStatus === "approved") {
      nextBiometricHours =
        adjustments?.biometricOvertimeHours != null &&
        Number.isFinite(adjustments.biometricOvertimeHours)
          ? round2(adjustments.biometricOvertimeHours)
          : (existingOverride?.biometricOvertimeHours ?? null);
    } else if (nextBiometricStatus === "rejected") {
      nextBiometricHours = null;
    }

    setPayrollOverrides((prev) => ({
      ...prev,
      [editingPayrollRow.id]: {
        date: normalizedPeriod ?? payrollEditDraft.date.trim(),
        hoursWorked: nextHours,
        overtimeHours: nextOvertime,
        customRate: nextCustomRate,
        logHours: nextLogHours,
        cashAdvanceEntries: nextCashAdvanceEntries,
        overtimeEntries: nextOvertimeEntries,
        paidLeaveEntries: nextPaidLeaveEntries,
        allowanceEntries: nextAllowanceEntries,
        deductionEntries: nextDeductionEntries,
        cashAdvanceTotal: nextCashAdvanceTotal,
        overtimeEntriesPayTotal: nextOvertimeEntriesPayTotal,
        overtimeEntriesHoursTotal: nextOvertimeEntriesHoursTotal,
        paidLeaveEntriesPayTotal: nextPaidLeaveEntriesPayTotal,
        allowanceEntriesTotal: nextAllowanceEntriesTotal,
        deductionsTotal: nextDeductionsTotal,
        biometricOvertimeStatus: nextBiometricStatus,
        biometricOvertimeHours: nextBiometricHours,
      },
    }));

    toast.success("Payroll edit saved", {
      description: `${editingPayrollRow.worker} updated successfully.`,
    });

    closePayrollEditModal();
  }
  function updateLogHour(
    log: DailyLogRow,
    field: keyof LogHourOverride,
    valueText: string,
  ) {
    const normalized = normalizeNumericInput(valueText);
    const value = sanitizeEditableHours(
      Number.parseFloat(normalized),
      field === "regularHours" ? FULL_WORKDAY_HOURS : MAX_LOG_HOURS_PER_DAY,
    );

    setLogHourOverrides((prev) => {
      const key = getLogOverrideKey(log);
      const current = normalizeLogHourOverrideValue(prev[key], {
        regularHours: log.regularHours,
        overtimeHours: log.overtimeHours,
      });

      return {
        ...prev,
        [key]: {
          ...current,
          [field]: value,
        },
      };
    });
  }

  return {
    dailyRows,
    payrollRoleRates,
    setPayrollRoleRates,
    payrollGenerated,
    setPayrollGenerated,
    payrollTab,
    setPayrollTab,
    payrollPage,
    setPayrollPage,
    payrollSiteFilter,
    setPayrollSiteFilter,
    payrollNameFilter,
    setPayrollNameFilter,
    payrollDateFilter,
    setPayrollDateFilter,
    payrollSort,
    setPayrollSort,
    payrollRoleFilter,
    setPayrollRoleFilter,
    showPayrollRateModal,
    payrollRateDraft,
    setPayrollRateDraft,
    employeeBranchRates,
    setEmployeeBranchRates,
    payrollAttendanceInputs,
    payrollOverrides,
    setPayrollOverrides,
    payrollRows,
    payrollBaseComputedRows,
    filteredPayrollRows,
    filteredPayrollLogs,
    paidHolidays,
    setPaidHolidays,
    payrollDateRange,
    payableHolidayDays,
    payrollActiveRowsCount,
    payrollTotalPages,
    payrollPreviewStart,
    payrollPreviewEnd,
    payrollPreviewRows,
    payrollPreviewLogs,
    payrollTotals,
    payrollPages,
    editingPayrollRow,
    editingPayrollSourceRow,
    editingPayrollLogs,
    editingPayrollSummary,
    editingPayrollAdjustments,
    editingPayrollLogsForAnalytics,
    payrollEditDraft,
    setPayrollEditDraft,
    logHourOverrides,
    setLogHourOverrides,
    hasLogHourOverrides,
    clearPayrollFilters,
    resetPayrollState,
    handleGeneratePayroll,
    openPayrollRateModal,
    closePayrollRateModal,
    applyPayrollRates,
    addManualPaidHoliday,
    removePaidHoliday,
    clearPaidHolidays,
    loadPhilippinePaidHolidays,
    openPayrollEditModal,
    closePayrollEditModal,
    savePayrollEdit,
    updateLogHour,
    normalizeNumericInput,
    roleCodes: ROLE_CODES,
  };
}


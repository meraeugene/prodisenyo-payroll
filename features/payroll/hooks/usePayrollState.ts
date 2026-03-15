import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AttendanceRecordInput, PayrollRow } from "@/lib/payrollEngine";
import {
  DEFAULT_DAILY_RATE_BY_ROLE,
  DEFAULT_OVERTIME_MULTIPLIER,
  ROLE_CODES,
  type RoleCode,
} from "@/lib/payrollConfig";
import { exportPayrollToExcel } from "@/lib/payrollExport";
import type { DailyLogRow, Step2Sort } from "@/types";
import { buildVisiblePages } from "@/features/shared/pagination";
import {
  normalizeNumericInput,
  parseNonNegativeOrFallback,
} from "@/features/payroll/utils/payrollFormatters";
import { normalizePeriodLabel } from "@/features/payroll/utils/payrollDateHelpers";
import { getLogOverrideKey } from "@/features/payroll/utils/payrollMappers";
import {
  applyLogHourOverrides,
  buildEditingPayrollLogs,
  buildEditingPayrollSummary,
  buildEmployeeAttendanceBreakdown,
  buildEmployeeClockInConsistency,
  buildEmployeeDailyHoursTrend,
  buildPayrollBaseRows,
  buildPayrollEditPreview,
  buildPayrollRows,
  calculateTotalEditedLogHours,
  filterPayrollLogs,
  filterPayrollRows,
  hasAnyLogHourOverrides,
  mapDailyRowsToAttendanceInputs,
  summarizePayrollTotals,
} from "@/features/payroll/utils/payrollSelectors";
import type { PayrollEditDraft, PayrollRowOverride } from "@/features/payroll/types";

const PREVIEW_LIMIT = 10;

export interface UsePayrollStateArgs {
  dailyRows: DailyLogRow[];
  attendancePeriod: string;
  availableSites: string[];
}

export interface UsePayrollStateResult {
  payrollRoleRates: Record<RoleCode, number>;
  payrollGenerated: boolean;
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
  payrollSaveNotice: string | null;
  showPayrollRateModal: boolean;
  payrollRateDraft: Record<RoleCode, number>;
  setPayrollRateDraft: (
    value:
      | Record<RoleCode, number>
      | ((prev: Record<RoleCode, number>) => Record<RoleCode, number>),
  ) => void;
  payrollAttendanceInputs: AttendanceRecordInput[];
  payrollRows: PayrollRow[];
  filteredPayrollRows: PayrollRow[];
  filteredPayrollLogs: AttendanceRecordInput[];
  payrollActiveRowsCount: number;
  payrollTotalPages: number;
  payrollPreviewStart: number;
  payrollPreviewEnd: number;
  payrollPreviewRows: PayrollRow[];
  payrollPreviewLogs: AttendanceRecordInput[];
  payrollTotals: { hours: number; pay: number };
  payrollPages: number[];
  editingPayrollRow: PayrollRow | null;
  editingPayrollLogs: DailyLogRow[];
  editingPayrollSummary: {
    attendanceDays: number;
    absenceDays: number;
    regularHours: number;
    otNormalHours: number;
  };
  editingPayrollLogsForAnalytics: DailyLogRow[];
  payrollEditDraft: PayrollEditDraft | null;
  setPayrollEditDraft: (
    value: PayrollEditDraft | null | ((prev: PayrollEditDraft | null) => PayrollEditDraft | null),
  ) => void;
  payrollEditPreview: PayrollRow | null;
  logHourOverrides: Record<string, number>;
  setLogHourOverrides: (
    value:
      | Record<string, number>
      | ((prev: Record<string, number>) => Record<string, number>),
  ) => void;
  hasLogHourOverrides: boolean;
  totalEditedLogHours: number;
  employeeDailyHoursTrend: { date: string; isoDate: string; hoursWorked: number }[];
  employeeAttendanceBreakdown: { name: string; value: number }[];
  employeeClockInConsistency: {
    date: string;
    isoDate: string;
    timeIn: number;
    timeInLabel: string;
  }[];
  clearPayrollFilters: () => void;
  resetPayrollState: () => void;
  handleGeneratePayroll: () => boolean;
  handleExportPayroll: () => void;
  openPayrollRateModal: () => void;
  closePayrollRateModal: () => void;
  applyPayrollRates: () => void;
  openPayrollEditModal: (row: PayrollRow) => void;
  closePayrollEditModal: () => void;
  savePayrollEdit: () => void;
  updateLogHour: (log: DailyLogRow, valueText: string) => void;
  normalizeNumericInput: (value: string) => string;
  roleCodes: RoleCode[];
}

export function usePayrollState({
  dailyRows,
  attendancePeriod,
  availableSites,
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
  const [logHourOverrides, setLogHourOverrides] = useState<Record<string, number>>({});
  const [payrollSaveNotice, setPayrollSaveNotice] = useState<string | null>(null);

  const payrollAttendanceInputs = useMemo(
    () => mapDailyRowsToAttendanceInputs(dailyRows),
    [dailyRows],
  );

  const payrollBaseRows = useMemo(
    () =>
      buildPayrollBaseRows(
        payrollAttendanceInputs,
        payrollRoleRates,
        attendancePeriod,
      ),
    [payrollAttendanceInputs, payrollRoleRates, attendancePeriod],
  );

  const payrollRows = useMemo(
    () => buildPayrollRows(payrollBaseRows, payrollOverrides, attendancePeriod),
    [payrollBaseRows, payrollOverrides, attendancePeriod],
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

  const editingPayrollRow = useMemo(
    () => payrollRows.find((row) => row.id === editingPayrollRowId) ?? null,
    [payrollRows, editingPayrollRowId],
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

  const totalEditedLogHours = useMemo(
    () => calculateTotalEditedLogHours(editingPayrollLogsForAnalytics),
    [editingPayrollLogsForAnalytics],
  );

  const employeeDailyHoursTrend = useMemo(
    () => buildEmployeeDailyHoursTrend(editingPayrollLogsForAnalytics),
    [editingPayrollLogsForAnalytics],
  );

  const employeeAttendanceBreakdown = useMemo(
    () => buildEmployeeAttendanceBreakdown(editingPayrollLogsForAnalytics),
    [editingPayrollLogsForAnalytics],
  );

  const employeeClockInConsistency = useMemo(
    () => buildEmployeeClockInConsistency(editingPayrollLogsForAnalytics),
    [editingPayrollLogsForAnalytics],
  );

  const payrollEditPreview = useMemo(
    () =>
      buildPayrollEditPreview(
        editingPayrollRow,
        payrollEditDraft,
        hasLogHourOverrides,
        totalEditedLogHours,
      ),
    [editingPayrollRow, payrollEditDraft, hasLogHourOverrides, totalEditedLogHours],
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
    setPayrollSort("date-asc");
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
    setPayrollSort("date-asc");
    setShowPayrollRateModal(false);
    setPayrollRateDraft(DEFAULT_DAILY_RATE_BY_ROLE);
    setEditingPayrollRowId(null);
    setPayrollEditDraft(null);
    setPayrollOverrides({});
    setPayrollRoleFilter("ALL");
    setLogHourOverrides({});
    setPayrollSaveNotice(null);
    document.body.style.overflow = "auto";
  }

  function handleGeneratePayroll(): boolean {
    if (payrollRows.length === 0) return false;

    setPayrollSaveNotice(null);
    setPayrollGenerated(true);
    setPayrollTab("payroll");
    setPayrollPage(1);
    setPayrollSiteFilter("ALL");
    setPayrollNameFilter("");
    setPayrollDateFilter("");
    setPayrollSort("date-asc");

    return true;
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

  function closePayrollRateModal() {
    setShowPayrollRateModal(false);
    document.body.style.overflow = "auto";
  }

  function applyPayrollRates() {
    setPayrollRoleRates({ ...payrollRateDraft });
    setShowPayrollRateModal(false);
    document.body.style.overflow = "auto";
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
      `Saved ${editingPayrollRow.worker}: ${nextHours.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} hours`,
    );
    toast.success("Payroll edit saved", {
      description: `${editingPayrollRow.worker} updated successfully.`,
    });

    closePayrollEditModal();
  }
  function updateLogHour(log: DailyLogRow, valueText: string) {
    const normalized = normalizeNumericInput(valueText);
    const value = Number.parseFloat(normalized);

    setLogHourOverrides((prev) => ({
      ...prev,
      [getLogOverrideKey(log)]:
        Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : 0,
    }));
  }

  return {
    payrollRoleRates,
    payrollGenerated,
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
    payrollSaveNotice,
    showPayrollRateModal,
    payrollRateDraft,
    setPayrollRateDraft,
    payrollAttendanceInputs,
    payrollRows,
    filteredPayrollRows,
    filteredPayrollLogs,
    payrollActiveRowsCount,
    payrollTotalPages,
    payrollPreviewStart,
    payrollPreviewEnd,
    payrollPreviewRows,
    payrollPreviewLogs,
    payrollTotals,
    payrollPages,
    editingPayrollRow,
    editingPayrollLogs,
    editingPayrollSummary,
    editingPayrollLogsForAnalytics,
    payrollEditDraft,
    setPayrollEditDraft,
    payrollEditPreview,
    logHourOverrides,
    setLogHourOverrides,
    hasLogHourOverrides,
    totalEditedLogHours,
    employeeDailyHoursTrend,
    employeeAttendanceBreakdown,
    employeeClockInConsistency,
    clearPayrollFilters,
    resetPayrollState,
    handleGeneratePayroll,
    handleExportPayroll,
    openPayrollRateModal,
    closePayrollRateModal,
    applyPayrollRates,
    openPayrollEditModal,
    closePayrollEditModal,
    savePayrollEdit,
    updateLogHour,
    normalizeNumericInput,
    roleCodes: ROLE_CODES,
  };
}


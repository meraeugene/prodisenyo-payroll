"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { requestOvertimeApprovalAction } from "@/actions/payroll";
import { useAppState } from "@/features/app/AppStateProvider";
import {
  DEFAULT_OVERTIME_MULTIPLIER,
  ROLE_CODE_TO_NAME,
  type RoleCode,
} from "@/lib/payrollConfig";
import { calculatePayroll, roundPayrollCalculation } from "@/lib/payrollEngine";
import {
  calculatePaidRegularHours,
  UNPAID_BREAK_HOURS_PER_WORKDAY,
} from "@/lib/payrollHours";
import type { DailyLogRow } from "@/types";
import type { UsePayrollStateResult } from "@/features/payroll/hooks/usePayrollState";
import type {
  PayrollAllowanceEntry,
  PayrollCashAdvanceEntry,
  PayrollDeductionEntry,
  PayrollOvertimeEntry,
  PayrollPaidLeaveEntry,
} from "@/features/payroll/types";
import type { AppRole } from "@/types/database";
import {
  extractSiteName,
  formatHumanPayrollPeriod,
  formatLogTime,
  formatPayrollPeriodFromText,
  formatPayrollNumber,
  normalizeNumericInput,
  toWeekLabel,
} from "@/features/payroll/utils/payrollFormatters";
import {
  buildEmployeeBranchRateKey,
  getLogOverrideKey,
} from "@/features/payroll/utils/payrollMappers";
import { DEFAULT_REGULAR_PAID_HOURS } from "@/features/payroll/utils/branchRateConfig";
import {
  buildOvertimeRequestNotes,
  parseOvertimeRequestNotes,
} from "@/features/payroll/utils/overtimeRequestNotes";
import { isIsoDateWithinRange } from "@/features/payroll/utils/payrollDateHelpers";
import { computeSameDayOvertimeMinutes } from "@/lib/utils";
import {
  allocateCombinedBranchPay,
  buildDateSpanFromDates,
  FIXED_PAY_RATE_PER_DAY,
  FULL_WORKDAY_HOURS,
} from "@/features/payroll/utils/payrollSelectors";

import {
  AdjustmentFormType,
  createEntryId,
  formatPeso,
  OVERTIME_ALERT_HOURS,
  parseNonNegativeValue,
  round2,
} from "@/features/payroll/utils/payrollEditModalHelpers";

interface PayrollEditModalProps {
  payroll: UsePayrollStateResult;
  currentUserRole: AppRole | null;
}

const ALL_REPORT_LOGS_PAGE_SIZE = 7;

export default function PayrollEditModal({
  payroll,
  currentUserRole,
}: PayrollEditModalProps) {
  const { currentAttendanceImportId, attendancePeriod } = useAppState();
  const { editingPayrollRow, editingPayrollSourceRow, payrollEditDraft } =
    payroll;

  const [activeAdjustmentForm, setActiveAdjustmentForm] =
    useState<AdjustmentFormType>(null);
  const [cashAdvanceInput, setCashAdvanceInput] = useState("");
  const [cashAdvanceNotes, setCashAdvanceNotes] = useState("");
  const [overtimeHoursInput, setOvertimeHoursInput] = useState("");
  const [overtimePayInput, setOvertimePayInput] = useState("");
  const [overtimeNotes, setOvertimeNotes] = useState("");
  const [paidLeaveDaysInput, setPaidLeaveDaysInput] = useState("");
  const [paidLeaveNotes, setPaidLeaveNotes] = useState("");
  const [allowanceAmountInput, setAllowanceAmountInput] = useState("");
  const [allowanceNotes, setAllowanceNotes] = useState("");
  const [sssGsisInput, setSssGsisInput] = useState("");
  const [philHealthInput, setPhilHealthInput] = useState("");
  const [pagIbigInput, setPagIbigInput] = useState("");
  const [withholdingTaxInput, setWithholdingTaxInput] = useState("");
  const [otherDeductionsInput, setOtherDeductionsInput] = useState("");
  const [cashAdvanceEntries, setCashAdvanceEntries] = useState<
    PayrollCashAdvanceEntry[]
  >([]);
  const [overtimeEntries, setOvertimeEntries] = useState<
    PayrollOvertimeEntry[]
  >([]);
  const [paidLeaveEntries, setPaidLeaveEntries] = useState<
    PayrollPaidLeaveEntry[]
  >([]);
  const [allowanceEntries, setAllowanceEntries] = useState<
    PayrollAllowanceEntry[]
  >([]);
  const [deductionEntries, setDeductionEntries] = useState<
    PayrollDeductionEntry[]
  >([]);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [overtimeValidationMessage, setOvertimeValidationMessage] = useState<
    string | null
  >(null);
  const [biometricOvertimeStatus, setBiometricOvertimeStatus] = useState<
    "approved" | "rejected" | null
  >(null);
  const [confirmBiometricOvertimeStatus, setConfirmBiometricOvertimeStatus] =
    useState<"approved" | "rejected" | null>(null);
  const [allReportLogsPage, setAllReportLogsPage] = useState(1);
  const isPayrollManager = currentUserRole === "payroll_manager";

  useEffect(() => {
    setActiveAdjustmentForm(null);
    setCashAdvanceInput("");
    setCashAdvanceNotes("");
    setOvertimeHoursInput("");
    setOvertimePayInput("");
    setOvertimeNotes("");
    setPaidLeaveDaysInput("");
    setPaidLeaveNotes("");
    setAllowanceAmountInput("");
    setAllowanceNotes("");
    const deductionEntry =
      payroll.editingPayrollAdjustments.deductionEntries[0] ?? null;
    setSssGsisInput(
      deductionEntry
        ? normalizeNumericInput(String(deductionEntry.sssGsis))
        : "",
    );
    setPhilHealthInput(
      deductionEntry
        ? normalizeNumericInput(String(deductionEntry.philHealth))
        : "",
    );
    setPagIbigInput(
      deductionEntry
        ? normalizeNumericInput(String(deductionEntry.pagIbig))
        : "",
    );
    setWithholdingTaxInput(
      deductionEntry
        ? normalizeNumericInput(String(deductionEntry.withholdingTax))
        : "",
    );
    setOtherDeductionsInput(
      deductionEntry
        ? normalizeNumericInput(String(deductionEntry.otherDeductions))
        : "",
    );
    setCashAdvanceEntries([
      ...payroll.editingPayrollAdjustments.cashAdvanceEntries,
    ]);
    setOvertimeEntries([...payroll.editingPayrollAdjustments.overtimeEntries]);
    setPaidLeaveEntries([
      ...payroll.editingPayrollAdjustments.paidLeaveEntries,
    ]);
    setAllowanceEntries([
      ...payroll.editingPayrollAdjustments.allowanceEntries,
    ]);
    setDeductionEntries([
      ...payroll.editingPayrollAdjustments.deductionEntries,
    ]);
    setBiometricOvertimeStatus(
      payroll.editingPayrollAdjustments.biometricOvertimeStatus,
    );
    setConfirmBiometricOvertimeStatus(null);
    setAllReportLogsPage(1);
  }, [editingPayrollRow?.id, payroll.editingPayrollAdjustments]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(payroll.editingPayrollLogs.length / ALL_REPORT_LOGS_PAGE_SIZE),
    );

    setAllReportLogsPage((page) => Math.min(page, totalPages));
  }, [payroll.editingPayrollLogs.length]);

  const payableHolidayDateSet = useMemo(() => {
    const range = payroll.payrollDateRange;
    if (!range || payroll.paidHolidays.length === 0) {
      return new Set<string>();
    }
    return new Set(
      payroll.paidHolidays
        .filter((holiday) =>
          isIsoDateWithinRange(holiday.date, range.start, range.end),
        )
        .map((holiday) => holiday.date),
    );
  }, [payroll.paidHolidays, payroll.payrollDateRange]);

  if (!editingPayrollRow || !payrollEditDraft) return null;

  function getEditableRegularHours(log: DailyLogRow): number {
    const key = getLogOverrideKey(log);
    return payroll.logHourOverrides[key]?.regularHours ?? log.regularHours;
  }

  function getEditableOvertimeHours(log: DailyLogRow): number {
    const key = getLogOverrideKey(log);
    return payroll.logHourOverrides[key]?.overtimeHours ?? log.overtimeHours;
  }

  function getEditableTotalHours(log: DailyLogRow): number {
    return round2(getEditableRegularHours(log) + getEditableOvertimeHours(log));
  }

  function getEditableRegularHoursValue(log: DailyLogRow): string {
    return normalizeNumericInput(String(getEditableRegularHours(log)));
  }

  function getEditableOvertimeHoursValue(log: DailyLogRow): string {
    return normalizeNumericInput(String(getEditableOvertimeHours(log)));
  }

  function renderBiometricTimeCell(params: {
    value: string;
    isPaidHoliday: boolean;
    showMissedWhenEmpty?: boolean;
  }) {
    const { value, isPaidHoliday, showMissedWhenEmpty = true } = params;

    if (value) {
      return formatLogTime(value);
    }

    if (isPaidHoliday) {
      return "-";
    }

    if (!showMissedWhenEmpty) {
      return "--";
    }

    return <span className="text-red-500">Missed</span>;
  }

  const loggedSites = Array.from(
    new Set(
      payroll.editingPayrollLogs
        .map((log) => extractSiteName(log.site))
        .filter((site) => site.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const loggedSitesLabel =
    loggedSites.length > 0
      ? loggedSites.join(", ")
      : extractSiteName(editingPayrollRow.site) || "-";
  const primarySiteSource =
    payroll.editingPayrollLogs.find(
      (log) => extractSiteName(log.site).length > 0,
    )?.site ?? editingPayrollRow.site;
  const editingLogDateSpan = buildDateSpanFromDates(
    payroll.editingPayrollLogs.map((log) => log.date),
  );
  const primarySitePeriodLabel =
    (editingLogDateSpan
      ? formatHumanPayrollPeriod(
          editingLogDateSpan.start,
          editingLogDateSpan.end,
        )
      : null) ??
    (payroll.payrollDateRange
      ? formatHumanPayrollPeriod(
          payroll.payrollDateRange.start,
          payroll.payrollDateRange.end,
        )
      : null) ??
    formatPayrollPeriodFromText(primarySiteSource) ??
    formatPayrollPeriodFromText(editingPayrollRow.date);
  const currentLogsForPay = payroll.editingPayrollLogsForAnalytics;
  const getSiteRateConfig = (siteName: string) =>
    payroll.employeeBranchRates[
      buildEmployeeBranchRateKey(
        editingPayrollRow.worker,
        editingPayrollRow.role,
        siteName,
      )
    ];
  const totalWorkedHours = round2(
    currentLogsForPay.reduce((sum, log) => sum + log.totalHours, 0),
  );
  const actualRegularHours = currentLogsForPay.reduce(
    (sum, log) => sum + log.regularHours,
    0,
  );
  const regularWorkedHours = round2(
    currentLogsForPay.reduce((sum, log) => {
      const siteName = extractSiteName(log.site) || log.site;
      return (
        sum +
        calculatePaidRegularHours(log.regularHours)
      );
    }, 0),
  );
  const sitePayBreakdown = loggedSites.map((site) => {
    const siteLogs = currentLogsForPay.filter(
      (log) => extractSiteName(log.site) === site,
    );
    const siteHours = round2(
      siteLogs.reduce(
        (sum, log) =>
          sum +
          calculatePaidRegularHours(log.regularHours),
        0,
      ),
    );
    const siteRateKey = buildEmployeeBranchRateKey(
      editingPayrollRow.worker,
      editingPayrollRow.role,
      site,
    );
    const siteRateConfig = payroll.employeeBranchRates[siteRateKey];
    const siteRatePerDay = round2(
      siteRateConfig?.dailyRate ??
        (editingPayrollRow.customRate ?? editingPayrollRow.defaultRate) *
          FULL_WORKDAY_HOURS,
    );
    return {
      site,
      hours: siteHours,
      ratePerDay: siteRatePerDay,
      regularPaidHours:
        siteRateConfig?.regularPaidHours ?? DEFAULT_REGULAR_PAID_HOURS,
    };
  });
  const branchPayInputs = sitePayBreakdown.map((entry) => ({
    site: entry.site,
    hoursWorked: entry.hours,
    dailyRatePerDay: entry.ratePerDay,
    regularPaidHours: entry.regularPaidHours,
  }));
  const branchPayAllocation = allocateCombinedBranchPay(branchPayInputs);
  const sitePayBreakdownWithAllocation = sitePayBreakdown.map((entry) => {
    const allocation =
      branchPayAllocation.breakdown.find((item) => item.site === entry.site) ??
      null;

    return {
      ...entry,
      payableHours: allocation?.payableHours ?? 0,
      payableDays: allocation?.payableDays ?? 0,
      basePay: allocation?.basePay ?? 0,
    };
  });
  const currentRatePerDay = round2(
    sitePayBreakdownWithAllocation[0]?.ratePerDay ??
      (editingPayrollRow.customRate ?? editingPayrollRow.defaultRate) *
        FULL_WORKDAY_HOURS,
  );
  const daysWorked = currentLogsForPay.filter((log) => log.totalHours > 0).length;
  const unpaidBreakHours = round2(
    currentLogsForPay.filter((log) => log.regularHours > 0).length *
      UNPAID_BREAK_HOURS_PER_WORKDAY,
  );
  const paidHolidayBonusDays = payroll.payableHolidayDays;
  const underHoursLogs = currentLogsForPay.filter(
    (log) =>
      log.hours > 0 &&
      log.regularHours < FULL_WORKDAY_HOURS &&
      !payableHolidayDateSet.has(log.date),
  );
  const highOvertimeHoursLogs = currentLogsForPay.filter(
    (log) =>
      log.totalHours >= OVERTIME_ALERT_HOURS &&
      !payableHolidayDateSet.has(log.date),
  );
  const overtimeLogs = currentLogsForPay.filter(
    (log) =>
      computeSameDayOvertimeMinutes(log.otIn, log.otOut) > 0 &&
      !payableHolidayDateSet.has(log.date),
  );
  const hasHoursReviewWarning =
    underHoursLogs.length > 0 || highOvertimeHoursLogs.length > 0;
  const allReportLogsCount = payroll.editingPayrollLogs.length;
  const allReportLogsTotalPages = Math.max(
    1,
    Math.ceil(allReportLogsCount / ALL_REPORT_LOGS_PAGE_SIZE),
  );
  const allReportLogsPreviewStart =
    (allReportLogsPage - 1) * ALL_REPORT_LOGS_PAGE_SIZE;
  const allReportLogsPreviewEnd =
    allReportLogsPreviewStart + ALL_REPORT_LOGS_PAGE_SIZE;
  const visibleAllReportLogs = payroll.editingPayrollLogs.slice(
    allReportLogsPreviewStart,
    allReportLogsPreviewEnd,
  );
  const baseWorkedPay =
    sitePayBreakdownWithAllocation.length > 0
      ? branchPayAllocation.totalBasePay
      : 0;
  const paidHolidayPay = round2(paidHolidayBonusDays * FIXED_PAY_RATE_PER_DAY);
  const belowFullDayThreshold =
    totalWorkedHours > 0 && branchPayAllocation.totalPayableHours === 0;
  const cashAdvanceAmount = cashAdvanceEntries.reduce(
    (sum, entry) => sum + entry.amount,
    0,
  );
  const approvedOvertimeEntries = overtimeEntries.filter(
    (entry) => entry.status === "approved",
  );
  const pendingOvertimeEntries = overtimeEntries.filter(
    (entry) => (entry.status ?? "pending") === "pending",
  );
  const rejectedOvertimeEntries = overtimeEntries.filter(
    (entry) => entry.status === "rejected",
  );
  const approvedOvertimeHours = approvedOvertimeEntries.reduce(
    (sum, entry) => sum + entry.hours,
    0,
  );
  const biometricOvertimeHours = round2(
    currentLogsForPay.reduce(
      (sum, log) =>
        payableHolidayDateSet.has(log.date) ? sum : sum + log.overtimeHours,
      0,
    ),
  );
  const hasBiometricOvertime = biometricOvertimeHours > 0;
  const confirmedBiometricOvertimeHours =
    biometricOvertimeStatus === "approved" ? biometricOvertimeHours : 0;
  const biometricOvertimePay = roundPayrollCalculation(
    calculatePayroll({
      dailyRate: currentRatePerDay,
      regularHours: 0,
      overtimeHours: biometricOvertimeHours,
      overtimeMultiplier: DEFAULT_OVERTIME_MULTIPLIER,
      allowance: 0,
      deductions: 0,
    }),
  ).overtimePay;
  const confirmedBiometricOvertimePay =
    biometricOvertimeStatus === "approved" ? biometricOvertimePay : 0;
  const approvedOvertimePay = roundPayrollCalculation(
    calculatePayroll({
      dailyRate: currentRatePerDay,
      regularHours: 0,
      overtimeHours: approvedOvertimeHours,
      overtimeMultiplier: DEFAULT_OVERTIME_MULTIPLIER,
      allowance: 0,
      deductions: 0,
    }),
  ).overtimePay;
  const payableOvertimeHours = round2(
    confirmedBiometricOvertimeHours + approvedOvertimeHours,
  );
  const payableOvertimePay = round2(
    confirmedBiometricOvertimePay + approvedOvertimePay,
  );
  const pendingOvertimePay = pendingOvertimeEntries.reduce(
    (sum, entry) => sum + entry.pay,
    0,
  );
  const rejectedOvertimePay = rejectedOvertimeEntries.reduce(
    (sum, entry) => sum + entry.pay,
    0,
  );
  const formatOvertimeEntryNote = (entry: PayrollOvertimeEntry) => {
    const parsed = parseOvertimeRequestNotes(entry.notes);
    if (entry.status === "rejected" && parsed.rejectionReason) {
      return `Return note: ${parsed.rejectionReason}`;
    }

    return parsed.displayNotes;
  };
  const paidLeavePay = paidLeaveEntries.reduce(
    (sum, entry) => sum + entry.pay,
    0,
  );
  const allowancePay = allowanceEntries.reduce(
    (sum, entry) => sum + entry.amount,
    0,
  );
  const deductionTotals = deductionEntries.reduce(
    (totals, entry) => ({
      sssGsis: totals.sssGsis + entry.sssGsis,
      philHealth: totals.philHealth + entry.philHealth,
      pagIbig: totals.pagIbig + entry.pagIbig,
      withholdingTax: totals.withholdingTax + entry.withholdingTax,
      otherDeductions: totals.otherDeductions + entry.otherDeductions,
    }),
    {
      sssGsis: 0,
      philHealth: 0,
      pagIbig: 0,
      withholdingTax: 0,
      otherDeductions: 0,
    },
  );
  const payrollDeductionsAmount = round2(
    deductionTotals.sssGsis +
      deductionTotals.philHealth +
      deductionTotals.pagIbig +
      deductionTotals.withholdingTax +
      deductionTotals.otherDeductions,
  );
  const deductionDetailItems = [
    { label: "SSS/GSIS", amount: deductionTotals.sssGsis },
    { label: "PhilHealth", amount: deductionTotals.philHealth },
    { label: "Pag-IBIG", amount: deductionTotals.pagIbig },
    { label: "Withholding Tax", amount: deductionTotals.withholdingTax },
    { label: "Other deductions", amount: deductionTotals.otherDeductions },
  ].filter((item) => item.amount > 0);
  const finalPayrollCalculation = roundPayrollCalculation(
    calculatePayroll({
      dailyRate: currentRatePerDay,
      regularHours: regularWorkedHours,
      overtimeHours: confirmedBiometricOvertimeHours + approvedOvertimeHours,
      overtimeMultiplier: DEFAULT_OVERTIME_MULTIPLIER,
      allowance: paidHolidayPay + paidLeavePay + allowancePay,
      deductions: {
        cashAdvance: cashAdvanceAmount,
        sssGsis: deductionTotals.sssGsis,
        philHealth: deductionTotals.philHealth,
        pagIbig: deductionTotals.pagIbig,
        withholdingTax: deductionTotals.withholdingTax,
        otherDeductions: deductionTotals.otherDeductions,
      },
    }),
  );
  const grossPay = finalPayrollCalculation.grossPay;
  const adjustedTotalPay = finalPayrollCalculation.netPay;

  function addCashAdvance() {
    const amount = parseNonNegativeValue(cashAdvanceInput);
    if (amount <= 0) return;

    setCashAdvanceEntries((prev) => [
      ...prev,
      {
        id: createEntryId(),
        amount: Number(amount.toFixed(2)),
        notes: cashAdvanceNotes.trim(),
      },
    ]);
    setCashAdvanceInput("");
    setCashAdvanceNotes("");
    setActiveAdjustmentForm(null);
  }

  function addOvertime() {
    const hours = parseNonNegativeValue(overtimeHoursInput);
    const enteredPay = parseNonNegativeValue(overtimePayInput);
    const calculatedPay = roundPayrollCalculation(
      calculatePayroll({
        dailyRate: currentRatePerDay,
        regularHours: 0,
        overtimeHours: hours,
        overtimeMultiplier: DEFAULT_OVERTIME_MULTIPLIER,
        allowance: 0,
        deductions: 0,
      }),
    ).overtimePay;
    const pay = enteredPay > 0 ? enteredPay : calculatedPay;
    if (hours <= 0 && pay <= 0) {
      setOvertimeValidationMessage(
        "Add overtime hours or overtime pay before submitting.",
      );
      return;
    }
    if (hours <= 0) {
      setOvertimeValidationMessage("Overtime hours must be greater than 0.");
      return;
    }
    setOvertimeEntries((prev) => [
      ...prev,
      {
        id: createEntryId(),
        requestId: null,
        hours: Number(hours.toFixed(2)),
        pay: Number(pay.toFixed(2)),
        notes: overtimeNotes.trim(),
        status: "pending",
      },
    ]);
    setOvertimeValidationMessage(null);
    setOvertimeHoursInput("");
    setOvertimePayInput("");
    setOvertimeNotes("");
    setActiveAdjustmentForm(null);
  }

  function addPaidLeave() {
    const days = parseNonNegativeValue(paidLeaveDaysInput);
    if (days <= 0) return;
    const pay = Number((days * currentRatePerDay).toFixed(2));

    setPaidLeaveEntries((prev) => [
      ...prev,
      {
        id: createEntryId(),
        days: Number(days.toFixed(2)),
        pay,
        notes: paidLeaveNotes.trim(),
      },
    ]);
    setPaidLeaveDaysInput("");
    setPaidLeaveNotes("");
    setActiveAdjustmentForm(null);
  }

  function addAllowance() {
    const amount = parseNonNegativeValue(allowanceAmountInput);
    if (amount <= 0) return;

    setAllowanceEntries((prev) => [
      ...prev,
      {
        id: createEntryId(),
        amount: Number(amount.toFixed(2)),
        notes: allowanceNotes.trim(),
      },
    ]);
    setAllowanceAmountInput("");
    setAllowanceNotes("");
    setActiveAdjustmentForm(null);
  }

  function saveReductions() {
    if (!isPayrollManager) return;

    const entry: PayrollDeductionEntry = {
      id: deductionEntries[0]?.id ?? createEntryId(),
      sssGsis: round2(parseNonNegativeValue(sssGsisInput)),
      philHealth: round2(parseNonNegativeValue(philHealthInput)),
      pagIbig: round2(parseNonNegativeValue(pagIbigInput)),
      withholdingTax: round2(parseNonNegativeValue(withholdingTaxInput)),
      otherDeductions: round2(parseNonNegativeValue(otherDeductionsInput)),
    };
    const total =
      entry.sssGsis +
      entry.philHealth +
      entry.pagIbig +
      entry.withholdingTax +
      entry.otherDeductions;

    setDeductionEntries(total > 0 ? [entry] : []);
    setActiveAdjustmentForm(null);
  }

  function clearReductions() {
    if (!isPayrollManager) return;

    setDeductionEntries([]);
    setSssGsisInput("");
    setPhilHealthInput("");
    setPagIbigInput("");
    setWithholdingTaxInput("");
    setOtherDeductionsInput("");
    setActiveAdjustmentForm(null);
  }

  function removeCashAdvance(id: string) {
    setCashAdvanceEntries((prev) => prev.filter((entry) => entry.id !== id));
  }

  function removeOvertime(id: string) {
    setOvertimeEntries((prev) => prev.filter((entry) => entry.id !== id));
  }

  function removeAllowance(id: string) {
    setAllowanceEntries((prev) => prev.filter((entry) => entry.id !== id));
  }

  async function handleSaveChanges() {
    if (!editingPayrollRow || isSavingChanges) return;

    setIsSavingChanges(true);
    try {
      const nextPendingEntries = pendingOvertimeEntries.map((entry) => ({
        ...entry,
        notes: buildOvertimeRequestNotes(
          parseOvertimeRequestNotes(entry.notes).displayNotes,
          currentLogsForPay,
        ),
        status: "pending" as const,
      }));

      const approvedEntries = approvedOvertimeEntries.map((entry) => ({
        ...entry,
        status: "approved" as const,
      }));

      const result = await requestOvertimeApprovalAction({
        attendanceImportId: currentAttendanceImportId,
        employeeName: editingPayrollRow.worker,
        roleCode: editingPayrollRow.role,
        siteName: editingPayrollSourceRow?.site ?? editingPayrollRow.site,
        attendancePeriod,
        overtimeEntries: nextPendingEntries,
      });

      payroll.savePayrollEdit({
        cashAdvanceEntries,
        overtimeEntries: [...approvedEntries, ...result.entries],
        paidLeaveEntries,
        allowanceEntries,
        deductionEntries: isPayrollManager
          ? deductionEntries
          : payroll.editingPayrollAdjustments.deductionEntries,
        biometricOvertimeStatus,
        biometricOvertimeHours:
          biometricOvertimeStatus === "approved"
            ? biometricOvertimeHours
            : null,
      });

      if (result.entries.length > 0) {
        toast.success("Overtime request sent", {
          description:
            "The request is now in the CEO approval queue and will recalculate once approved.",
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to submit overtime request.",
      );
    } finally {
      setIsSavingChanges(false);
    }
  }

  function removePaidLeave(id: string) {
    setPaidLeaveEntries((prev) => prev.filter((entry) => entry.id !== id));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-0 sm:p-4">
      <div className="flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden rounded-none border border-apple-mist bg-white shadow-apple-xs sm:h-auto sm:max-h-[88vh] sm:rounded-lg">
        <div className="sticky top-0 z-10 border-b border-apple-mist bg-white px-5 py-4 sm:px-7 flex items-start justify-between gap-3">
          <div>
            <p className="text-2xs font-semibold  uppercase tracking-widest">
              Calculation Details
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {/* Employee */}
              <h3 className="text-lg font-semibold text-apple-charcoal tracking-tight">
                {editingPayrollRow.worker}
              </h3>

              <span className="text-apple-silver">&middot;</span>

              {/* Role */}
              <span className="rounded-full bg-sky-700 px-2.5 py-1 text-xs font-medium text-white">
                {ROLE_CODE_TO_NAME[editingPayrollRow.role as RoleCode] ??
                  "Unknown Role"}
              </span>

              <span className="text-apple-silver">&middot;</span>

              {/* Site */}
              <span className="text-sm ">{loggedSitesLabel}</span>
              {primarySitePeriodLabel && (
                <>
                  <span className="text-apple-silver">&middot;</span>
                  <span className="text-sm text-emerald-700">
                    {primarySitePeriodLabel}
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={payroll.closePayrollEditModal}
            className="flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-xl bg-emerald-100 text-emerald-800 transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:h-8 sm:w-8 sm:rounded-full"
          >
            <X size={18} className="sm:h-4 sm:w-4" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6 [scrollbar-gutter:stable]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-apple-mist bg-white">
              <div className="px-4 py-3 border-b border-apple-mist">
                <p className="text-2xs font-semibold uppercase tracking-widest">
                  Adjustments
                </p>
              </div>
              <div className="w-full space-y-4 p-4 sm:p-5">
                {/* ─── BUTTONS (SAME WIDTH) ─── */}
                <div className="grid w-full grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {[
                    { key: "cashAdvance", label: "Cash Advance" },
                    { key: "overtime", label: "Overtime" },
                    { key: "paidLeave", label: "Paid Leave" },
                    { key: "allowance", label: "Allowance" },
                    ...(isPayrollManager
                      ? [{ key: "reductions", label: "Reductions" }]
                      : []),
                  ].map((btn) => {
                    const active = activeAdjustmentForm === btn.key;

                    return (
                      <button
                        key={btn.key}
                        type="button"
                        onClick={() =>
                          setActiveAdjustmentForm((prev) =>
                            prev === btn.key ? null : (btn.key as any),
                          )
                        }
                        className={`h-10 w-full rounded-xl border px-4 text-sm font-semibold transition ${
                          active
                            ? "bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800"
                            : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        + Add {btn.label}
                      </button>
                    );
                  })}
                </div>

                {/* ─── CASH ADVANCE ─── */}
                {activeAdjustmentForm === "cashAdvance" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      addCashAdvance();
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-apple-snow/40 p-4 space-y-4"
                  >
                    <div className="flex flex-wrap gap-4">
                      <div className="flex flex-col w-full sm:w-[240px]">
                        <label className="text-xs text-gray-500 mb-1">
                          Cash Advance Amount
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={cashAdvanceInput}
                          onChange={(e) =>
                            setCashAdvanceInput(
                              normalizeNumericInput(e.target.value),
                            )
                          }
                          className="h-10 px-3 rounded-xl border border-apple-charcoal/40  hover:border-apple-charcoal focus:outline-none  text-sm font-semibold focus:bg-white focus:border-black"
                        />
                      </div>

                      <div className="flex flex-col flex-1">
                        <label className="text-xs text-gray-500 mb-1">
                          Notes
                        </label>
                        <input
                          type="text"
                          placeholder="(Optional)"
                          value={cashAdvanceNotes}
                          onChange={(e) => setCashAdvanceNotes(e.target.value)}
                          className="h-10 px-3 rounded-xl border border-apple-charcoal/40  hover:border-apple-charcoal focus:outline-none  text-sm  focus:bg-white focus:border-black"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setActiveAdjustmentForm(null)}
                        className="h-9 w-full rounded-lg px-4 text-sm text-gray-500 hover:bg-gray-100 sm:w-auto"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="h-9 w-full rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 sm:w-auto"
                      >
                        Add Cash Advance
                      </button>
                    </div>
                  </form>
                )}

                {/* ─── OVERTIME ─── */}
                {activeAdjustmentForm === "overtime" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      addOvertime();
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-apple-snow/40 p-4 space-y-4"
                  >
                    <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800">
                      Submit the payroll report after adding overtime so this
                      request can be submitted for CEO approval.
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex flex-col w-full sm:w-[200px]">
                        <label className="text-xs text-gray-500 mb-1">
                          Overtime Hours
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={overtimeHoursInput}
                          onChange={(e) => {
                            setOvertimeHoursInput(
                              normalizeNumericInput(e.target.value),
                            );
                            setOvertimeValidationMessage(null);
                          }}
                          className="h-10 px-3 rounded-xl border border-apple-charcoal/40  hover:border-apple-charcoal focus:outline-none  text-sm  focus:bg-white focus:border-black"
                        />
                      </div>

                      <div className="flex flex-col w-full sm:w-[200px]">
                        <label className="text-xs text-gray-500 mb-1">
                          Overtime Pay (₱)
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={overtimePayInput}
                          onChange={(e) => {
                            setOvertimePayInput(
                              normalizeNumericInput(e.target.value),
                            );
                            setOvertimeValidationMessage(null);
                          }}
                          className="h-10 px-3 rounded-xl border border-apple-charcoal/40  hover:border-apple-charcoal focus:outline-none  text-sm  focus:bg-white focus:border-black"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-xs text-gray-500 mb-1">
                        Notes
                      </label>
                      <input
                        type="text"
                        placeholder="(Optional)"
                        value={overtimeNotes}
                        onChange={(e) => {
                          setOvertimeNotes(e.target.value);
                          setOvertimeValidationMessage(null);
                        }}
                        className="h-10 px-3 rounded-xl border border-apple-charcoal/40  hover:border-apple-charcoal focus:outline-none  text-sm  focus:bg-white focus:border-black"
                      />
                    </div>

                    {overtimeValidationMessage ? (
                      <p className="text-xs font-medium text-red-600">
                        {overtimeValidationMessage}
                      </p>
                    ) : null}

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setOvertimeValidationMessage(null);
                          setActiveAdjustmentForm(null);
                        }}
                        className="h-9 w-full rounded-lg px-4 text-sm text-gray-500 hover:bg-gray-100 sm:w-auto"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={
                          parseNonNegativeValue(overtimeHoursInput) <= 0
                        }
                        className="h-9 w-full rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      >
                        Add Overtime
                      </button>
                    </div>
                  </form>
                )}

                {/* ─── PAID LEAVE ─── */}
                {activeAdjustmentForm === "paidLeave" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      addPaidLeave();
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-apple-snow/40 p-4 space-y-4"
                  >
                    <div className="flex flex-wrap gap-4">
                      <div className="flex flex-col w-full sm:w-[200px]">
                        <label className="text-xs text-gray-500 mb-1">
                          Days
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={paidLeaveDaysInput}
                          onChange={(e) =>
                            setPaidLeaveDaysInput(
                              normalizeNumericInput(e.target.value),
                            )
                          }
                          className="h-10 px-3 rounded-xl border border-apple-charcoal/40  hover:border-apple-charcoal focus:outline-none  text-sm  focus:bg-white focus:border-black"
                        />
                      </div>

                      <div className="flex flex-col flex-1">
                        <label className="text-xs text-gray-500 mb-1">
                          Notes
                        </label>
                        <input
                          type="text"
                          placeholder="(Optional)"
                          value={paidLeaveNotes}
                          onChange={(e) => setPaidLeaveNotes(e.target.value)}
                          className="h-10 px-3 rounded-xl border border-apple-charcoal/40  hover:border-apple-charcoal focus:outline-none  text-sm  focus:bg-white focus:border-black"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setActiveAdjustmentForm(null)}
                        className="h-9 w-full rounded-lg px-4 text-sm text-gray-500 hover:bg-gray-100 sm:w-auto"
                      >
                        Cancel
                      </button>
                      <button className="h-9 w-full rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 sm:w-auto">
                        Add Paid Leave
                      </button>
                    </div>
                  </form>
                )}

                {/* ─── ALLOWANCE ─── */}
                {activeAdjustmentForm === "allowance" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      addAllowance();
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-apple-snow/40 p-4 space-y-4"
                  >
                    <div className="flex flex-wrap gap-4">
                      <div className="flex flex-col w-full sm:w-[240px]">
                        <label className="text-xs text-gray-500 mb-1">
                          Allowance Amount
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={allowanceAmountInput}
                          onChange={(e) =>
                            setAllowanceAmountInput(
                              normalizeNumericInput(e.target.value),
                            )
                          }
                          className="h-10 px-3 rounded-xl border border-apple-charcoal/40 hover:border-apple-charcoal focus:outline-none text-sm font-semibold focus:bg-white focus:border-black"
                        />
                      </div>

                      <div className="flex flex-col flex-1">
                        <label className="text-xs text-gray-500 mb-1">
                          Notes
                        </label>
                        <input
                          type="text"
                          placeholder="(Optional)"
                          value={allowanceNotes}
                          onChange={(e) => setAllowanceNotes(e.target.value)}
                          className="h-10 px-3 rounded-xl border border-apple-charcoal/40 hover:border-apple-charcoal focus:outline-none text-sm focus:bg-white focus:border-black"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setActiveAdjustmentForm(null)}
                        className="h-9 w-full rounded-lg px-4 text-sm text-gray-500 hover:bg-gray-100 sm:w-auto"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="h-9 w-full rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 sm:w-auto"
                      >
                        Add Allowance
                      </button>
                    </div>
                  </form>
                )}

                {/* REDUCTIONS */}
                {activeAdjustmentForm === "reductions" && isPayrollManager && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveReductions();
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-apple-snow/40 p-4 space-y-4"
                  >
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                      Reductions are deducted from gross pay and can only be
                      edited by the payroll manager.
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        {
                          label: "SSS / GSIS",
                          value: sssGsisInput,
                          setter: setSssGsisInput,
                        },
                        {
                          label: "PhilHealth",
                          value: philHealthInput,
                          setter: setPhilHealthInput,
                        },
                        {
                          label: "Pag-IBIG",
                          value: pagIbigInput,
                          setter: setPagIbigInput,
                        },
                        {
                          label: "Withholding Tax",
                          value: withholdingTaxInput,
                          setter: setWithholdingTaxInput,
                        },
                        {
                          label: "Other deductions",
                          value: otherDeductionsInput,
                          setter: setOtherDeductionsInput,
                        },
                      ].map((field) => (
                        <div key={field.label} className="flex flex-col">
                          <label className="text-xs text-gray-500 mb-1">
                            {field.label}
                          </label>
                          <input
                            type="number"
                            placeholder="0"
                            value={field.value}
                            onChange={(e) =>
                              field.setter(
                                normalizeNumericInput(e.target.value),
                              )
                            }
                            className="h-10 px-3 rounded-xl border border-apple-charcoal/40 hover:border-apple-charcoal focus:outline-none text-sm font-semibold focus:bg-white focus:border-black"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setActiveAdjustmentForm(null)}
                        className="h-9 w-full rounded-lg px-4 text-sm text-gray-500 hover:bg-gray-100 sm:w-auto"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={clearReductions}
                        className="h-9 w-full rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-600 hover:bg-red-50 sm:w-auto"
                      >
                        Clear Reductions
                      </button>
                      <button
                        type="submit"
                        className="h-9 w-full rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 sm:w-auto"
                      >
                        Save Reductions
                      </button>
                    </div>
                  </form>
                )}

                {/* ─── ENTRIES ─── */}
                {(cashAdvanceEntries.length > 0 ||
                  overtimeEntries.length > 0 ||
                  paidLeaveEntries.length > 0 ||
                  allowanceEntries.length > 0 ||
                  deductionEntries.length > 0) && (
                  <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
                    {cashAdvanceEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 text-sm"
                      >
                        <span className="font-semibold text-red-500">
                          Cash Advance -{formatPeso(entry.amount)}
                        </span>

                        {entry.notes && (
                          <span className="text-xs text-gray-500 truncate">
                            {entry.notes}
                          </span>
                        )}

                        <button
                          onClick={() => removeCashAdvance(entry.id)}
                          className="ml-auto p-1 rounded-md  text-red-500 hover:bg-red-100 hover:text-red-600 bg-red-50 transition"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}

                    {overtimeEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 text-sm"
                      >
                        <span className="font-semibold text-emerald-600">
                          Overtime +{formatPeso(entry.pay)}
                        </span>

                        <span className="text-xs text-gray-500">
                          ({entry.hours} hrs)
                        </span>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            entry.status === "approved"
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                              : entry.status === "rejected"
                                ? "border border-[#cfe3d3] bg-[#eef7f0] text-[#2d6a4f]"
                                : "border border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {entry.status === "approved"
                            ? "Approved"
                            : entry.status === "rejected"
                              ? "Returned"
                              : "Pending"}
                        </span>

                        {formatOvertimeEntryNote(entry) && (
                          <span className="text-xs text-gray-500 truncate">
                            {formatOvertimeEntryNote(entry)}
                          </span>
                        )}

                        {entry.status !== "approved" ? (
                          <button
                            onClick={() => removeOvertime(entry.id)}
                            className="ml-auto p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                          >
                            <X size={14} />
                          </button>
                        ) : null}
                      </div>
                    ))}

                    {paidLeaveEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 text-sm"
                      >
                        <span className="font-semibold text-emerald-600">
                          Paid Leave +{formatPeso(entry.pay)}
                        </span>

                        <span className="text-xs text-gray-500">
                          ({entry.days} days)
                        </span>

                        {entry.notes && (
                          <span className="text-xs text-gray-500 truncate">
                            {entry.notes}
                          </span>
                        )}

                        <button
                          onClick={() => removePaidLeave(entry.id)}
                          className="ml-auto p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}

                    {allowanceEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 text-sm"
                      >
                        <span className="font-semibold text-emerald-600">
                          Allowance +{formatPeso(entry.amount)}
                        </span>

                        {entry.notes && (
                          <span className="text-xs text-gray-500 truncate">
                            {entry.notes}
                          </span>
                        )}

                        <button
                          onClick={() => removeAllowance(entry.id)}
                          className="ml-auto rounded-md bg-red-50 p-1 text-red-500 transition hover:bg-red-100 hover:text-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}

                    {deductionEntries.length > 0 && (
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-semibold text-red-600">
                          Reductions -{formatPeso(payrollDeductionsAmount)}
                        </span>
                        {deductionDetailItems.length > 0 && (
                          <span className="text-xs text-gray-500 truncate">
                            {deductionDetailItems
                              .map(
                                (item) =>
                                  `${item.label} ${formatPeso(item.amount)}`,
                              )
                              .join(", ")}
                          </span>
                        )}
                        {isPayrollManager ? (
                          <button
                            onClick={clearReductions}
                            className="ml-auto p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                          >
                            <X size={14} />
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-apple-mist bg-white">
              <div className="px-4 py-3 border-b border-apple-mist">
                <p className="text-2xs font-semibold uppercase tracking-widest">
                  All Report Logs
                </p>
                {paidHolidayBonusDays > 0 && (
                  <p className="mt-1 text-xs font-semibold text-sky-700">
                    {paidHolidayBonusDays} paid holiday day
                    {paidHolidayBonusDays === 1 ? "" : "s"} added for this
                    employee.
                  </p>
                )}
                {underHoursLogs.length > 0 && (
                  <p className="mt-1 text-xs font-semibold text-amber-700">
                    Under-8 shifts are still counted as worked days when total
                    hours are above 0, but regular pay only uses the capped
                    paid hours.
                  </p>
                )}
                {overtimeLogs.length > 0 && (
                  <p className="mt-1 text-xs font-semibold text-emerald-700">
                    Overtime is only paid from OT In and OT Out records.
                    Extra regular-shift minutes stay unpaid unless HR confirms
                    the overtime below.
                  </p>
                )}
                {highOvertimeHoursLogs.length > 0 && (
                  <p className="mt-1 text-xs font-semibold text-rose-700">
                    Logs with 10.00 hours or more are flagged for overtime
                    review before saving.
                  </p>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b border-apple-mist">
                      {[
                        "Date/Week",
                        "Site",
                        "Time1 In",
                        "Time1 Out",
                        "Time2 In",
                        "Time2 Out",
                        "OT In",
                        "OT Out",
                        "Regular Hours",
                        "OT Hours",
                        "Total Hours",
                      ].map((h) => (
                        <th
                          key={h}
                          className={`px-3 py-2.5 text-2xs font-semibold uppercase tracking-widest text-apple-steel ${
                            h.includes("Hours") ? "text-right" : "text-left"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allReportLogsCount === 0 ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-3 py-5 text-center text-sm text-apple-smoke"
                        >
                          No attendance logs found for this worker.
                        </td>
                      </tr>
                    ) : (
                      visibleAllReportLogs.map((log, index) => {
                        const isPaidHoliday = payableHolidayDateSet.has(log.date);
                        const editableRegularHours =
                          getEditableRegularHours(log);
                        const editableOvertimeHours =
                          getEditableOvertimeHours(log);
                        const editableTotalHours = round2(
                          editableRegularHours + editableOvertimeHours,
                        );
                        const isUnderRequiredHours =
                          editableRegularHours > 0 &&
                          editableRegularHours < FULL_WORKDAY_HOURS;
                        const isHighOvertimeHours =
                          editableTotalHours >= OVERTIME_ALERT_HOURS &&
                          !isPaidHoliday;
                        const isOvertimeDay =
                          computeSameDayOvertimeMinutes(log.otIn, log.otOut) >
                            0 && !isPaidHoliday;
                        const otPunchStarted = Boolean(log.otIn || log.otOut);
                        const shouldShowOtMissed =
                          otPunchStarted || getEditableOvertimeHours(log) > 0;

                        return (
                          <tr
                            key={`${log.date}-${log.employee}-${log.site}-${allReportLogsPreviewStart + index}`}
                            className={`border-b border-apple-mist/60 last:border-0 ${
                              isPaidHoliday
                                ? "bg-sky-50/50"
                                : isHighOvertimeHours
                                  ? "bg-rose-50/60"
                                  : isUnderRequiredHours
                                    ? "bg-yellow-50"
                                    : "odd:bg-apple-snow/30"
                            }`}
                          >
                            <td className="px-3 py-2.5 text-sm text-apple-charcoal">
                              <div className="flex min-w-[4.5rem] flex-col items-start gap-1">
                                <span className="font-medium leading-tight">
                                  {toWeekLabel(log.date)}
                                </span>
                                <div className="flex flex-col items-start gap-1">
                                  {isPaidHoliday && (
                                    <span className="w-fit whitespace-nowrap rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-2xs font-semibold text-sky-700">
                                      Paid Holiday
                                    </span>
                                  )}
                                  {isUnderRequiredHours && !isPaidHoliday && (
                                    <span className="w-fit whitespace-nowrap rounded-full border border-yellow-300 bg-yellow-100 px-2 py-0.5 text-2xs font-semibold text-yellow-800">
                                      Under 8h
                                    </span>
                                  )}
                                  {isHighOvertimeHours && (
                                    <span className="w-fit whitespace-nowrap rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 text-2xs font-semibold text-rose-800">
                                      10h+ Overtime
                                    </span>
                                  )}
                                  {isOvertimeDay && !isHighOvertimeHours && (
                                    <span className="w-fit whitespace-nowrap rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-2xs font-semibold text-emerald-800">
                                      Overtime
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-apple-smoke">
                              {extractSiteName(log.site) || "-"}
                            </td>
                            <td className="px-3 py-2.5 text-sm text-apple-charcoal">
                              {renderBiometricTimeCell({
                                value: log.time1In,
                                isPaidHoliday,
                              })}
                            </td>
                            <td className="px-3 py-2.5 text-sm text-apple-charcoal">
                              {renderBiometricTimeCell({
                                value: log.time1Out,
                                isPaidHoliday,
                              })}
                            </td>
                            <td className="px-3 py-2.5 text-sm text-apple-charcoal">
                              {renderBiometricTimeCell({
                                value: log.time2In,
                                isPaidHoliday,
                              })}
                            </td>
                            <td className="px-3 py-2.5 text-sm text-apple-charcoal">
                              {renderBiometricTimeCell({
                                value: log.time2Out,
                                isPaidHoliday,
                              })}
                            </td>
                            <td className="px-3 py-2.5 text-sm text-apple-charcoal">
                              {renderBiometricTimeCell({
                                value: log.otIn,
                                isPaidHoliday,
                                showMissedWhenEmpty: shouldShowOtMissed,
                              })}
                            </td>
                            <td className="px-3 py-2.5 text-sm text-apple-charcoal">
                              {renderBiometricTimeCell({
                                value: log.otOut,
                                isPaidHoliday,
                                showMissedWhenEmpty: shouldShowOtMissed,
                              })}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <input
                                type="number"
                                min={0}
                                max={16}
                                step="0.01"
                                onFocus={(e) => e.currentTarget.select()}
                                value={getEditableRegularHoursValue(log)}
                                onChange={(e) =>
                                  payroll.updateLogHour(
                                    log,
                                    "regularHours",
                                    e.target.value,
                                  )
                                }
                                className="w-20 hover:border-apple-charcoal text-right px-2 py-1 rounded-lg border border-apple-charcoal/40 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-apple-charcoal/20"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                onFocus={(e) => e.currentTarget.select()}
                                value={getEditableOvertimeHoursValue(log)}
                                onChange={(e) =>
                                  payroll.updateLogHour(
                                    log,
                                    "overtimeHours",
                                    e.target.value,
                                  )
                                }
                                className="w-20 hover:border-apple-charcoal text-right px-2 py-1 rounded-lg border border-apple-charcoal/40 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-apple-charcoal/20"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-right text-sm font-mono font-semibold text-apple-charcoal">
                              {formatPayrollNumber(getEditableTotalHours(log))}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {allReportLogsCount > ALL_REPORT_LOGS_PAGE_SIZE && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-apple-mist px-4 py-3">
                  <p className="text-xs font-medium text-apple-steel">
                    Showing {allReportLogsPreviewStart + 1}-
                    {Math.min(allReportLogsPreviewEnd, allReportLogsCount)} of{" "}
                    {allReportLogsCount} log days
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setAllReportLogsPage((page) => Math.max(1, page - 1))
                      }
                      disabled={allReportLogsPage === 1}
                      className={`flex h-8 items-center gap-1 rounded-[10px] border px-3 text-xs font-semibold transition ${
                        allReportLogsPage === 1
                          ? "cursor-not-allowed border-apple-mist text-apple-silver"
                          : "border-apple-silver text-apple-charcoal hover:border-[#7ebd8b]"
                      }`}
                    >
                      <ArrowLeft size={14} />
                      Previous
                    </button>
                    <span className="min-w-[4.5rem] text-center text-xs font-semibold text-apple-steel">
                      {allReportLogsPage} / {allReportLogsTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setAllReportLogsPage((page) =>
                          Math.min(allReportLogsTotalPages, page + 1),
                        )
                      }
                      disabled={allReportLogsPage === allReportLogsTotalPages}
                      className={`flex h-8 items-center gap-1 rounded-[10px] border px-3 text-xs font-semibold transition ${
                        allReportLogsPage === allReportLogsTotalPages
                          ? "cursor-not-allowed border-apple-mist text-apple-silver"
                          : "border-apple-silver text-apple-charcoal hover:border-[#7ebd8b]"
                      }`}
                    >
                      Next
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-apple-mist bg-white">
              <div className="px-4 py-3 border-b border-apple-mist">
                <p className="text-2xs font-semibold uppercase tracking-widest">
                  Source Summary
                </p>
                <p className="text-sm text-apple-smoke mt-1">
                  {payroll.editingPayrollLogs.length} attendance log row
                  {payroll.editingPayrollLogs.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  {
                    label: "Attendance (Day)",
                    value: String(payroll.editingPayrollSummary.attendanceDays),
                  },
                  {
                    label: "Days Worked",
                    value: String(daysWorked),
                  },
                  {
                    label: "Actual Total Hours",
                    value: `${formatPayrollNumber(totalWorkedHours)} hrs`,
                  },
                  {
                    label: "Paid Regular Hours",
                    value: `${formatPayrollNumber(regularWorkedHours)} hrs`,
                  },
                  {
                    label: "Total OT Hours",
                    value: `${formatPayrollNumber(payableOvertimeHours)} hrs`,
                  },
                  {
                    label: "Service Pay",
                    value: formatPeso(baseWorkedPay),
                  },
                  {
                    label: "OT Pay",
                    value: formatPeso(payableOvertimePay),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl  px-3 py-2 hover:shadow-[0_8px_18px_rgba(24,83,43,0.06)] bg-[linear-gradient(135deg,#112e1a,#1f4f2c,#245f34)] "
                  >
                    <p className="text-2xs font-medium text-white/65 uppercase tracking-wider">
                      {item.label}
                    </p>
                    <p className="mt-1 text-lg font-semibold font-mono text-white">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-apple-mist bg-white">
              <div className="px-4 py-3 border-b border-apple-mist">
                <p className="text-2xs font-semibold uppercase tracking-widest">
                  Computation Summary
                </p>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-apple-charcoal">
                    Actual Total Hours
                  </span>
                  <span className="font-mono font-semibold text-apple-charcoal text-right">
                    {formatPayrollNumber(totalWorkedHours)} hrs
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-apple-charcoal">
                    Actual Regular Hours
                  </span>
                  <span className="font-mono font-semibold text-apple-charcoal text-right">
                    {formatPayrollNumber(actualRegularHours)} hrs
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-apple-charcoal">
                    Unpaid Break ({formatPayrollNumber(unpaidBreakHours)} hrs)
                  </span>
                  <span className="font-mono font-semibold text-rose-600 text-right">
                    -{formatPayrollNumber(unpaidBreakHours)} hrs
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-apple-charcoal">
                    Paid Regular Hours
                  </span>
                  <span className="font-mono font-semibold text-apple-charcoal text-right">
                    {formatPayrollNumber(regularWorkedHours)} hrs
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-apple-charcoal">
                    Days Worked
                  </span>
                  <span className="font-mono font-semibold text-apple-charcoal text-right">
                    {daysWorked}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-apple-charcoal">Total Regular Pay</span>
                  <span className="font-mono font-semibold text-apple-charcoal text-right">
                    {formatPeso(baseWorkedPay)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-apple-charcoal">Total OT Hours</span>
                  <span className="font-mono font-semibold text-apple-charcoal text-right">
                    {formatPayrollNumber(payableOvertimeHours)} hrs
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-apple-charcoal">Total OT Pay</span>
                  <span className="font-mono font-semibold text-emerald-700 text-right">
                    {formatPeso(payableOvertimePay)}
                  </span>
                </div>
                {biometricOvertimePay > 0 ? (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-apple-charcoal">
                      + Biometric Overtime
                      <span className="ml-1 text-xs text-apple-smoke">
                        ({formatPayrollNumber(biometricOvertimeHours)} hrs)
                      </span>
                    </span>
                    <span className="font-mono font-semibold text-emerald-700 text-right">
                      {formatPeso(biometricOvertimePay)}
                    </span>
                  </div>
                ) : null}
                {hasBiometricOvertime ? (
                  <div className="rounded-xl border border-apple-mist bg-apple-snow/70 px-3 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-widest text-apple-smoke">
                          Biometric Overtime Decision
                        </p>
                        <p className="text-sm text-apple-charcoal">
                          {biometricOvertimeStatus === "approved"
                            ? "Confirmed and included in final total pay."
                            : biometricOvertimeStatus === "rejected"
                              ? "Rejected and excluded from final total pay."
                              : "Waiting for payroll manager confirmation."}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmBiometricOvertimeStatus("approved")
                          }
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <Check size={15} />
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmBiometricOvertimeStatus("rejected")
                          }
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                        >
                          <X size={15} />
                          Exclude
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
                {sitePayBreakdownWithAllocation.length > 1 && (
                  <div className="rounded-xl border border-apple-mist bg-apple-snow/70 px-3 py-2">
                    <p className="text-2xs font-semibold uppercase tracking-widest text-apple-smoke">
                      Branch Rate Breakdown
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {sitePayBreakdownWithAllocation.map((entry) => (
                        <div
                          key={entry.site}
                          className="flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="text-apple-charcoal">
                            {entry.site} · {formatPayrollNumber(entry.hours)}{" "}
                            hrs
                            {" · "}
                            {formatPayrollNumber(entry.payableDays)} payable
                            day(s)
                          </span>
                          <span className="font-mono font-semibold text-apple-charcoal text-right">
                            {formatPeso(entry.ratePerDay)}/day
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-apple-charcoal">+ Paid Holiday</span>
                  <span className="font-mono font-semibold text-emerald-700 text-right">
                    {formatPeso(paidHolidayPay)}
                  </span>
                </div>
                {allowancePay > 0 && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-apple-charcoal">+ Allowance</span>
                    <span className="font-mono font-semibold text-emerald-700 text-right">
                      {formatPeso(allowancePay)}
                    </span>
                  </div>
                )}
                <div className="border-t border-apple-mist pt-2 mt-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-apple-charcoal">
                    Gross Pay
                  </span>
                  <span className="font-mono font-semibold text-apple-charcoal text-right">
                    {formatPeso(grossPay)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-apple-charcoal">- Cash Advance</span>
                  <span className="font-mono font-semibold text-red-600 text-right">
                    {formatPeso(cashAdvanceAmount)}
                  </span>
                </div>
                {deductionDetailItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-apple-charcoal">- {item.label}</span>
                    <span className="font-mono font-semibold text-red-600 text-right">
                      {formatPeso(item.amount)}
                    </span>
                  </div>
                ))}
                {belowFullDayThreshold && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                    Worked hours are below 8.00, so no full paid day is counted
                    yet.
                  </div>
                )}
                <div className="border-t border-apple-mist pt-2 mt-2 flex items-center justify-between gap-3">
                  <span className="text-base font-bold text-apple-charcoal">
                    Adjusted Total Pay
                  </span>
                  <span className="text-xl font-mono font-bold text-apple-charcoal text-right">
                    {formatPeso(adjustedTotalPay)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 z-10 border-t border-apple-mist bg-white/95 px-4 py-4 backdrop-blur sm:px-7">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={payroll.closePayrollEditModal}
              disabled={isSavingChanges}
              className="h-10 w-full rounded-xl border border-apple-silver px-4 text-sm font-semibold text-apple-ash transition hover:border-apple-charcoal disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void handleSaveChanges();
              }}
              disabled={
                isSavingChanges ||
                (hasBiometricOvertime && biometricOvertimeStatus === null)
              }
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isSavingChanges ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>
      {confirmBiometricOvertimeStatus ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-apple-mist bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="flex items-start gap-3 border-b border-apple-mist px-5 py-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-apple-steel">
                  Confirm Overtime
                </p>
                <h3 className="mt-1 text-lg font-semibold text-apple-charcoal">
                  {confirmBiometricOvertimeStatus === "approved"
                    ? "Include biometric overtime in final pay?"
                    : "Exclude biometric overtime from final pay?"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-apple-steel">
                  {confirmBiometricOvertimeStatus === "approved"
                    ? `This will add ${formatPayrollNumber(biometricOvertimeHours)} biometric overtime hour(s) to the employee's final total pay.`
                    : "This will keep biometric overtime out of the employee's final total pay."}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmBiometricOvertimeStatus(null)}
                className="h-10 rounded-xl border border-apple-silver px-4 text-sm font-semibold text-apple-ash transition hover:border-apple-charcoal"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setBiometricOvertimeStatus(confirmBiometricOvertimeStatus);
                  setConfirmBiometricOvertimeStatus(null);
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                {confirmBiometricOvertimeStatus === "approved" ? (
                  <>
                    <Check size={15} />
                    Confirm Overtime
                  </>
                ) : (
                  <>
                    <X size={15} />
                    Exclude Overtime
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

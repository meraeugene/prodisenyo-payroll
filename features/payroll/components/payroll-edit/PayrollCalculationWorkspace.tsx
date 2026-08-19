"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  ListChecks,
  Loader2,
  Plus,
  SlidersHorizontal,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import type { DailyLogRow } from "@/types";
import type {
  PayrollAllowanceEntry,
  PayrollCashAdvanceEntry,
  PayrollDeductionEntry,
  PayrollOvertimeEntry,
  PayrollPaidLeaveEntry,
} from "@/features/payroll/types";
import type { AdjustmentFormType } from "@/features/payroll/utils/payrollEditModalHelpers";
import {
  extractSiteName,
  formatLogTime,
  formatPayrollNumber,
  toWeekLabel,
} from "@/features/payroll/utils/payrollFormatters";
import {
  formatPeso,
  OVERTIME_ALERT_HOURS,
  round2,
} from "@/features/payroll/utils/payrollEditModalHelpers";
import { FULL_WORKDAY_HOURS } from "@/features/payroll/utils/payrollSelectors";
import { buildPayrollLogBiometricBreakdown } from "@/features/payroll/utils/payrollLogHours";

interface BranchRateRow {
  site: string;
  hours: number;
  payableDays: number;
  ratePerDay: number;
}

export interface PayrollCalculationWorkspaceProps {
  employeeName: string;
  roleName: string;
  siteLabel: string;
  periodLabel: string | null;
  logs: DailyLogRow[];
  visibleLogs: DailyLogRow[];
  page: number;
  totalPages: number;
  showAllLogs: boolean;
  paidHolidayDates: Set<string>;
  attendanceDays: number;
  daysWorked: number;
  actualWorkedHours: number;
  regularWorkedHours: number;
  overtimeHours: number;
  baseWorkedPay: number;
  overtimePay: number;
  grossPay: number;
  adjustedTotalPay: number;
  adjustmentTotal: number;
  hasBiometricOvertime: boolean;
  biometricOvertimeHours: number;
  biometricOvertimeStatus: "approved" | "rejected" | null;
  confirmBiometricOvertimeStatus: "approved" | "rejected" | null;
  cashAdvanceEntries: PayrollCashAdvanceEntry[];
  overtimeEntries: PayrollOvertimeEntry[];
  paidLeaveEntries: PayrollPaidLeaveEntry[];
  allowanceEntries: PayrollAllowanceEntry[];
  deductionEntries: PayrollDeductionEntry[];
  branchRates: BranchRateRow[];
  showBranchRates: boolean;
  isPayrollManager: boolean;
  isSaving: boolean;
  adjustmentDialog: ReactNode;
  getRegularHours: (log: DailyLogRow) => number;
  getOvertimeHours: (log: DailyLogRow) => number;
  onUpdateHour: (log: DailyLogRow, field: "regularHours" | "overtimeHours", value: string) => void;
  onPageChange: (page: number) => void;
  onToggleAllLogs: () => void;
  onToggleBranchRates: () => void;
  onOpenAdjustment: (form: Exclude<AdjustmentFormType, null>) => void;
  onRemoveCashAdvance: (id: string) => void;
  onRemoveOvertime: (id: string) => void;
  onRemovePaidLeave: (id: string) => void;
  onRemoveAllowance: (id: string) => void;
  onBiometricDecision: (status: "approved" | "rejected") => void;
  onCancelBiometricDecision: () => void;
  onConfirmBiometricDecision: () => void;
  onClose: () => void;
  onSave: () => void;
}

function statusForLog(regular: number, overtime: number, holiday: boolean) {
  if (holiday) return ["Paid holiday", "bg-sky-50 text-sky-700"];
  if (round2(regular + overtime) >= OVERTIME_ALERT_HOURS) {
    return ["Review", "bg-rose-50 text-rose-700"];
  }
  if (overtime > 0) return ["Overtime", "bg-violet-50 text-violet-700"];
  if (regular > 0 && regular < FULL_WORKDAY_HOURS) {
    return ["Under 8h", "bg-amber-50 text-amber-700"];
  }
  return ["Regular", "bg-emerald-50 text-emerald-700"];
}

function getDisplayTimeIn(log: DailyLogRow) {
  return log.time1In || log.time2In || log.otIn;
}

function getDisplayTimeOut(log: DailyLogRow) {
  return log.otOut || log.time2Out || log.time1Out;
}

function SectionHeading({
  icon,
  title,
  action,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-slate-200 px-4">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
        <span className="text-emerald-700">{icon}</span>
        {title}
      </div>
      {action}
    </div>
  );
}

export function PayrollCalculationWorkspace(
  props: PayrollCalculationWorkspaceProps,
) {
  const summaryRows = [
    ["Attendance (Days)", String(props.attendanceDays)],
    ["Days Worked", String(props.daysWorked)],
    ["Actual Total Hours", `${formatPayrollNumber(props.actualWorkedHours)} hrs`],
    ["Paid Regular Hours", `${formatPayrollNumber(props.regularWorkedHours)} hrs`],
    ["OT Hours", `${formatPayrollNumber(props.overtimeHours)} hrs`],
    ["Service Pay", formatPeso(props.baseWorkedPay)],
    ["OT Pay", formatPeso(props.overtimePay)],
    ["Gross Pay", formatPeso(props.grossPay)],
    ["Adjustments", formatPeso(props.adjustmentTotal)],
  ];
  const adjustmentRows = [
    ...props.cashAdvanceEntries.map((entry) => ({
      id: entry.id,
      type: "Cash Advance",
      detail: entry.notes || "Deduction",
      amount: -entry.amount,
      removable: true,
      remove: () => props.onRemoveCashAdvance(entry.id),
    })),
    ...props.overtimeEntries.map((entry) => ({
      id: entry.id,
      type: "Overtime",
      detail:
        entry.notes ||
        `${formatPayrollNumber(entry.hours)} hours - ${entry.status ?? "pending"}`,
      amount: entry.pay,
      removable: entry.status !== "approved",
      remove: () => props.onRemoveOvertime(entry.id),
    })),
    ...props.paidLeaveEntries.map((entry) => ({
      id: entry.id,
      type: "Paid Leave",
      detail: entry.notes || `${formatPayrollNumber(entry.days)} days`,
      amount: entry.pay,
      removable: true,
      remove: () => props.onRemovePaidLeave(entry.id),
    })),
    ...props.allowanceEntries.map((entry) => ({
      id: entry.id,
      type: "Allowance",
      detail: entry.notes || "Additional pay",
      amount: entry.amount,
      removable: true,
      remove: () => props.onRemoveAllowance(entry.id),
    })),
    ...props.deductionEntries.map((entry) => ({
      id: entry.id,
      type: "Reductions",
      detail: "Government and other deductions",
      amount: -(
        entry.sssGsis +
        entry.philHealth +
        entry.pagIbig +
        entry.withholdingTax +
        entry.otherDeductions
      ),
      removable: false,
      remove: () => undefined,
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-0 sm:p-3">
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden border border-slate-200 bg-[#f8faf9] shadow-2xl sm:h-[94vh] sm:max-w-[1480px] sm:rounded-2xl">
        <header className="shrink-0 border-b border-slate-200 bg-white">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <WalletCards size={18} />
              </div>
              <h2 className="text-base font-bold text-slate-950">
                Calculation Details
              </h2>
            </div>
            <button
              type="button"
              onClick={props.onClose}
              aria-label="Close calculation details"
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-slate-100 px-4 py-3 sm:px-6">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-700 text-sm font-bold text-white">
              {props.employeeName
                .split(/\\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase()}
            </div>
            <div className="min-w-[170px]">
              <p className="text-base font-bold text-slate-950">
                {props.employeeName}
              </p>
              <span className="mt-0.5 inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                {props.roleName}
              </span>
            </div>
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <Building2 size={16} className="text-emerald-700" />
              {props.siteLabel}
            </div>
            {props.periodLabel ? (
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <CalendarDays size={16} className="text-emerald-700" />
                {props.periodLabel}
              </div>
            ) : null}
          </div>
          <nav
            className="flex h-11 items-end gap-6 overflow-x-auto px-4 sm:px-6"
            aria-label="Calculation sections"
          >
            {[
              ["payroll-logs", "Logs", <ListChecks key="logs" size={15} />],
              ["payroll-summary", "Summary", <WalletCards key="summary" size={15} />],
              ["payroll-adjustments", "Adjustments", <SlidersHorizontal key="adjustments" size={15} />],
            ].map(([id, label, icon], index) => (
              <button
                key={String(id)}
                type="button"
                onClick={() =>
                  document
                    .getElementById(String(id))
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className={`flex h-11 shrink-0 items-center gap-2 border-b-2 px-1 text-xs font-semibold transition ${index === 0 ? "border-emerald-700 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-900"}`}
              >
                {icon}
                {label}
              </button>
            ))}
          </nav>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(330px,0.85fr)]">
            <div className="space-y-4">
              <section
                id="payroll-logs"
                className="scroll-mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <SectionHeading
                  icon={<Clock3 size={17} />}
                  title="Attendance Logs"
                  action={
                    <span className="text-[11px] font-medium text-slate-500">
                      {props.logs.length} record
                      {props.logs.length === 1 ? "" : "s"}
                    </span>
                  }
                />
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[840px] text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                      <tr>
                        {[
                          "Date",
                          "Site",
                          "Time In",
                          "Time Out",
                          "Worked",
                          "Less Lunch",
                          "Edited Regular Hours",
                          "Edited OT Hours",
                          "Payable",
                          "Status",
                        ].map((label) => (
                          <th
                            key={label}
                            className="px-3 py-2.5 text-left font-semibold"
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {props.logs.length === 0 ? (
                        <tr>
                          <td
                            colSpan={10}
                            className="px-4 py-10 text-center text-sm text-slate-500"
                          >
                            No attendance logs found.
                          </td>
                        </tr>
                      ) : (
                        props.visibleLogs.map((log, index) => {
                          const regular = props.getRegularHours(log);
                          const overtime = props.getOvertimeHours(log);
                          const holiday = props.paidHolidayDates.has(log.date);
                          const [statusLabel, statusClass] = statusForLog(
                            regular,
                            overtime,
                            holiday,
                          );
                          const payable = round2(regular + overtime);
                          const biometricBreakdown =
                            buildPayrollLogBiometricBreakdown(log);
                          const timeIn = getDisplayTimeIn(log);
                          const timeOut = getDisplayTimeOut(log);
                          return (
                            <tr
                              key={`${log.date}-${log.employee}-${index}`}
                              className="border-t border-slate-100"
                            >
                              <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-slate-800">
                                {toWeekLabel(log.date)}
                              </td>
                              <td className="max-w-[130px] truncate px-3 py-2.5 text-slate-500">
                                {extractSiteName(log.site) || "-"}
                              </td>
                              <td className="px-3 py-2.5 text-slate-700">
                                {timeIn ? formatLogTime(timeIn) : "-"}
                              </td>
                              <td className="px-3 py-2.5 text-slate-700">
                                {timeOut ? formatLogTime(timeOut) : "-"}
                              </td>
                              <td className="px-3 py-2.5 font-mono font-semibold text-slate-800">
                                {formatPayrollNumber(
                                  biometricBreakdown.workedHours,
                                )}
                              </td>
                              <td className="px-3 py-2.5 font-mono font-semibold text-amber-700">
                                -
                                {formatPayrollNumber(
                                  biometricBreakdown.lunchDeductionHours,
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  aria-label={`Regular hours for ${log.date}`}
                                  type="number"
                                  min={0}
                                  max={16}
                                  step="0.01"
                                  value={formatPayrollNumber(regular)}
                                  onChange={(event) =>
                                    props.onUpdateHour(
                                      log,
                                      "regularHours",
                                      event.target.value,
                                    )
                                  }
                                  className="h-8 w-16 rounded-md border border-slate-200 px-2 text-right font-mono font-semibold outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  aria-label={`Overtime hours for ${log.date}`}
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={formatPayrollNumber(overtime)}
                                  onChange={(event) =>
                                    props.onUpdateHour(
                                      log,
                                      "overtimeHours",
                                      event.target.value,
                                    )
                                  }
                                  className="h-8 w-16 rounded-md border border-slate-200 px-2 text-right font-mono font-semibold outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                                />
                              </td>
                              <td className="px-3 py-2.5 font-mono font-bold text-slate-950">
                                {formatPayrollNumber(payable)}
                              </td>
                              <td className="px-3 py-2.5">
                                <span
                                  className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${statusClass}`}
                                >
                                  {statusLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-2.5">
                  <span className="text-[11px] text-slate-500">
                    Showing {props.visibleLogs.length} of {props.logs.length} logs
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Previous logs page"
                      onClick={() =>
                        props.onPageChange(Math.max(1, props.page - 1))
                      }
                      disabled={props.page === 1 || props.showAllLogs}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-35"
                    >
                      <ArrowLeft size={14} />
                    </button>
                    <span className="min-w-12 text-center text-[11px] font-semibold text-slate-600">
                      {props.showAllLogs
                        ? "All"
                        : `${props.page}/${props.totalPages}`}
                    </span>
                    <button
                      type="button"
                      aria-label="Next logs page"
                      onClick={() =>
                        props.onPageChange(
                          Math.min(props.totalPages, props.page + 1),
                        )
                      }
                      disabled={
                        props.page === props.totalPages || props.showAllLogs
                      }
                      className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-35"
                    >
                      <ArrowRight size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={props.onToggleAllLogs}
                      className="h-8 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {props.showAllLogs ? "Paginate" : "View all logs"}
                    </button>
                  </div>
                </div>
              </section>
              <section
                id="payroll-adjustments"
                className="scroll-mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <SectionHeading
                  icon={<SlidersHorizontal size={17} />}
                  title="Adjustment Entries"
                />
                {adjustmentRows.length === 0 ? (
                  <div className="px-4 py-7 text-center text-sm text-slate-500">
                    No manual adjustments recorded.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {adjustmentRows.slice(0, 5).map((entry) => (
                      <div
                        key={entry.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-2.5 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {entry.type}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">
                            {entry.detail}
                          </p>
                        </div>
                        <span
                          className={`font-mono font-bold ${entry.amount < 0 ? "text-red-600" : "text-emerald-700"}`}
                        >
                          {entry.amount < 0 ? "-" : "+"}
                          {formatPeso(Math.abs(entry.amount))}
                        </span>
                        <button
                          type="button"
                          onClick={entry.remove}
                          disabled={!entry.removable}
                          aria-label={`Remove ${entry.type}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:invisible"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
            <aside className="space-y-3">
              <section
                id="payroll-summary"
                className="scroll-mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <SectionHeading
                  icon={<ListChecks size={17} />}
                  title="Calculation Summary"
                />
                <div className="grid grid-cols-2">
                  {summaryRows.map(([label, value], index) => (
                    <div
                      key={label}
                      className={`flex items-center justify-between gap-2 border-slate-100 px-3 py-2.5 text-[11px] ${index % 2 === 0 ? "border-r" : ""} ${index < summaryRows.length - 2 ? "border-b" : ""}`}
                    >
                      <span className="text-slate-500">{label}</span>
                      <span className="text-right font-mono font-bold text-slate-900">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between bg-emerald-50 px-4 py-3">
                  <span className="text-xs font-bold text-emerald-900">
                    Adjusted Total Pay
                  </span>
                  <span className="font-mono text-lg font-black text-emerald-700">
                    {formatPeso(props.adjustedTotalPay)}
                  </span>
                </div>
              </section>

              {props.hasBiometricOvertime ? (
                <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Clock3 size={16} className="text-emerald-700" />
                    Biometric OT Decision
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] font-semibold text-amber-700">
                      {formatPayrollNumber(props.biometricOvertimeHours)} hrs{" "}
                      {props.biometricOvertimeStatus ??
                        "pending confirmation"}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => props.onBiometricDecision("approved")}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 px-3 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50"
                      >
                        <Check size={14} />
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => props.onBiometricDecision("rejected")}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-[11px] font-bold text-red-600 hover:bg-red-50"
                      >
                        <X size={14} />
                        Exclude
                      </button>
                    </div>
                  </div>
                </section>
              ) : null}

              <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <SlidersHorizontal size={16} className="text-emerald-700" />
                  Adjustments
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    ["cashAdvance", "Cash Advance"],
                    ["overtime", "Overtime"],
                    ["paidLeave", "Paid Leave"],
                    ["allowance", "Allowance"],
                    ...(props.isPayrollManager
                      ? [["reductions", "Reductions"]]
                      : []),
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        props.onOpenAdjustment(
                          key as Exclude<AdjustmentFormType, null>,
                        )
                      }
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 text-[11px] font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <Plus size={13} />
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {props.branchRates.length > 1 ? (
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={props.onToggleBranchRates}
                    className="flex w-full items-center justify-between px-4 py-3 text-xs font-bold text-slate-900"
                  >
                    Branch Rate Breakdown
                    <ChevronDown
                      size={16}
                      className={`transition ${props.showBranchRates ? "rotate-180" : ""}`}
                    />
                  </button>
                  {props.showBranchRates ? (
                    <div className="divide-y divide-slate-100 border-t border-slate-100">
                      {props.branchRates.map((entry) => (
                        <div
                          key={entry.site}
                          className="flex items-center justify-between gap-3 px-4 py-2 text-[11px]"
                        >
                          <span className="text-slate-500">
                            {entry.site} -{" "}
                            {formatPayrollNumber(entry.hours)} hrs
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            {formatPeso(entry.ratePerDay)}/day
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}
            </aside>
          </div>
        </main>
        <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={props.onClose}
            disabled={props.isSaving}
            className="h-10 rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={props.onSave}
            disabled={
              props.isSaving ||
              (props.hasBiometricOvertime &&
                props.biometricOvertimeStatus === null)
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {props.isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </footer>
      </div>
      {props.adjustmentDialog}
      {props.confirmBiometricOvertimeStatus ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex gap-3 border-b border-slate-200 p-5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle size={19} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-950">
                  Confirm overtime decision
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  This changes whether biometric overtime is included in the
                  employee&apos;s final pay.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4">
              <button
                type="button"
                onClick={props.onCancelBiometricDecision}
                className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={props.onConfirmBiometricDecision}
                className="h-9 rounded-lg bg-emerald-700 px-4 text-xs font-bold text-white"
              >
                Confirm decision
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

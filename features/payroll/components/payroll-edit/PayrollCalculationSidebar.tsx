"use client";

import {
  Check,
  ChevronDown,
  Clock3,
  ListChecks,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { AdjustmentFormType } from "@/features/payroll/utils/payrollEditModalHelpers";
import {
  formatPeso,
} from "@/features/payroll/utils/payrollEditModalHelpers";
import { formatPayrollNumber } from "@/features/payroll/utils/payrollFormatters";

interface BranchRateRow {
  site: string;
  hours: number;
  payableDays: number;
  ratePerDay: number;
}

interface PayrollCalculationSidebarProps {
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
  branchRates: BranchRateRow[];
  showBranchRates: boolean;
  isPayrollManager: boolean;
  onToggleBranchRates: () => void;
  onOpenAdjustment: (form: Exclude<AdjustmentFormType, null>) => void;
  onBiometricDecision: (status: "approved" | "rejected") => void;
}

function PanelTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold text-slate-950">
      <span className="text-emerald-700">{icon}</span>
      {children}
    </div>
  );
}

export function PayrollCalculationSidebar(props: PayrollCalculationSidebarProps) {
  const summaryRows = [
    ["Attendance", `${props.attendanceDays} days`],
    ["Days Worked", `${props.daysWorked} days`],
    ["Actual Hours", `${formatPayrollNumber(props.actualWorkedHours)} hrs`],
    ["Regular Hours", `${formatPayrollNumber(props.regularWorkedHours)} hrs`],
    ["OT Hours", `${formatPayrollNumber(props.overtimeHours)} hrs`],
    ["Service Pay", formatPeso(props.baseWorkedPay)],
    ["OT Pay", formatPeso(props.overtimePay)],
    ["Gross Pay", formatPeso(props.grossPay)],
    ["Adjustments", formatPeso(props.adjustmentTotal)],
  ];
  const actions: Array<[Exclude<AdjustmentFormType, null>, string]> = [
    ["cashAdvance", "Cash Advance"],
    ["overtime", "Overtime"],
    ["paidLeave", "Paid Leave"],
    ["allowance", "Allowance"],
    ...(props.isPayrollManager
      ? ([["reductions", "Reductions"]] as Array<[
          Exclude<AdjustmentFormType, null>,
          string,
        ]>)
      : []),
  ];

  return (
    <aside className="space-y-2.5 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-3.5 py-2.5">
          <PanelTitle icon={<ListChecks size={15} />}>Calculation Summary</PanelTitle>
        </div>
        <div className="grid grid-cols-2">
          {summaryRows.map(([label, value], index) => (
            <div
              key={label}
              className={`flex items-center justify-between gap-2 border-slate-100 px-3 py-2 text-[10px] ${
                index % 2 === 0 ? "border-r" : ""
              } ${index < summaryRows.length - 2 ? "border-b" : ""}`}
            >
              <span className="text-slate-500">{label}</span>
              <span className="text-right font-mono font-bold text-slate-900">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between bg-emerald-50 px-3.5 py-2.5">
          <span className="text-[11px] font-bold text-emerald-900">Adjusted Total Pay</span>
          <span className="font-mono text-base font-black text-emerald-700">
            {formatPeso(props.adjustedTotalPay)}
          </span>
        </div>
      </section>

      {props.hasBiometricOvertime ? (
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <PanelTitle icon={<Clock3 size={15} />}>Biometric OT Decision</PanelTitle>
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-md bg-amber-50 px-2 py-1.5 text-[10px] font-semibold text-amber-700">
              {formatPayrollNumber(props.biometricOvertimeHours)} hrs{" "}
              {props.biometricOvertimeStatus ?? "pending confirmation"}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => props.onBiometricDecision("approved")}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-200 px-2.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50"
              >
                <Check size={12} /> Confirm
              </button>
              <button
                type="button"
                onClick={() => props.onBiometricDecision("rejected")}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-red-200 px-2.5 text-[10px] font-bold text-red-600 hover:bg-red-50"
              >
                <X size={12} /> Exclude
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <PanelTitle icon={<SlidersHorizontal size={15} />}>Quick Adjustments</PanelTitle>
        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          {actions.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => props.onOpenAdjustment(key)}
              className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-slate-200 px-2 text-[10px] font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <Plus size={12} /> {label}
            </button>
          ))}
        </div>
      </section>

      {props.branchRates.length > 1 ? (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={props.onToggleBranchRates}
            className="flex w-full items-center justify-between px-3.5 py-2.5 text-[11px] font-bold text-slate-900"
          >
            Branch Rate Breakdown
            <ChevronDown
              size={14}
              className={`transition ${props.showBranchRates ? "rotate-180" : ""}`}
            />
          </button>
          {props.showBranchRates ? (
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {props.branchRates.map((entry) => (
                <div
                  key={entry.site}
                  className="flex items-center justify-between gap-3 px-3.5 py-2 text-[10px]"
                >
                  <span className="text-slate-500">
                    {entry.site} · {formatPayrollNumber(entry.hours)} hrs
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
  );
}

"use client";

import { MinusCircle, Plus, X } from "lucide-react";
import type { AdjustmentFormType } from "@/features/payroll/utils/payrollEditModalHelpers";

export type PayrollAdjustmentFieldKey =
  | "cashAdvance"
  | "cashAdvanceNotes"
  | "overtimeHours"
  | "overtimePay"
  | "overtimeNotes"
  | "paidLeaveDays"
  | "paidLeaveNotes"
  | "allowance"
  | "allowanceNotes"
  | "sssGsis"
  | "philHealth"
  | "pagIbig"
  | "withholdingTax"
  | "otherDeductions";

interface PayrollAdjustmentDialogProps {
  activeForm: Exclude<AdjustmentFormType, null>;
  values: Record<PayrollAdjustmentFieldKey, string>;
  overtimeValidationMessage: string | null;
  onChange: (field: PayrollAdjustmentFieldKey, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onClearReductions: () => void;
}

const FORM_TITLES: Record<Exclude<AdjustmentFormType, null>, string> = {
  cashAdvance: "Cash Advance",
  overtime: "Overtime Request",
  paidLeave: "Paid Leave",
  allowance: "Allowance",
  reductions: "Payroll Reductions",
};

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
      {label}
      <input
        type="number"
        min={0}
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        placeholder="0.00"
      />
    </label>
  );
}

function NotesField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
      Notes
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        placeholder="Optional note"
      />
    </label>
  );
}

export function PayrollAdjustmentDialog({
  activeForm,
  values,
  overtimeValidationMessage,
  onChange,
  onClose,
  onSubmit,
  onClearReductions,
}: PayrollAdjustmentDialogProps) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/40 p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Adjustment
            </p>
            <h3 className="mt-1 text-lg font-bold text-slate-950">
              {FORM_TITLES[activeForm]}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close adjustment form"
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 p-5">
          {activeForm === "cashAdvance" ? (
            <>
              <NumberField
                label="Cash advance amount"
                value={values.cashAdvance}
                onChange={(value) => onChange("cashAdvance", value)}
              />
              <NotesField
                value={values.cashAdvanceNotes}
                onChange={(value) => onChange("cashAdvanceNotes", value)}
              />
            </>
          ) : null}

          {activeForm === "overtime" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Overtime hours"
                  value={values.overtimeHours}
                  onChange={(value) => onChange("overtimeHours", value)}
                />
                <NumberField
                  label="Overtime pay"
                  value={values.overtimePay}
                  onChange={(value) => onChange("overtimePay", value)}
                />
              </div>
              <NotesField
                value={values.overtimeNotes}
                onChange={(value) => onChange("overtimeNotes", value)}
              />
              {overtimeValidationMessage ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  {overtimeValidationMessage}
                </p>
              ) : null}
            </>
          ) : null}

          {activeForm === "paidLeave" ? (
            <>
              <NumberField
                label="Paid leave days"
                value={values.paidLeaveDays}
                onChange={(value) => onChange("paidLeaveDays", value)}
              />
              <NotesField
                value={values.paidLeaveNotes}
                onChange={(value) => onChange("paidLeaveNotes", value)}
              />
            </>
          ) : null}

          {activeForm === "allowance" ? (
            <>
              <NumberField
                label="Allowance amount"
                value={values.allowance}
                onChange={(value) => onChange("allowance", value)}
              />
              <NotesField
                value={values.allowanceNotes}
                onChange={(value) => onChange("allowanceNotes", value)}
              />
            </>
          ) : null}

          {activeForm === "reductions" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label="SSS / GSIS"
                value={values.sssGsis}
                onChange={(value) => onChange("sssGsis", value)}
              />
              <NumberField
                label="PhilHealth"
                value={values.philHealth}
                onChange={(value) => onChange("philHealth", value)}
              />
              <NumberField
                label="Pag-IBIG"
                value={values.pagIbig}
                onChange={(value) => onChange("pagIbig", value)}
              />
              <NumberField
                label="Withholding tax"
                value={values.withholdingTax}
                onChange={(value) => onChange("withholdingTax", value)}
              />
              <NumberField
                label="Other deductions"
                value={values.otherDeductions}
                onChange={(value) => onChange("otherDeductions", value)}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
          {activeForm === "reductions" ? (
            <button
              type="button"
              onClick={onClearReductions}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              <MinusCircle size={16} />
              Clear
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            <Plus size={16} />
            Save adjustment
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { AlertTriangle, Loader2 } from "lucide-react";

interface PayrollCalculationFooterProps {
  isSaving: boolean;
  saveDisabled: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function PayrollCalculationFooter({
  isSaving,
  saveDisabled,
  onClose,
  onSave,
}: PayrollCalculationFooterProps) {
  return (
    <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-2.5 sm:flex-row sm:justify-end sm:px-6">
      <button
        type="button"
        onClick={onClose}
        disabled={isSaving}
        className="h-9 rounded-lg border border-slate-200 px-5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saveDisabled}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Saving...
          </>
        ) : (
          "Save Changes"
        )}
      </button>
    </footer>
  );
}

interface PayrollOvertimeConfirmationProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function PayrollOvertimeConfirmation({
  isOpen,
  onCancel,
  onConfirm,
}: PayrollOvertimeConfirmationProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex gap-3 border-b border-slate-200 p-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle size={19} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-950">Confirm overtime decision</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              This changes whether biometric overtime is included in the employee&apos;s final pay.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-9 rounded-lg bg-emerald-700 px-4 text-xs font-bold text-white"
          >
            Confirm decision
          </button>
        </div>
      </div>
    </div>
  );
}

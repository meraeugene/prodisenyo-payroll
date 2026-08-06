"use client";

import { LoaderCircle } from "lucide-react";

export default function ProjectReturnEstimateDialog({
  reason,
  isPending,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  reason: string;
  isPending: boolean;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_rgba(15,23,42,0.24)]">
        <div className="border-b border-slate-100 bg-emerald-900 px-5 py-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            Return estimate
          </p>
          <h2 className="mt-1 text-lg font-bold">
            Send this estimate back to the engineer
          </h2>
        </div>
        <div className="space-y-4 p-5">
          <textarea
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            rows={5}
            placeholder="Add an optional return note for the engineer."
            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-emerald-700"
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <LoaderCircle size={15} className="animate-spin" /> : null}
              Confirm return
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

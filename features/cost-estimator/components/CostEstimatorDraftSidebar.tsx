"use client";

import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBudgetMoney } from "@/features/cost-estimator/utils/costEstimatorFormatters";

export default function CostEstimatorDraftSidebar({
  estimatedCost,
  budgetCeiling,
  notes,
  disabled,
  onNotesChange,
}: {
  estimatedCost: number;
  budgetCeiling: number | null;
  notes: string;
  disabled: boolean;
  onNotesChange: (value: string) => void;
}) {
  const remaining = budgetCeiling === null ? null : budgetCeiling - estimatedCost;
  const usage = budgetCeiling && budgetCeiling > 0 ? (estimatedCost / budgetCeiling) * 100 : null;
  const barWidth = Math.min(Math.max(usage ?? 0, 0), 100);

  return (
    <aside className="space-y-5">
      <section className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
        <h2 className="text-lg font-semibold text-slate-950">BOQ Summary</h2>
        <p className="mt-5 text-sm text-slate-600">Estimated Cost</p>
        <p className="mt-1 break-words text-[25px] font-semibold tracking-[-0.03em] text-emerald-700">{formatBudgetMoney(estimatedCost)}</p>

        <dl className="mt-5 space-y-4 border-y border-slate-200 py-5 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-600">Budget Ceiling</dt>
            <dd className="text-right font-semibold text-slate-950">{budgetCeiling === null ? "Not recorded" : formatBudgetMoney(budgetCeiling)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-600">Remaining Budget</dt>
            <dd className={cn("text-right font-semibold", remaining !== null && remaining < 0 ? "text-rose-700" : "text-emerald-700")}>{remaining === null ? "Unavailable" : formatBudgetMoney(remaining)}</dd>
          </div>
        </dl>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-slate-700">Budget Usage</span>
            <span className="font-semibold text-slate-950">{usage === null ? "Unavailable" : `${usage.toFixed(1)}%`}</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div className={cn("h-full rounded-full", usage !== null && usage > 100 ? "bg-rose-600" : "bg-emerald-700")} style={{ width: `${barWidth}%` }} />
          </div>
          {usage !== null && usage > 100 ? <p className="mt-2 text-xs font-medium text-rose-700">This draft is over the project budget ceiling.</p> : null}
        </div>
      </section>

      <section className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
        <label htmlFor="estimate-notes" className="text-lg font-semibold text-slate-950">Notes</label>
        <textarea
          id="estimate-notes"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          disabled={disabled}
          maxLength={500}
          rows={5}
          placeholder="Add project notes..."
          className="mt-4 w-full resize-y rounded-[10px] border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
        />
        <p className="mt-2 text-right text-xs text-slate-500">{notes.length} / 500 characters</p>
      </section>

      <section className="flex gap-3 rounded-[14px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <Lightbulb aria-hidden="true" className="mt-0.5 shrink-0" size={19} />
        <p><span className="font-semibold">Tip:</span> Save the draft as you build the BOQ, then submit it when every persisted item has been reviewed.</p>
      </section>
    </aside>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { formatBudgetMoney } from "@/features/cost-estimator/utils/costEstimatorFormatters";

export default function CostEstimatorItemSummary({
  baseEstimateTotal,
  itemTotal,
  budgetCeiling,
}: {
  baseEstimateTotal: number;
  itemTotal: number;
  budgetCeiling: number | null;
}) {
  const estimatedCost = baseEstimateTotal + itemTotal;
  const remaining = budgetCeiling === null ? null : budgetCeiling - estimatedCost;

  return (
    <aside className="rounded-[14px] border border-emerald-200 bg-emerald-50/40 p-5">
      <h3 className="text-base font-semibold text-slate-950">Estimate Summary</h3>
      <dl className="mt-7 space-y-6">
        <div>
          <dt className="text-xs font-semibold text-slate-700">Estimated Cost</dt>
          <dd className="mt-2 break-words text-[22px] font-semibold tracking-[-0.025em] text-emerald-700">
            {formatBudgetMoney(estimatedCost)}
          </dd>
        </div>
        <div className="border-t border-slate-200 pt-6">
          <dt className="text-xs font-semibold text-slate-700">This Item Total</dt>
          <dd className="mt-2 break-words text-[20px] font-semibold text-slate-950">
            {formatBudgetMoney(itemTotal)}
          </dd>
        </div>
        <div className="border-t border-slate-200 pt-6">
          <dt className="text-xs font-semibold text-slate-700">Remaining Budget</dt>
          <dd
            className={cn(
              "mt-2 break-words text-[20px] font-semibold",
              remaining !== null && remaining < 0
                ? "text-rose-700"
                : "text-emerald-700",
            )}
          >
            {remaining === null ? "Unavailable" : formatBudgetMoney(remaining)}
          </dd>
          <p className="mt-2 text-xs text-slate-500">After saving this item</p>
        </div>
      </dl>
    </aside>
  );
}

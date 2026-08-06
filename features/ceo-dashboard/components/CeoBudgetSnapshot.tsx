import Link from "next/link";
import { ArrowRight, WalletCards } from "lucide-react";
import { formatCeoCurrency } from "@/features/ceo-dashboard/utils/ceoDashboard";

export default function CeoBudgetSnapshot({
  totalBudget,
  estimatedCost,
  totalSpent,
}: {
  totalBudget: number;
  estimatedCost: number;
  totalSpent: number;
}) {
  const remaining = totalBudget - totalSpent;
  const percentage = totalBudget
    ? Math.min(100, Math.max(0, Math.round((totalSpent / totalBudget) * 100)))
    : 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-950">Cost & Budget Summary</h2>
          <p className="mt-0.5 text-xs text-slate-500">Across all live projects</p>
        </div>
        <Link href="/budget-tracker" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
          Details <ArrowRight size={13} />
        </Link>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {[
          ["Budget ceiling", totalBudget],
          ["Estimated costs", estimatedCost],
          ["Actual spent", totalSpent],
          ["Remaining", remaining],
        ].map(([label, value]) => (
          <div key={String(label)} className="flex items-center gap-3 rounded-xl bg-slate-50/70 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <WalletCards size={16} />
            </div>
            <div>
              <p className="text-[11px] text-slate-500">{label}</p>
              <p className="mt-0.5 text-sm font-bold text-slate-950">{formatCeoCurrency(Number(value))}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-emerald-700" style={{ width: percentage + "%" }} />
      </div>
      <p className="mt-2 text-xs text-slate-500">{percentage}% of the combined budget ceiling has been recorded as spent.</p>
    </section>
  );
}

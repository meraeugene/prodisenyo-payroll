import Link from "next/link";
import { ArrowRight, WalletCards } from "lucide-react";
import { formatProjectCurrency } from "@/features/projects/utils/projectPresentation";

export default function CeoBudgetSnapshot({
  totalBudget,
  totalSpent,
}: {
  totalBudget: number;
  totalSpent: number;
}) {
  const remaining = Math.max(0, totalBudget - totalSpent);
  const percentage = totalBudget
    ? Math.min(100, Math.round((totalSpent / totalBudget) * 100))
    : 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-950">Budget Snapshot</h2>
        <Link
          href="/budget-tracker"
          className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800"
        >
          View budget <ArrowRight size={13} />
        </Link>
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        {[
          ["Approved Budget", totalBudget],
          ["Spent to Date", totalSpent],
          ["Remaining Budget", remaining],
        ].map(([label, value], index) => (
          <div key={String(label)} className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
              <WalletCards size={19} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 text-lg font-bold text-slate-950">
                {formatProjectCurrency(Number(value))}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-700"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">{percentage}% used</p>
    </section>
  );
}

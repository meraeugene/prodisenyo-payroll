import {
  Banknote,
  ChartNoAxesCombined,
  CircleCheckBig,
  ClipboardList,
  Clock3,
  WalletCards,
} from "lucide-react";
import type { CostTrackingSummary as Summary } from "@/features/project-cost-tracking/types";

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export default function CostTrackingSummary({ summary }: { summary: Summary }) {
  const values = [
    { label: "Starting budget", value: currency.format(summary.startingBudget), icon: WalletCards },
    { label: "Estimated costs", value: currency.format(summary.estimatedCosts), icon: ClipboardList },
    { label: "Actual expenses", value: currency.format(summary.actualExpenses), icon: Banknote, valueClass: "text-rose-600" },
    { label: "Remaining budget", value: currency.format(summary.remainingBudget), icon: ChartNoAxesCombined, valueClass: summary.remainingBudget >= 0 ? "text-emerald-700" : "text-rose-600" },
  ];

  return (
    <aside className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-950">Cost summary</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {values.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4 py-3">
              <span className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
                <item.icon size={16} aria-hidden="true" />
                {item.label}
              </span>
              <strong className={`shrink-0 text-sm ${item.valueClass ?? "text-slate-950"}`}>
                {item.value}
              </strong>
            </div>
          ))}
        </div>

        <div className="mt-3 border-t border-slate-200 pt-3">
          {[
            { label: "Upcoming costs", value: summary.upcomingCount, icon: ClipboardList },
            { label: "Ongoing costs", value: summary.ongoingCount, icon: Clock3 },
            { label: "Completed costs", value: summary.completedCount, icon: CircleCheckBig },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4 py-2.5 text-sm">
              <span className="flex items-center gap-2 text-slate-600">
                <item.icon size={16} aria-hidden="true" /> {item.label}
              </span>
              <strong className="text-slate-950">{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
          Totals are calculated automatically from material purchases, accepted receipts, and project-expense approvals.
        </div>
      </section>
    </aside>
  );
}

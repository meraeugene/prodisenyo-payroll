import { CalendarDays, PackageCheck, ReceiptText } from "lucide-react";
import type { TrackedProjectCost } from "@/features/project-cost-tracking/types";
import { costColumnTotal } from "@/features/project-cost-tracking/utils/costTracking";
import { COST_COLUMNS } from "@/features/project-cost-tracking/utils/costTrackingConstants";

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});
const date = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default function CostTrackingBoard({ costs }: { costs: TrackedProjectCost[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {COST_COLUMNS.map((column) => {
        const columnCosts = costs.filter((cost) => cost.status === column.value);
        return (
          <section key={column.value} className="flex min-h-[28rem] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-950">
                  <span className={`h-2.5 w-2.5 rounded-full ${column.dotClassName}`} aria-hidden="true" />
                  {column.label}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {columnCosts.length} {columnCosts.length === 1 ? "item" : "items"}
                </p>
              </div>
              <strong className="text-sm text-slate-700">
                {currency.format(costColumnTotal(column.value, costs))}
              </strong>
            </header>

            <div className="mt-4 flex-1 space-y-3">
              {columnCosts.map((cost) => (
                <article key={cost.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-slate-950">{cost.name}</h3>
                      <p className="mt-1 text-xs capitalize text-slate-500">{cost.category}</p>
                    </div>
                    <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                      column.value === "completed"
                        ? "bg-emerald-50 text-emerald-700"
                        : column.value === "ongoing"
                          ? "bg-orange-50 text-orange-700"
                          : "bg-amber-50 text-amber-700"
                    }`}>
                      {cost.workflowLabel}
                    </span>
                  </div>

                  <p className="mt-4 text-lg font-bold text-slate-950">
                    {(column.value === "completed" ? cost.actualSpent : cost.estimatedCost) > 0
                      ? currency.format(column.value === "completed" ? cost.actualSpent : cost.estimatedCost)
                      : "Cost pending"}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <CalendarDays size={14} aria-hidden="true" />
                    <span>
                      {cost.dateLabel}: {cost.date ? date.format(new Date(cost.date)) : "Not recorded"}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    {cost.source === "material" ? <PackageCheck size={14} aria-hidden="true" /> : <ReceiptText size={14} aria-hidden="true" />}
                    {cost.source === "material" ? "Synced from Materials and Purchasing" : "Synced from Project Expenses"}
                  </div>
                </article>
              ))}
              {!columnCosts.length ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                  {column.emptyMessage}
                </div>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
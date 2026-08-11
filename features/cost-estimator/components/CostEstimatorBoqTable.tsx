import { getBudgetCategoryLabel } from "@/features/budget-tracker/utils/budgetTrackerFormatters";
import { formatBudgetMoney } from "@/features/cost-estimator/utils/costEstimatorFormatters";
import type { ProjectEstimateItemRow } from "@/features/cost-estimator/types";

export default function CostEstimatorBoqTable({
  items,
}: {
  items: ProjectEstimateItemRow[];
}) {
  const sectionMap = new Map<string, ProjectEstimateItemRow[]>();
  [...items]
    .sort((left, right) => left.sort_order - right.sort_order)
    .forEach((item) => {
      const section = item.boq_section?.trim() || "General Works";
      sectionMap.set(section, [...(sectionMap.get(section) ?? []), item]);
    });
  const groups = [...sectionMap.entries()].map(([section, sectionItems]) => ({
    section,
    items: sectionItems,
  }));
  const total = items.reduce((sum, item) => sum + Number(item.line_total ?? 0), 0);
  const boqItemCount = new Set(
    items.map(
      (item) =>
        (item.boq_section || "General Works").toLowerCase() +
        "::" +
        (item.boq_item_number || String(item.sort_order + 1)).toLowerCase(),
    ),
  ).size;

  return (
    <section className="min-w-0 overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-white">
              <th className="w-24 px-4 py-4 text-left font-semibold text-slate-900">Item No.</th>
              <th className="px-4 py-4 text-left font-semibold text-slate-900">Description</th>
              <th className="w-32 px-4 py-4 text-left font-semibold text-slate-900">Category</th>
              <th className="w-24 px-4 py-4 text-left font-semibold text-slate-900">Unit</th>
              <th className="w-24 px-4 py-4 text-right font-semibold text-slate-900">Qty</th>
              <th className="w-36 px-4 py-4 text-right font-semibold text-slate-900">Unit Cost</th>
              <th className="w-36 px-4 py-4 text-right font-semibold text-slate-900">Total</th>
            </tr>
          </thead>
          <tbody>
            {groups.length > 0 ? (
              groups.map((group) => (
                <SectionRows
                  key={group.section}
                  section={group.section}
                  items={group.items}
                />
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                  No BOQ items have been recorded for this estimate.
                </td>
              </tr>
            )}
          </tbody>
          {items.length > 0 ? (
            <tfoot>
              <tr className="border-t border-emerald-200 bg-emerald-50/60">
                <td colSpan={6} className="px-4 py-4 text-right font-bold uppercase tracking-[0.08em] text-emerald-900">
                  Total
                </td>
                <td className="px-4 py-4 text-right text-base font-bold text-emerald-900">
                  {formatBudgetMoney(total)}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      <p className="border-t border-slate-200 px-4 py-4 text-sm text-slate-500">
        Showing {boqItemCount.toLocaleString("en-PH")} BOQ item{boqItemCount === 1 ? "" : "s"}
      </p>
    </section>
  );
}

function SectionRows({
  section,
  items,
}: {
  section: string;
  items: ProjectEstimateItemRow[];
}) {
  return (
    <>
      <tr className="border-b border-slate-200 bg-emerald-50/45">
        <td colSpan={7} className="px-4 py-3 font-bold text-emerald-900">
          {section}
        </td>
      </tr>
      {items.map((item) => {
        return (
          <tr key={item.id} className="border-b border-slate-200/90 last:border-b-0 hover:bg-slate-50/70">
            <td className="px-4 py-3.5 align-top font-medium text-slate-700">
              {item.boq_item_number || item.sort_order + 1}
            </td>
            <td className="px-4 py-3.5 align-top">
              <p className="font-medium text-slate-900">{item.item_name_snapshot || item.material_name_snapshot}</p>
              {item.material_name_snapshot && item.material_name_snapshot !== item.item_name_snapshot ? (
                <p className="mt-1 text-xs text-slate-500">{item.material_name_snapshot}</p>
              ) : null}
            </td>
            <td className="px-4 py-3.5 align-top text-slate-600">{getBudgetCategoryLabel(item.category_snapshot)}</td>
            <td className="px-4 py-3.5 align-top text-slate-600">{item.unit_label_snapshot || "-"}</td>
            <td className="px-4 py-3.5 text-right align-top text-slate-700">
              {Number(item.quantity ?? 0).toLocaleString("en-PH", { maximumFractionDigits: 2 })}
            </td>
            <td className="whitespace-nowrap px-4 py-3.5 text-right align-top text-slate-700">
              {formatBudgetMoney(Number(item.unit_cost_snapshot ?? 0))}
            </td>
            <td className="whitespace-nowrap px-4 py-3.5 text-right align-top font-semibold text-slate-950">
              {formatBudgetMoney(Number(item.line_total ?? 0))}
            </td>
          </tr>
        );
      })}
    </>
  );
}

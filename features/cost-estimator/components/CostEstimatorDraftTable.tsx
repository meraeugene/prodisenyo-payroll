"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBudgetMoney } from "@/features/cost-estimator/utils/costEstimatorFormatters";
import type { ProjectEstimateDraftLine } from "@/features/cost-estimator/types";

export interface DraftEstimateRow {
  key: string;
  section: string;
  itemNumber: string;
  title: string;
  indices: number[];
  unit: string;
  quantity: number;
  unitCost: number;
  total: number;
}

export default function CostEstimatorDraftTable({
  items,
  disabled,
  onAdd,
  onEdit,
  onDelete,
}: {
  items: ProjectEstimateDraftLine[];
  disabled: boolean;
  onAdd: () => void;
  onEdit: (indices: number[]) => void;
  onDelete: (indices: number[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const sectionFilters = [
    "all",
    ...Array.from(
      new Set(items.map((item) => item.section.trim()).filter(Boolean)),
    ),
  ];

  const rows = useMemo(() => {
    const groups = new Map<string, DraftEstimateRow>();
    items.forEach((item, index) => {
      const title = item.displayName.trim() || item.materialName || `Item ${index + 1}`;
      const key =
        item.section.trim().toLowerCase() +
        "::" +
        item.itemNumber.trim().toLowerCase();
      const existing = groups.get(key);
      if (existing) {
        existing.indices.push(index);
        existing.quantity += item.quantity;
        existing.total += item.lineTotal;
        if (existing.unit !== item.unitType) existing.unit = "Mixed";
        return;
      }
      groups.set(key, {
        key,
        section: item.section || "General Works",
        itemNumber: item.itemNumber || String(index + 1),
        title,
        indices: [index],
        unit: item.unitType || "Not recorded",
        quantity: item.quantity,
        unitCost: item.unitCost,
        total: item.lineTotal,
      });
    });
    const normalized = query.trim().toLowerCase();
    return [...groups.values()].filter(
      (row) =>
        (activeFilter === "all" || row.section === activeFilter) &&
        (!normalized ||
          row.title.toLowerCase().includes(normalized) ||
          row.section.toLowerCase().includes(normalized) ||
          row.itemNumber.toLowerCase().includes(normalized)),
    );
  }, [activeFilter, items, query]);

  return (
    <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-[20px] font-semibold text-slate-950">Estimate Items</h2>
          <div className="mt-4 flex flex-wrap gap-5">
            {sectionFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "border-b-2 pb-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                  activeFilter === filter
                    ? "border-emerald-700 text-emerald-800"
                    : "border-transparent text-slate-600 hover:text-slate-950",
                )}
              >
                {filter === "all" ? "All Items" : filter}
              </button>
            ))}
          </div>
        </div>
        <label className="relative block w-full lg:w-64">
          <span className="sr-only">Search estimate items</span>
          <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search items..."
            className="h-11 w-full rounded-[9px] border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3 border-b border-slate-200 px-5 py-4">
        <button type="button" onClick={onAdd} disabled={disabled} className="inline-flex h-10 items-center gap-2 rounded-[9px] bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-60">
          <Plus aria-hidden="true" size={17} /> Add Item
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[880px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-5 py-3">Item No.</th>
              <th className="px-4 py-3">Section / Category</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Unit Cost</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-5 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => (
              <tr key={row.key} className="text-slate-700 hover:bg-slate-50/70">
                <td className="px-5 py-4 font-medium text-slate-950">{row.itemNumber}</td>
                <td className="px-4 py-4">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">{row.section}</span>
                </td>
                <td className="px-4 py-4 font-medium text-slate-950">{row.title}</td>
                <td className="px-4 py-4">{row.unit}</td>
                <td className="px-4 py-4 text-right">{row.quantity.toLocaleString("en-PH")}</td>
                <td className="px-4 py-4 text-right">{row.indices.length === 1 ? formatBudgetMoney(row.unitCost) : "Mixed"}</td>
                <td className="px-4 py-4 text-right font-semibold text-slate-950">{formatBudgetMoney(row.total)}</td>
                <td className="px-5 py-4">
                  <div className="flex justify-center gap-1">
                    <button type="button" onClick={() => onEdit(row.indices)} disabled={disabled} aria-label={`Edit ${row.title}`} className="rounded-md p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-50"><Pencil aria-hidden="true" size={16} /></button>
                    <button type="button" onClick={() => onDelete(row.indices)} disabled={disabled} aria-label={`Delete ${row.title}`} className="rounded-md p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50"><Trash2 aria-hidden="true" size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="font-semibold text-slate-900">{items.length === 0 ? "No BOQ items yet" : "No items match this view"}</p>
          <p className="mt-2 text-sm text-slate-500">{items.length === 0 ? "Add the first persisted cost item to build this estimate." : "Try another search or category."}</p>
        </div>
      ) : (
        <p className="border-t border-slate-200 px-5 py-4 text-sm text-slate-500">Showing 1 to {rows.length} of {rows.length} items</p>
      )}
    </section>
  );
}

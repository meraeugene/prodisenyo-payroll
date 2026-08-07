"use client";

import { useEffect, useState, useTransition } from "react";
import { LoaderCircle, PencilLine, X } from "lucide-react";
import { toast } from "sonner";
import {
  updateSubmittedEstimateByCeoAction,
  type CeoEstimateEditItem,
} from "@/actions/estimateProcurement";
import type { ProjectEstimateItemRow } from "@/features/cost-estimator/types";

function mapItems(items: ProjectEstimateItemRow[]): CeoEstimateEditItem[] {
  return items.map((item) => ({
    id: item.id,
    quantity: Number(item.quantity),
    unitCost: Number(item.unit_cost_snapshot),
    notes: item.notes ?? "",
    pricingBasis: item.pricing_basis ?? "catalog",
    referenceSupplier: item.reference_supplier ?? "",
    referenceQuotation: item.reference_quotation ?? "",
  }));
}

export default function CeoEstimateEditDialog({
  estimateId,
  items,
  onClose,
  onSaved,
}: {
  estimateId: string;
  items: ProjectEstimateItemRow[];
  onClose: () => void;
  onSaved: () => Promise<unknown> | unknown;
}) {
  const [draft, setDraft] = useState(() => mapItems(items));
  const [isPending, startTransition] = useTransition();

  useEffect(() => setDraft(mapItems(items)), [items]);

  function updateItem(id: string, changes: Partial<CeoEstimateEditItem>) {
    setDraft((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }

  function save() {
    startTransition(async () => {
      try {
        await updateSubmittedEstimateByCeoAction({ estimateId, items: draft });
        await onSaved();
        toast.success("Estimate changes saved and recorded in the audit log.");
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to update estimate.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[100dvh] w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[94vh] sm:rounded-3xl">
        <header className="flex items-start justify-between border-b border-slate-200 bg-emerald-950 px-5 py-4 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Controlled CEO edit</p>
            <h2 className="mt-2 flex items-center gap-2 text-xl font-bold"><PencilLine size={19} /> Edit submitted estimate</h2>
            <p className="mt-1 text-sm text-white/70">Quantities, rates, references, and notes are audited.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close editor"><X size={18} /></button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4 sm:p-5">
          {items.map((item) => {
            const value = draft.find((entry) => entry.id === item.id)!;
            const supplierQuote = value.pricingBasis === "supplier_quote";
            return (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col justify-between gap-2 md:flex-row md:items-start">
                  <div><h3 className="font-bold text-slate-900">{item.material_name_snapshot || item.item_name_snapshot}</h3><p className="mt-1 text-xs text-slate-500">{item.item_name_snapshot} · {item.unit_label_snapshot}</p></div>
                  <p className="font-bold text-emerald-800">₱{(value.quantity * value.unitCost).toLocaleString("en-PH", { maximumFractionDigits: 2 })}</p>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Quantity"><input type="number" min="0.01" step="0.01" value={value.quantity} onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })} className="input" /></Field>
                  <Field label="Unit cost"><input type="number" min="0" step="0.01" value={value.unitCost} onChange={(event) => updateItem(item.id, { unitCost: Number(event.target.value) })} className="input" /></Field>
                  <Field label="Pricing basis"><select value={value.pricingBasis} onChange={(event) => updateItem(item.id, { pricingBasis: event.target.value as CeoEstimateEditItem["pricingBasis"] })} className="input"><option value="catalog">Catalog/reference rate</option><option value="supplier_quote">Supplier quotation</option></select></Field>
                  <Field label="Notes"><input value={value.notes ?? ""} onChange={(event) => updateItem(item.id, { notes: event.target.value })} className="input" /></Field>
                </div>
                {supplierQuote ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Field label="Reference supplier"><input required value={value.referenceSupplier ?? ""} onChange={(event) => updateItem(item.id, { referenceSupplier: event.target.value })} className="input" /></Field>
                    <Field label="Quotation reference"><input required value={value.referenceQuotation ?? ""} onChange={(event) => updateItem(item.id, { referenceQuotation: event.target.value })} className="input" /></Field>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-200 bg-white p-4">
          <button type="button" onClick={onClose} disabled={isPending} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold">Cancel</button>
          <button type="button" onClick={save} disabled={isPending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-semibold text-white disabled:opacity-60">{isPending ? <LoaderCircle size={15} className="animate-spin" /> : null}Save audited changes</button>
        </footer>
      </div>
      <style jsx>{`.input { margin-top:.35rem; height:2.5rem; width:100%; border:1px solid #dbe5dd; border-radius:.75rem; padding:0 .75rem; font-size:.875rem; outline:none } .input:focus { border-color:#047857; box-shadow:0 0 0 2px #d1fae5 }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-xs font-semibold text-slate-700">{label}{children}</label>;
}

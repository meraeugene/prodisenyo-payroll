"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, Trash2, X } from "lucide-react";
import CostEstimatorItemFields from "@/features/cost-estimator/components/CostEstimatorItemFields";
import CostEstimatorItemSummary from "@/features/cost-estimator/components/CostEstimatorItemSummary";
import type { CostEstimatorItemModalProps } from "@/features/cost-estimator/types";

export default function CostEstimatorItemModal(
  props: CostEstimatorItemModalProps,
) {
  const { open, pending, onClose } = props;

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, pending, onClose]);

  if (!open) return null;

  const isReadOnly = Boolean(props.readOnly);
  const title = isReadOnly
    ? "View BOQ Item"
    : props.editing
      ? "Edit BOQ Item"
      : "Add BOQ Item";

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={props.onClose}
        className="absolute inset-0 cursor-default"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="boq-item-title"
        className="relative flex max-h-[100dvh] w-full max-w-[920px] flex-col overflow-hidden bg-white shadow-[0_30px_100px_rgba(15,23,42,0.28)] sm:max-h-[90vh] sm:rounded-[14px] sm:border sm:border-slate-200"
      >
        <header className="flex items-start justify-between gap-5 border-b border-slate-200 px-5 py-5 sm:px-8">
          <div>
            <h2
              id="boq-item-title"
              className="text-[25px] font-semibold tracking-[-0.03em] text-slate-950"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {isReadOnly
                ? "Review the persisted item details for this estimate."
                : "Enter the item details for this estimate."}
            </p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            disabled={props.pending}
            aria-label="Close"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-[9px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-60"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_230px]">
            <CostEstimatorItemFields
              form={props.form}
              errors={props.errors}
              materials={props.materials}
              itemNumberLabel={props.itemNumberLabel}
              readOnly={props.readOnly}
              pending={props.pending}
              onFieldChange={props.onFieldChange}
              onSelectMaterial={props.onSelectMaterial}
              onSelectUnitType={props.onSelectUnitType}
              onMaterialRowFieldChange={props.onMaterialRowFieldChange}
              onAddMaterial={props.onAddMaterial}
              onRemoveMaterial={props.onRemoveMaterial}
            />
            <div className="lg:sticky lg:top-0">
              <CostEstimatorItemSummary
                baseEstimateTotal={props.baseEstimateTotal}
                itemTotal={props.computedTotal}
                budgetCeiling={props.budgetCeiling}
              />
            </div>
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            {props.editing && !isReadOnly ? (
              <button
                type="button"
                onClick={props.onDelete}
                disabled={props.pending}
                className="inline-flex h-10 items-center gap-2 rounded-[9px] border border-rose-200 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-60"
              >
                <Trash2 aria-hidden="true" size={16} /> Delete Item
              </button>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={props.onClose}
              disabled={props.pending}
              className="inline-flex h-10 items-center justify-center rounded-[9px] border border-slate-200 px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-60"
            >
              {isReadOnly ? "Close" : "Cancel"}
            </button>
            {!isReadOnly ? (
              <button
                type="button"
                onClick={props.onSave}
                disabled={props.pending}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[9px] bg-emerald-700 px-6 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {props.pending ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="animate-spin"
                    size={16}
                  />
                ) : null}
                {props.pending
                  ? "Saving..."
                  : props.editing
                    ? "Save Changes"
                    : "Save Item"}
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

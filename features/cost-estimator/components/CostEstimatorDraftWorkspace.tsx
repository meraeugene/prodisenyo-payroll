"use client";

import { ArrowLeft, Calculator, CalendarDays, ClipboardList, HardHat, Layers3, LoaderCircle, MapPin, Save, Send, Trash2, UserRound, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import CostEstimatorDraftSidebar from "@/features/cost-estimator/components/CostEstimatorDraftSidebar";
import CostEstimatorDraftTable from "@/features/cost-estimator/components/CostEstimatorDraftTable";
import { formatBudgetMoney, formatProjectTypeLabel } from "@/features/cost-estimator/utils/costEstimatorFormatters";
import type { AssignedEstimateProject, CostCatalogItemRow, ProjectEstimateDraftForm, ProjectEstimateRow } from "@/features/cost-estimator/types";
import type { BudgetItemCategory } from "@/types/database";

export default function CostEstimatorDraftWorkspace({
  estimate,
  form,
  linkedProject,
  catalogItems,
  disabled,
  saveMessage,
  submitting,
  onBack,
  onFieldChange,
  onAdd,
  onEdit,
  onDeleteItem,
  onSave,
  onSubmit,
  onDeleteDraft,
}: {
  estimate: ProjectEstimateRow;
  form: ProjectEstimateDraftForm;
  linkedProject: AssignedEstimateProject | null;
  catalogItems: CostCatalogItemRow[];
  disabled: boolean;
  saveMessage: string;
  submitting: boolean;
  onBack: () => void;
  onFieldChange: (field: Exclude<keyof ProjectEstimateDraftForm, "items" | "id">, value: string) => void;
  onAdd: () => void;
  onEdit: (indices: number[]) => void;
  onDeleteItem: (indices: number[]) => void;
  onSave: () => void;
  onSubmit: () => void;
  onDeleteDraft: () => void;
}) {
  const categoryByCatalogId = new Map(catalogItems.map((item) => [item.id, item.category]));
  const categoryTotal = (category: BudgetItemCategory) => form.items.reduce((sum, item) => sum + (categoryByCatalogId.get(item.catalogItemId) === category ? item.lineTotal : 0), 0);
  const total = form.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const boqItemCount = new Set(
    form.items.map(
      (item) =>
        item.section.trim().toLowerCase() +
        "::" +
        item.itemNumber.trim().toLowerCase(),
    ),
  ).size;
  const budgetCeiling = linkedProject?.budgetCeiling ?? null;
  const draftedDate = form.draftedDate || estimate.created_at;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header>
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1 rounded text-emerald-800 hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"><ArrowLeft aria-hidden="true" size={16} /> Cost Estimator</button>
          <span aria-hidden="true" className="text-slate-400">/</span><button type="button" onClick={onBack} className="rounded text-emerald-800 hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">Assigned Projects</button>
          <span aria-hidden="true" className="text-slate-400">/</span><span>{form.projectName}</span><span aria-hidden="true" className="text-slate-400">/</span><span>Start Estimate</span>
        </nav>
        <h1 className="mt-5 text-[30px] font-semibold tracking-[-0.035em] text-slate-950 sm:text-[36px]">Start Estimate Cost</h1>
        <p className="mt-1 text-sm text-slate-600">Build the Bill of Quantities for this assigned project before submitting it to the CEO.</p>
      </header>

      <section className="grid gap-px overflow-hidden rounded-[14px] border border-slate-200 bg-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.035)] sm:grid-cols-2 xl:grid-cols-4">
        <Fact icon={ClipboardList} label="Project" value={form.projectName} />
        <Fact icon={Wrench} label="Project Type" value={formatProjectTypeLabel(form.projectType || null)} />
        <Fact icon={MapPin} label="Location" value={form.location || "Not recorded"} />
        <Fact icon={UserRound} label="Owner" value={form.ownerName || "Not recorded"} />
        <Fact icon={Calculator} label="Budget Ceiling" value={budgetCeiling === null ? "Not recorded" : formatBudgetMoney(budgetCeiling)} />
        <Fact icon={CalendarDays} label="Date" value={draftedDate ? new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "long", day: "numeric" }).format(new Date(draftedDate)) : "Not recorded"} />
        <Fact icon={ClipboardList} label="Status" value="Draft" valueClass="text-emerald-800" />
      </section>

      <section aria-label="Estimate totals" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={ClipboardList} label="BOQ Items" value={`${boqItemCount} items`} />
        <Metric icon={Layers3} label="Materials" value={formatBudgetMoney(categoryTotal("materials"))} />
        <Metric icon={HardHat} label="Labor" value={formatBudgetMoney(categoryTotal("labor"))} />
        <Metric icon={Wrench} label="Equipment" value={formatBudgetMoney(categoryTotal("equipment"))} />
        <Metric icon={Calculator} label="Total Estimate" value={formatBudgetMoney(total)} />
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-slate-200 bg-white px-4 py-3">
            <p className="text-sm text-slate-500" aria-live="polite">{saveMessage}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onDeleteDraft} disabled={disabled} className="inline-flex h-10 items-center gap-2 rounded-[9px] border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"><Trash2 aria-hidden="true" size={16} /> Delete Draft</button>
              <button type="button" onClick={onSave} disabled={disabled} className="inline-flex h-10 items-center gap-2 rounded-[9px] border border-emerald-700 px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"><Save aria-hidden="true" size={16} /> Save Draft</button>
              <button type="button" onClick={onSubmit} disabled={disabled} className="inline-flex h-10 items-center gap-2 rounded-[9px] bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{submitting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <Send aria-hidden="true" size={16} />} {submitting ? "Submitting..." : "Submit to CEO"}</button>
            </div>
          </div>
          <CostEstimatorDraftTable items={form.items} disabled={disabled} onAdd={onAdd} onEdit={onEdit} onDelete={onDeleteItem} />
        </div>
        <CostEstimatorDraftSidebar estimatedCost={total} budgetCeiling={budgetCeiling} notes={form.notes} disabled={disabled} onNotesChange={(value) => onFieldChange("notes", value)} />
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, value, valueClass }: { icon: typeof ClipboardList; label: string; value: string; valueClass?: string }) {
  return <div className="flex min-h-[94px] items-center gap-3 bg-white px-5 py-4"><span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Icon aria-hidden="true" size={19} /></span><div className="min-w-0"><p className="text-xs text-slate-500">{label}</p><p className={cn("mt-1 break-words text-sm font-semibold text-slate-950", valueClass)}>{value}</p></div></div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof ClipboardList; label: string; value: string }) {
  return <article className="flex min-h-[90px] items-center gap-3 rounded-[13px] border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]"><span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[11px] bg-emerald-50 text-emerald-700"><Icon aria-hidden="true" size={21} /></span><div className="min-w-0"><p className="text-xs text-slate-600">{label}</p><p className="mt-1 break-words text-lg font-semibold text-slate-950">{value}</p></div></article>;
}

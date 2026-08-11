"use client";

import {
  ArrowLeft,
  ClipboardList,
  Eye,
  FileText,
  HardHat,
  Layers3,
  Pencil,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CostEstimatorBoqSidebar from "@/features/cost-estimator/components/CostEstimatorBoqSidebar";
import CostEstimatorBoqTable from "@/features/cost-estimator/components/CostEstimatorBoqTable";
import {
  formatBudgetMoney,
  formatEstimateStatusLabel,
  formatProjectTypeLabel,
  getEstimateStatusBadgeClass,
} from "@/features/cost-estimator/utils/costEstimatorFormatters";
import type {
  ProjectEstimateItemRow,
  ProjectEstimateRow,
} from "@/features/cost-estimator/types";

export default function CostEstimatorBoqDetails({
  estimate,
  items,
  budgetCeiling,
  pending,
  onBack,
  onViewReport,
  onEdit,
}: {
  estimate: ProjectEstimateRow;
  items: ProjectEstimateItemRow[];
  budgetCeiling: number | null;
  pending: boolean;
  onBack: () => void;
  onViewReport: () => void;
  onEdit?: () => void;
}) {
  const categoryTotal = (category: ProjectEstimateItemRow["category_snapshot"]) =>
    items
      .filter((item) => item.category_snapshot === category)
      .reduce((sum, item) => sum + Number(item.line_total ?? 0), 0);
  const boqItemCount = new Set(
    items.map(
      (item) =>
        (item.boq_section || "General Works").toLowerCase() +
        "::" +
        (item.boq_item_number || String(item.sort_order + 1)).toLowerCase(),
    ),
  ).size;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm font-semibold text-emerald-800">
            <button type="button" onClick={onBack} className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 hover:text-emerald-950">
              Cost Estimator
            </button>
            <span aria-hidden="true" className="text-slate-400">/</span>
            <button type="button" onClick={onBack} className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 hover:text-emerald-950">
              Assigned Projects
            </button>
            <span aria-hidden="true" className="text-slate-400">/</span>
            <span className="text-slate-900">{estimate.project_name}</span>
          </nav>
          <h1 className="mt-4 break-words text-[30px] font-semibold tracking-[-0.035em] text-slate-950 sm:text-[36px]">
            {estimate.project_name} - BOQ Details
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          {onEdit ? (
            <button type="button" onClick={onEdit} disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-[9px] border border-emerald-700 bg-white px-5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-60">
              <Pencil aria-hidden="true" size={17} />
              Edit BOQ
            </button>
          ) : null}
          <button type="button" onClick={onViewReport} className="inline-flex h-11 items-center gap-2 rounded-[9px] border border-emerald-700 bg-white px-5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
            <FileText aria-hidden="true" size={17} />
            View Report
          </button>
          <a href="#submission-status" className="inline-flex h-11 items-center gap-2 rounded-[9px] bg-emerald-800 px-5 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
            <Eye aria-hidden="true" size={18} />
            Submission Status
          </a>
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-[14px] border border-slate-200 bg-white px-6 py-6 shadow-[0_8px_24px_rgba(15,23,42,0.035)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[22px] font-semibold text-slate-950">{estimate.project_name}</h2>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              {formatProjectTypeLabel(estimate.project_type)}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">Review the Bill of Quantities and persisted costs for this project.</p>
        </div>
        <span className={cn("inline-flex w-fit rounded-[8px] border px-3 py-1.5 text-sm font-semibold", getEstimateStatusBadgeClass(estimate.status))}>
          {formatEstimateStatusLabel(estimate.status)}
        </span>
      </section>

      <section aria-label="BOQ totals" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={ClipboardList} label="BOQ Items" value={boqItemCount.toLocaleString("en-PH")} tone="emerald" />
        <Metric icon={Layers3} label="Materials" value={formatBudgetMoney(categoryTotal("materials"))} tone="emerald" />
        <Metric icon={HardHat} label="Labor" value={formatBudgetMoney(categoryTotal("labor"))} tone="amber" />
        <Metric icon={Wrench} label="Equipment" value={formatBudgetMoney(categoryTotal("equipment"))} tone="sky" />
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
        <CostEstimatorBoqTable items={items} />
        <CostEstimatorBoqSidebar estimate={estimate} budgetCeiling={budgetCeiling} />
      </div>
    </div>
  );
}

const METRIC_TONES = {
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-600",
  sky: "bg-sky-50 text-sky-600",
} as const;

function Metric({ icon: Icon, label, value, tone }: { icon: typeof ClipboardList; label: string; value: string; tone: keyof typeof METRIC_TONES }) {
  return (
    <article className="flex min-h-[100px] items-center gap-4 rounded-[14px] border border-slate-200 bg-white px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <span aria-hidden="true" className={cn("inline-flex size-12 shrink-0 items-center justify-center rounded-[12px]", METRIC_TONES[tone])}>
        <Icon size={24} strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-slate-600">{label}</p>
        <p className="mt-1 break-words text-[22px] font-semibold tracking-[-0.025em] text-slate-950">{value}</p>
      </div>
    </article>
  );
}

"use client";

import {
  ClipboardList,
  FilePlus2,
  FileText,
  Info,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatBudgetMoney,
  formatEstimateStatusLabel,
} from "@/features/cost-estimator/utils/costEstimatorFormatters";
import type {
  AssignedEstimateProject,
  ProjectEstimateItemRow,
  ProjectEstimateRow,
} from "@/features/cost-estimator/types";

function formatOptionalMoney(value: number | null) {
  return value === null ? "Not recorded" : formatBudgetMoney(value);
}

function getStatusStyles(status: ProjectEstimateRow["status"] | "not_started") {
  switch (status) {
    case "submitted":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "approved":
      return "border-emerald-300 bg-emerald-50 text-emerald-800";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "draft":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export default function CostEstimatorOverviewProjectCard({
  project,
  estimate,
  items,
  pending,
  onOpen,
}: {
  project: AssignedEstimateProject | null;
  estimate: ProjectEstimateRow | null;
  items: ProjectEstimateItemRow[];
  pending: boolean;
  onOpen: () => void;
}) {
  const isNotStarted = estimate === null;
  const projectName = estimate?.project_name ?? project?.name ?? "Assigned project";
  const projectType = estimate?.project_type ?? null;
  const projectTypeLabel = projectType
    ? projectType.replaceAll("_", " ")
    : project?.subject || "Assigned project";
  const location = estimate?.location || project?.location || "Not recorded";
  const budgetCeiling = project ? project.budgetCeiling : null;
  const estimatedCost = estimate ? Number(estimate.estimate_total ?? 0) : null;
  const remainingBudget =
    budgetCeiling !== null && estimatedCost !== null
      ? budgetCeiling - estimatedCost
      : null;
  const budgetUsage =
    budgetCeiling && estimatedCost !== null
      ? Math.round((estimatedCost / budgetCeiling) * 100)
      : null;
  const status = estimate?.status ?? "not_started";
  const barWidth = Math.min(Math.max(budgetUsage ?? 0, 0), 100);
  const boqItemCount = new Set(
    items.map(
      (item) =>
        (item.boq_section || "General Works").toLowerCase() +
        "::" +
        (item.boq_item_number || String(item.sort_order + 1)).toLowerCase(),
    ),
  ).size;

  return (
    <article className="flex min-h-[474px] min-w-0 flex-col rounded-[14px] border border-slate-200 bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.045)]">
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex max-w-[70%] rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-800">
          {projectTypeLabel}
        </span>
        <span
          className={cn(
            "inline-flex shrink-0 rounded-[8px] border px-3 py-1 text-xs font-semibold",
            getStatusStyles(status),
          )}
        >
          {estimate ? formatEstimateStatusLabel(estimate.status) : "Not Started"}
        </span>
      </div>

      <h3 className="mt-5 break-words text-[23px] font-semibold tracking-[-0.025em] text-slate-950">
        {projectName}
      </h3>

      {isNotStarted ? (
        <>
          <p className="mt-3 flex items-center gap-2 text-[15px] text-slate-600">
            <MapPin aria-hidden="true" size={19} />
            <span className="break-words">{location}</span>
          </p>

          <div className="mt-8 flex min-h-[96px] items-center justify-center gap-3 rounded-[12px] border border-dashed border-emerald-300 bg-emerald-50/20 px-5 text-center text-sm text-slate-600">
            <ClipboardList aria-hidden="true" className="shrink-0 text-emerald-700" size={21} />
            <span>No BOQ has been created for this project.</span>
          </div>

          <div className="mt-7 border-t border-slate-200 pt-7">
            <div className="flex items-center justify-between gap-4 text-[15px]">
              <span className="text-slate-600">Budget Ceiling:</span>
              <span className="text-right font-semibold text-emerald-800">
                {formatOptionalMoney(budgetCeiling)}
              </span>
            </div>
          </div>
        </>
      ) : (
        <>
          <dl className="mt-6 space-y-4 text-[15px]">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600">BOQ Items:</dt>
              <dd className="font-semibold text-slate-950">{boqItemCount.toLocaleString("en-PH")}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600">Estimated Cost:</dt>
              <dd className="text-right font-semibold text-emerald-800">
                {formatOptionalMoney(estimatedCost)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600">Budget Ceiling:</dt>
              <dd className="text-right font-semibold text-slate-950">
                {formatOptionalMoney(budgetCeiling)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600">Remaining Budget:</dt>
              <dd
                className={cn(
                  "text-right font-semibold",
                  remainingBudget !== null && remainingBudget < 0
                    ? "text-rose-700"
                    : "text-emerald-800",
                )}
              >
                {formatOptionalMoney(remainingBudget)}
              </dd>
            </div>
          </dl>

          <div className="mt-7 border-t border-slate-200 pt-6">
            <div className="mb-3 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-700">Estimated Cost</span>
              <span className="font-medium text-slate-700">
                {budgetUsage === null ? "Unavailable" : `${budgetUsage}%`}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300",
                  estimate.status === "submitted" ? "bg-sky-500" : "bg-emerald-700",
                )}
                style={{ width: `${barWidth}%` }}
              />
            </div>

            {estimate.status === "submitted" ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                <Info aria-hidden="true" size={17} className="text-sky-500" />
                Waiting for CEO review
              </p>
            ) : estimate.status === "rejected" ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-rose-700">
                <Info aria-hidden="true" size={17} />
                Returned for correction
              </p>
            ) : null}
          </div>
        </>
      )}

      <div className="mt-auto pt-7">
        <button
          type="button"
          onClick={onOpen}
          disabled={pending}
          className={cn(
            "inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
            isNotStarted
              ? "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800"
              : "border-emerald-700 bg-white text-emerald-800 hover:bg-emerald-50",
          )}
        >
          {isNotStarted ? (
            <FilePlus2 aria-hidden="true" size={18} />
          ) : (
            <FileText aria-hidden="true" size={18} />
          )}
          {isNotStarted ? "Start Estimate" : "View BOQ"}
        </button>
      </div>
    </article>
  );
}

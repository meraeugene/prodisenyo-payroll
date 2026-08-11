import {
  CalendarDays,
  CheckCircle2,
  FilePenLine,
  Info,
  RotateCcw,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBudgetMoney } from "@/features/cost-estimator/utils/costEstimatorFormatters";
import type { ProjectEstimateRow } from "@/features/cost-estimator/types";

function formatUpdatedDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default function CostEstimatorBoqSidebar({
  estimate,
  budgetCeiling,
}: {
  estimate: ProjectEstimateRow;
  budgetCeiling: number | null;
}) {
  const estimatedCost = Number(estimate.estimate_total ?? 0);
  const remainingBudget = budgetCeiling === null ? null : budgetCeiling - estimatedCost;
  const budgetUsage = budgetCeiling ? Math.round((estimatedCost / budgetCeiling) * 100) : null;
  const status = getStatusContent(estimate);
  const StatusIcon = status.icon;

  return (
    <aside className="space-y-5">
      <section className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
        <h2 className="text-xl font-semibold tracking-[-0.025em] text-slate-950">BOQ Summary</h2>
        <dl className="mt-6 space-y-5 text-[15px]">
          <SummaryRow label="Estimated Cost" value={formatBudgetMoney(estimatedCost)} valueClassName="text-emerald-800" />
          <SummaryRow label="Budget Ceiling" value={budgetCeiling === null ? "Not recorded" : formatBudgetMoney(budgetCeiling)} />
          <SummaryRow
            label="Remaining Budget"
            value={remainingBudget === null ? "Unavailable" : formatBudgetMoney(remainingBudget)}
            valueClassName={remainingBudget !== null && remainingBudget < 0 ? "text-rose-700" : "text-emerald-800"}
          />
        </dl>

        <div className="mt-6 border-t border-slate-200 pt-5">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Budget Usage</span>
            <span className="font-medium text-slate-800">{budgetUsage === null ? "Unavailable" : `${budgetUsage}%`}</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-emerald-700" style={{ width: `${Math.min(Math.max(budgetUsage ?? 0, 0), 100)}%` }} />
          </div>
        </div>
      </section>

      <section id="submission-status" className="scroll-mt-24 rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
        <h2 className="text-xl font-semibold tracking-[-0.025em] text-slate-950">Submission & Notes</h2>

        <div className={cn("mt-4 flex items-start gap-4 rounded-[10px] border p-4", status.wrapperClassName)}>
          <StatusIcon aria-hidden="true" className="mt-0.5 shrink-0" size={27} />
          <div>
            <p className="font-semibold">{status.title}</p>
            <p className="mt-1 text-sm leading-6 opacity-80">{status.description}</p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-4 text-sm">
          <span className="flex items-center gap-2 text-slate-600">
            <CalendarDays aria-hidden="true" size={17} />
            Last updated
          </span>
          <span className="font-medium text-slate-900">{formatUpdatedDate(estimate.updated_at)}</span>
        </div>

        <div className="pt-4">
          <p className="text-sm font-semibold text-slate-900">Notes</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{estimate.notes?.trim() || "No additional notes."}</p>
          {estimate.status === "rejected" && estimate.rejection_reason?.trim() ? (
            <div className="mt-4 rounded-[10px] border border-rose-200 bg-rose-50 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-rose-800">
                <Info aria-hidden="true" size={16} />
                CEO correction note
              </p>
              <p className="mt-2 text-sm leading-6 text-rose-700">{estimate.rejection_reason}</p>
            </div>
          ) : null}
        </div>
      </section>
    </aside>
  );
}

function SummaryRow({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-600">{label}</dt>
      <dd className={cn("text-right font-semibold text-slate-950", valueClassName)}>{value}</dd>
    </div>
  );
}

function getStatusContent(estimate: ProjectEstimateRow) {
  switch (estimate.status) {
    case "submitted":
      return { icon: Send, title: "Submitted to CEO review", description: "Your BOQ has been submitted and is awaiting review.", wrapperClassName: "border-sky-200 bg-sky-50 text-sky-800" };
    case "approved":
      return { icon: CheckCircle2, title: "Approved by CEO", description: "This BOQ is the approved estimate baseline for the project.", wrapperClassName: "border-emerald-200 bg-emerald-50 text-emerald-800" };
    case "rejected":
      return { icon: RotateCcw, title: "Returned for correction", description: "Review the CEO note, then reopen and update the BOQ.", wrapperClassName: "border-rose-200 bg-rose-50 text-rose-800" };
    default:
      return { icon: FilePenLine, title: "Draft estimate", description: "This BOQ is still being prepared and has not been submitted.", wrapperClassName: "border-amber-200 bg-amber-50 text-amber-800" };
  }
}

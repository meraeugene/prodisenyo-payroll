import {
  CheckCircle2,
  Eye,
  LoaderCircle,
  XCircle,
} from "lucide-react";
import type { ReviewProjectEstimateRow } from "@/features/cost-estimator/types";
import {
  formatBudgetMoney,
  formatEstimateDateTime,
  formatProjectTypeLabel,
} from "@/features/cost-estimator/utils/costEstimatorFormatters";
import { cn } from "@/lib/utils";

type PendingEstimateAction = {
  id: string;
  type: "approve" | "return";
} | null;

type ProjectEstimateReviewSectionProps = {
  estimates: ReviewProjectEstimateRow[];
  projectBudget: number;
  pendingAction: PendingEstimateAction;
  onViewDetails: (estimateId: string) => void;
  onReturn: (estimateId: string) => void;
  onApprove: (estimateId: string) => void;
};

export default function ProjectEstimateReviewSection({
  estimates,
  projectBudget,
  pendingAction,
  onViewDetails,
  onReturn,
  onApprove,
}: ProjectEstimateReviewSectionProps) {
  return (
    <section aria-label="Project estimate reviews" className="space-y-4">
      {estimates.map((estimate) =>
        estimate.status === "draft" ? (
          <article
            key={estimate.id}
            className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm font-semibold text-slate-500"
          >
            Waiting for engineer submission
          </article>
        ) : (
          <EstimateReviewCard
            key={estimate.id}
            estimate={estimate}
            projectBudget={projectBudget}
            pendingAction={pendingAction}
            onViewDetails={onViewDetails}
            onReturn={onReturn}
            onApprove={onApprove}
          />
        ),
      )}

      {!estimates.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
          <p className="text-sm font-semibold text-slate-700">
            No estimates submitted for CEO approval yet.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function EstimateReviewCard({
  estimate,
  projectBudget,
  pendingAction,
  onViewDetails,
  onReturn,
  onApprove,
}: {
  estimate: ReviewProjectEstimateRow;
  projectBudget: number;
  pendingAction: PendingEstimateAction;
  onViewDetails: (estimateId: string) => void;
  onReturn: (estimateId: string) => void;
  onApprove: (estimateId: string) => void;
}) {
  const isSubmitted = estimate.status === "submitted";
  const isOverBudget = Number(estimate.estimate_total) > projectBudget;
  const engineer =
    estimate.requester_profile?.full_name?.trim() ||
    estimate.requester_profile?.username ||
    "Unknown engineer";

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-10">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            Estimate review
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold tracking-[-0.025em] text-slate-950">
              {estimate.project_name}
            </h2>
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold",
                isSubmitted
                  ? "bg-emerald-50 text-emerald-800"
                  : "border border-slate-200 bg-slate-50 capitalize text-slate-600",
              )}
            >
              <CheckCircle2 aria-hidden="true" size={15} />
              {isSubmitted ? "Needs CEO Approval" : estimate.status}
            </span>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-3 sm:gap-6">
            <EstimateDetail
              label="Type"
              value={formatProjectTypeLabel(estimate.project_type)}
            />
            <EstimateDetail
              label="Submitted"
              value={formatEstimateDateTime(
                estimate.submitted_at ?? estimate.created_at,
              )}
            />
            <EstimateDetail label="Engineer" value={engineer} />
          </dl>
        </div>

        <div className="border-t border-slate-200 pt-5 lg:min-w-72 lg:border-l lg:border-t-0 lg:py-3 lg:pl-10 lg:text-right">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            Submitted estimate
          </p>
          <p
            className={cn(
              "mt-2 text-3xl font-bold tracking-[-0.03em]",
              isOverBudget ? "text-rose-600" : "text-emerald-800",
            )}
          >
            {formatBudgetMoney(estimate.estimate_total)}
          </p>
          {isOverBudget ? (
            <p className="mt-1 text-xs font-semibold text-rose-600">
              Over budget ceiling
            </p>
          ) : null}
        </div>
      </div>

      {isSubmitted ? (
        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <button
            type="button"
            onClick={() => onViewDetails(estimate.id)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
          >
            <Eye aria-hidden="true" size={16} />
            View details
          </button>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => onReturn(estimate.id)}
              disabled={pendingAction !== null}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingAction?.id === estimate.id &&
              pendingAction.type === "return" ? (
                <LoaderCircle
                  aria-hidden="true"
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <XCircle aria-hidden="true" size={16} />
              )}
              Return
            </button>
            <button
              type="button"
              onClick={() => onApprove(estimate.id)}
              disabled={pendingAction !== null}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingAction?.id === estimate.id &&
              pendingAction.type === "approve" ? (
                <LoaderCircle
                  aria-hidden="true"
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <CheckCircle2 aria-hidden="true" size={16} />
              )}
              Approve
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-slate-200 px-5 py-4 text-right sm:px-6">
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
            No action needed
          </span>
        </div>
      )}
    </article>
  );
}

function EstimateDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm font-medium leading-5 text-slate-800">
        {value}
      </dd>
    </div>
  );
}

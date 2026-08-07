"use client";

import { useState } from "react";
import {
  LoaderCircle,
  CornerUpLeft,
  CheckCircle2,
  XCircle,
  PencilLine,
} from "lucide-react";
import DashboardPageHero from "@/components/DashboardPageHero";
import CostEstimatorConfirmModal from "@/features/cost-estimator/components/CostEstimatorConfirmModal";
import EstimateReportModal from "@/features/cost-estimator/components/EstimateReportModal";
import CeoEstimateEditDialog from "@/features/cost-estimator/components/CeoEstimateEditDialog";
import EstimateReviewsTable from "@/features/cost-estimator/components/EstimateReviewsTable";
import { useEstimateReviewsPage } from "@/features/cost-estimator/hooks/useEstimateReviewsPage";
import type {
  ProjectEstimateItemRow,
  ReviewProjectEstimateRow,
} from "@/features/cost-estimator/types";
import { cn } from "@/lib/utils";

export default function EstimateReviewsPageClient({
  estimates,
  items,
  embedded = false,
  onEstimateApproved,
  projectId,
}: {
  estimates: ReviewProjectEstimateRow[];
  items: ProjectEstimateItemRow[];
  embedded?: boolean;
  onEstimateApproved?: (estimate: ReviewProjectEstimateRow) => void;
  projectId?: string;
}) {
  const state = useEstimateReviewsPage({ estimates, items, onEstimateApproved, projectId });
  const [editingEstimate, setEditingEstimate] = useState(false);

  return (
    <div className={cn("p-0", !embedded && "sm:p-6")}>
      {!embedded ? (
        <DashboardPageHero eyebrow="CEO Review" title="Estimate Approvals" />
      ) : null}

      <EstimateReviewsTable
        estimates={state.sortedEstimates}
        pendingReviewsCount={state.pendingReviewsCount}
        onOpenReport={state.setActiveEstimateId}
        onDeleteEstimate={state.setDeleteEstimateId}
      />

      {state.activeEstimate ? (
        <EstimateReportModal
          estimate={state.activeEstimate}
          items={state.activeEstimateItems}
          onClose={() => state.setActiveEstimateId(null)}
          footer={
            state.activeEstimate.status === "submitted" ? (
              <div className="ml-auto flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setEditingEstimate(true)}
                  disabled={state.isPending}
                  className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-60 sm:w-auto"
                >
                  <PencilLine size={16} className="mr-2" />
                  Edit Estimate
                </button>
                <button
                  type="button"
                  onClick={() =>
                    state.setRejectEstimateId(state.activeEstimate!.id)
                  }
                  disabled={state.isPending}
                  className="inline-flex h-10 w-full items-center justify-center rounded-xl  px-4 text-sm font-semibold  transition  disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[180px] text-[#2d6a4f] bg-[#eef7f0] hover:bg-[#e2efe5] "
                >
                  {state.isPending && state.pendingActionType === "reject" ? (
                    <>
                      <LoaderCircle size={15} className="mr-2 animate-spin" />
                      Returning...
                    </>
                  ) : (
                    <>
                      <XCircle size={17} className="mr-2" />
                      Return Estimate
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    state.handleApproveEstimate(state.activeEstimate!.id)
                  }
                  disabled={state.isPending}
                  className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#1f6a37] px-4 text-sm font-semibold text-white transition hover:bg-[#18552d] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[180px]"
                >
                  {state.isPending && state.pendingActionType === "approve" ? (
                    <>
                      <LoaderCircle size={15} className="mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} className="mr-2" />
                      Approve Estimate
                    </>
                  )}
                </button>
              </div>
            ) : null
          }
        />
      ) : null}

      {editingEstimate && state.activeEstimate ? (
        <CeoEstimateEditDialog
          estimateId={state.activeEstimate.id}
          items={state.activeEstimateItems}
          onClose={() => setEditingEstimate(false)}
          onSaved={() => state.refresh()}
        />
      ) : null}

      {state.rejectEstimateId ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.24)]">
            <div className="border-b border-apple-mist bg-[linear-gradient(135deg,#112e1a,#1f4f2c,#245f34)] px-5 py-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                Return Estimate
              </p>
              <h2 className="mt-2 text-lg font-semibold">
                Send this estimate back to the engineer
              </h2>
            </div>

            <div className="space-y-4 px-5 py-5">
              <textarea
                value={state.rejectionReason}
                onChange={(event) =>
                  state.setRejectionReason(event.target.value)
                }
                rows={5}
                placeholder="Add an optional return note for the engineer."
                className="w-full rounded-2xl border border-apple-mist px-3 py-3 text-sm text-apple-charcoal outline-none transition focus:border-[#1f6a37]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    state.setRejectEstimateId(null);
                    state.setRejectionReason("");
                  }}
                  disabled={state.isPending}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-apple-mist px-4 text-sm font-semibold text-apple-charcoal transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={state.handleConfirmReject}
                  disabled={state.isPending}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-[#5b7d63] px-4 text-sm font-semibold text-white transition hover:bg-[#4d6b54] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {state.isPending ? (
                    <>
                      <LoaderCircle size={15} className="mr-2 animate-spin" />
                      Returning...
                    </>
                  ) : (
                    "Confirm Return"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <CostEstimatorConfirmModal
        open={state.deleteEstimateId !== null}
        title="Delete estimate?"
        description="This will permanently remove the selected estimate from the review list."
        confirmLabel="Delete estimate"
        confirmTone="danger"
        pending={state.isPending && state.deleteEstimateId !== null}
        onConfirm={state.handleConfirmDelete}
        onCancel={() => state.setDeleteEstimateId(null)}
      />
    </div>
  );
}

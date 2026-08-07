"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  deleteReviewedProjectEstimateAction,
  getEstimateReviewsDataAction,
  rejectProjectEstimateAction,
} from "@/actions/costEstimator";
import { approveProjectEstimateWithBaselineAction } from "@/actions/estimateProcurement";
import type {
  ProjectEstimateItemRow,
  ReviewProjectEstimateRow,
} from "@/features/cost-estimator/types";
import { buildEstimateItemsMap } from "@/features/cost-estimator/utils/costEstimatorMappers";

interface UseEstimateReviewsPageOptions {
  estimates: ReviewProjectEstimateRow[];
  items: ProjectEstimateItemRow[];
  onEstimateApproved?: (estimate: ReviewProjectEstimateRow) => void;
  projectId?: string;
}

function sortReviewEstimates(estimates: ReviewProjectEstimateRow[]) {
  const statusOrder: Record<ReviewProjectEstimateRow["status"], number> = {
    submitted: 0,
    approved: 1,
    rejected: 2,
    draft: 3,
  };

  return [...estimates].sort((left, right) => {
    const statusDiff = statusOrder[left.status] - statusOrder[right.status];
    if (statusDiff !== 0) return statusDiff;
    return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
  });
}

export function useEstimateReviewsPage({
  estimates: initialEstimates,
  items: initialItems,
  onEstimateApproved,
  projectId,
}: UseEstimateReviewsPageOptions) {
  const [activeEstimateId, setActiveEstimateId] = useState<string | null>(null);
  const [deleteEstimateId, setDeleteEstimateId] = useState<string | null>(null);
  const [rejectEstimateId, setRejectEstimateId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [pendingActionType, setPendingActionType] = useState<
    "approve" | "reject" | null
  >(null);
  const [isPending, setIsPending] = useState(false);
  const { data, isLoading, isValidating, mutate } = useSWR(
    ["estimate-approvals", projectId || "all"],
    () => getEstimateReviewsDataAction(projectId),
    {
      fallbackData: {
        estimates: initialEstimates,
        items: initialItems,
      },
      refreshInterval: 15000,
      revalidateOnFocus: true,
    },
  );
  const estimates = data?.estimates ?? initialEstimates;
  const itemsByEstimateId = useMemo(
    () => buildEstimateItemsMap(data?.items ?? initialItems),
    [data?.items, initialItems],
  );

  const sortedEstimates = useMemo(
    () => sortReviewEstimates(estimates),
    [estimates],
  );
  const activeEstimate =
    sortedEstimates.find((estimate) => estimate.id === activeEstimateId) ?? null;
  const activeEstimateItems = activeEstimate
    ? itemsByEstimateId[activeEstimate.id] ?? []
    : [];
  const pendingReviewsCount = useMemo(
    () => estimates.filter((estimate) => estimate.status === "submitted").length,
    [estimates],
  );

  function applyEstimateUpdate(estimate: ReviewProjectEstimateRow) {
    void mutate(
      (current) => ({
        estimates:
          current?.estimates.map((entry) =>
            entry.id === estimate.id ? estimate : entry,
          ) ?? [],
        items: current?.items ?? [],
      }),
      false,
    );
  }

  function handleConfirmDelete() {
    if (!deleteEstimateId) return;

    void (async () => {
      try {
        setIsPending(true);
        setPendingActionId(deleteEstimateId);
        setPendingActionType(null);
        await deleteReviewedProjectEstimateAction(deleteEstimateId);
        await mutate(
          (current) => ({
            estimates:
              current?.estimates.filter((entry) => entry.id !== deleteEstimateId) ?? [],
            items:
              current?.items.filter((entry) => entry.estimate_id !== deleteEstimateId) ?? [],
          }),
          false,
        );
        if (activeEstimateId === deleteEstimateId) {
          setActiveEstimateId(null);
        }
        setDeleteEstimateId(null);
        toast.success("Estimate deleted.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete estimate.",
        );
      } finally {
        setIsPending(false);
        setPendingActionId(null);
      }
    })();
  }

  function handleApproveEstimate(estimateId: string) {
    void (async () => {
      try {
        setIsPending(true);
        setPendingActionId(estimateId);
        setPendingActionType("approve");
        const result = await approveProjectEstimateWithBaselineAction(estimateId);
        applyEstimateUpdate(result.estimate);
        onEstimateApproved?.(result.estimate);
        void mutate();
        toast.success("Estimate approved and linked to Budget Tracker.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to approve estimate.",
        );
      } finally {
        setIsPending(false);
        setPendingActionId(null);
        setPendingActionType(null);
      }
    })();
  }

  function handleConfirmReject() {
    if (!rejectEstimateId) return;

    void (async () => {
      try {
        setIsPending(true);
        setPendingActionId(rejectEstimateId);
        setPendingActionType("reject");
        const result = await rejectProjectEstimateAction({
          estimateId: rejectEstimateId,
          rejectionReason,
        });
        applyEstimateUpdate(result.estimate);
        void mutate();
        setRejectEstimateId(null);
        setRejectionReason("");
        toast.success("Estimate returned to the engineer.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to return estimate.",
        );
      } finally {
        setIsPending(false);
        setPendingActionId(null);
        setPendingActionType(null);
      }
    })();
  }

  return {
    sortedEstimates,
    activeEstimate,
    activeEstimateItems,
    pendingReviewsCount,
    deleteEstimateId,
    rejectEstimateId,
    rejectionReason,
    setActiveEstimateId,
    setDeleteEstimateId,
    setRejectEstimateId,
    setRejectionReason,
    pendingActionId,
    pendingActionType,
    isPending,
    loading: isLoading,
    refreshing: isValidating,
    handleConfirmDelete,
    handleApproveEstimate,
    handleConfirmReject,
    refresh: mutate,
  };
}

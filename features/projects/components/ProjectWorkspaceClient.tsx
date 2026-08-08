"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import useSWR from "swr";
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  approveProjectEstimateAction,
  rejectProjectEstimateAction,
} from "@/actions/costEstimator";
import { approveProjectEstimateWithBaselineAction } from "@/actions/estimateProcurement";
import {
  getProjectWorkspaceDataAction,
  submitProjectProgressAction,
} from "@/actions/projects";
import MaterialApprovalsPageClient from "@/features/material-approvals/components/MaterialApprovalsPageClient";
import PurchasingApprovalsPageClient from "@/features/purchasing-approvals/components/PurchasingApprovalsPageClient";
import EstimateReportModal from "@/features/cost-estimator/components/EstimateReportModal";
import EngineeringProgressWorksheet from "./EngineeringProgressWorksheet";
import EngineerProjectOverview from "./EngineerProjectOverview";
import ProjectProgressUpdatesPanel from "./ProjectProgressUpdatesPanel";
import ProjectMaterialsPanel from "./ProjectMaterialsPanel";
import type { ProjectMaterialRequest } from "@/features/material-approvals/types";
import { buildPlannedMaterialRows } from "@/features/material-requests/utils/plannedMaterials";
import ProjectDocumentsPanel from "@/features/project-documents/components/ProjectDocumentsPanel";
import type { ProjectDocumentRecord } from "@/features/project-documents/types";
import ProjectActivityLogPanel from "@/features/project-activity-log/components/ProjectActivityLogPanel";
import ProjectCostTrackingPanel from "@/features/project-cost-tracking/components/ProjectCostTrackingPanel";
import type {
  ProjectExpenseRecord,
  ProjectMaterialReceipt,
  ProjectPurchaseOrder,
} from "@/features/project-cost-tracking/types";
import type { ProjectProgressUpdateRecord } from "../progressUpdateTypes";
import CeoProjectOverview from "./CeoProjectOverview";
import ProjectEstimateReviewSection from "./ProjectEstimateReviewSection";
import ProjectWorkspaceHeader from "./ProjectWorkspaceHeader";
import ProjectWorkspaceTabs from "./ProjectWorkspaceTabs";
import ProjectPreviewNotice from "./ProjectPreviewNotice";
import ProjectReturnEstimateDialog from "./ProjectReturnEstimateDialog";
import ProjectWorkspaceTabSkeleton from "./ProjectWorkspaceTabSkeleton";
import type { ImportedProgressActivity } from "../utils/engineeringProgressImport";
import type { EngineeringProgressActivityRecord } from "../utils/engineeringWorkspace";
import type {
  ProjectEstimateItemRow,
  ReviewProjectEstimateRow,
} from "@/features/cost-estimator/types";
import type { ProjectRecord } from "../types";

type Activity = {
  id: string;
  activity: string;
  weight_percent: number;
  progress_percent: number;
  created_at?: string;
  updated_at?: string;
};
type Estimate = ReviewProjectEstimateRow;
type ProgressSubmission = { id: string; activity_count: number; submitted_at: string };
type MaterialRequestActivity = ProjectMaterialRequest;
type BudgetItem = {
  id: string;
  name: string;
  category: string;
  estimated_cost: number;
  actual_spent: number;
  status: string;
};
type WorkspaceData = {
  activities: Activity[];
  estimates: Estimate[];
  estimateItems: ProjectEstimateItemRow[];
  budgetItems: BudgetItem[];
  progressSubmissions: ProgressSubmission[];
  materialRequests: MaterialRequestActivity[];
  progressUpdates: ProjectProgressUpdateRecord[];
  documents?: ProjectDocumentRecord[];
  projectExpenses?: ProjectExpenseRecord[];
  purchaseOrders?: ProjectPurchaseOrder[];
  materialReceipts?: ProjectMaterialReceipt[];
};

const CEO_TABS = ["overview", "estimates", "materials", "purchasing", "documents", "activity-log", "cost-tracking"] as const;
const ENGINEER_TABS = ["overview", "activities", "progress-updates", "materials", "documents", "activity-log", "cost-tracking"] as const;
type WorkspaceTab = (typeof CEO_TABS)[number] | (typeof ENGINEER_TABS)[number];

function mapActivity(projectName: string, activity: Activity): EngineeringProgressActivityRecord {
  return {
    id: activity.id,
    projectName,
    activity: activity.activity,
    weightPercent: Number(activity.weight_percent),
    progressPercent: Number(activity.progress_percent),
    createdAt: activity.created_at ?? activity.id,
    updatedAt: activity.updated_at ?? activity.created_at ?? activity.id,
  };
}

export default function ProjectWorkspaceClient({
  project,
  currentUserId,
  canUpdateProgress,
  canCreateEstimate,
  canReviewEstimates,
  activities,
  estimates,
  estimateItems,
  budgetItems,
  progressSubmissions,
  materialRequests,
  progressUpdates,
  documents,
  projectExpenses,
  purchaseOrders,
  materialReceipts,
}: {
  project: ProjectRecord;
  currentUserId: string;
  canUpdateProgress: boolean;
  canCreateEstimate: boolean;
  canReviewEstimates: boolean;
  activities: Activity[];
  estimates: Estimate[];
  estimateItems: ProjectEstimateItemRow[];
  budgetItems: BudgetItem[];
  progressSubmissions: ProgressSubmission[];
  materialRequests: MaterialRequestActivity[];
  progressUpdates: ProjectProgressUpdateRecord[];
  documents: ProjectDocumentRecord[];
  projectExpenses: ProjectExpenseRecord[];
  purchaseOrders: ProjectPurchaseOrder[];
  materialReceipts: ProjectMaterialReceipt[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const tabs: readonly WorkspaceTab[] = canReviewEstimates ? CEO_TABS : ENGINEER_TABS;
  const selected = params.get("tab");
  const tab = tabs.includes(selected as WorkspaceTab) ? (selected as WorkspaceTab) : "overview";
  const [pendingTab, setPendingTab] = useState<WorkspaceTab | null>(null);
  const [isTabPending, startTabTransition] = useTransition();
  const [isSubmittingProgress, setIsSubmittingProgress] = useState(false);
  const [pendingEstimateAction, setPendingEstimateAction] = useState<{
    id: string;
    type: "approve" | "return";
  } | null>(null);
  const [returnEstimateId, setReturnEstimateId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [activeEstimateId, setActiveEstimateId] = useState<string | null>(null);
  const workspaceState = useSWR<WorkspaceData>(
    ["project-workspace", project.id],
    async () => getProjectWorkspaceDataAction(project.id) as Promise<WorkspaceData>,
    {
      fallbackData: { activities, estimates, estimateItems, budgetItems, progressSubmissions, materialRequests, progressUpdates, documents, projectExpenses, purchaseOrders, materialReceipts },
      refreshInterval: 4000,
      revalidateOnFocus: true,
    },
  );
  const liveActivities = workspaceState.data?.activities ?? activities;
  const liveEstimates = workspaceState.data?.estimates ?? estimates;
  const liveEstimateItems = workspaceState.data?.estimateItems ?? estimateItems;
  const liveBudgetItems = workspaceState.data?.budgetItems ?? budgetItems;
  const liveProgressSubmissions = workspaceState.data?.progressSubmissions ?? progressSubmissions;
  const liveMaterialRequests = workspaceState.data?.materialRequests ?? materialRequests;
  const liveProgressUpdates = workspaceState.data?.progressUpdates ?? progressUpdates;
  const liveDocuments = workspaceState.data?.documents ?? documents ?? [];
  const liveProjectExpenses = workspaceState.data?.projectExpenses ?? projectExpenses ?? [];
  const livePurchaseOrders = workspaceState.data?.purchaseOrders ?? purchaseOrders ?? [];
  const liveMaterialReceipts = workspaceState.data?.materialReceipts ?? materialReceipts ?? [];
  const plannedMaterials = buildPlannedMaterialRows(
    project.activeApprovedEstimateId,
    liveEstimateItems,
    liveMaterialRequests,
  );

  const activityRows = liveActivities.map((activity) => mapActivity(project.name, activity));
  const activeEstimate =
    liveEstimates.find((estimate) => estimate.id === activeEstimateId) ?? null;
  const activeEstimateItems = activeEstimate
    ? liveEstimateItems.filter((item) => item.estimate_id === activeEstimate.id)
    : [];

  useEffect(() => {
    if (tab === "estimates" && canCreateEstimate && !canReviewEstimates) {
      router.replace(`/cost-estimator?projectId=${project.id}`);
    }
  }, [canCreateEstimate, canReviewEstimates, project.id, router, tab]);

  useEffect(() => {
    if (!isTabPending) setPendingTab(null);
  }, [isTabPending]);

  function switchTab(nextTab: WorkspaceTab) {
    if (nextTab === tab || isTabPending) return;

    const href =
      nextTab === "estimates" && canCreateEstimate && !canReviewEstimates
        ? `/cost-estimator?projectId=${project.id}`
        : `/projects/${project.id}?tab=${nextTab}`;

    setPendingTab(nextTab);
    startTabTransition(() => {
      router.push(href);
    });
  }

  function submitProgress(nextActivities: ImportedProgressActivity[]) {
    if (!canUpdateProgress) return;

    setIsSubmittingProgress(true);
    submitProjectProgressAction({
      projectId: project.id,
      activities: nextActivities,
    })
      .then(async () => {
        await workspaceState.mutate();
        toast.success("Progress submitted to CEO.");
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Unable to submit progress.");
      })
      .finally(() => setIsSubmittingProgress(false));
  }

  function updateLiveEstimate(updatedEstimate: Estimate) {
    void workspaceState.mutate(
      (current) => ({
        activities: current?.activities ?? liveActivities,
        estimateItems: current?.estimateItems ?? liveEstimateItems,
        budgetItems: current?.budgetItems ?? liveBudgetItems,
        progressSubmissions: current?.progressSubmissions ?? liveProgressSubmissions,
        materialRequests: current?.materialRequests ?? liveMaterialRequests,
        progressUpdates: current?.progressUpdates ?? liveProgressUpdates,
        estimates:
          current?.estimates.map((estimate) =>
            estimate.id === updatedEstimate.id ? updatedEstimate : estimate,
          ) ?? liveEstimates,
      }),
      false,
    );
  }

  function approveEstimate(estimateId: string) {
    void (async () => {
      try {
        setPendingEstimateAction({ id: estimateId, type: "approve" });
        const result = await approveProjectEstimateWithBaselineAction(estimateId);
        updateLiveEstimate(result.estimate as Estimate);
        await workspaceState.mutate();
        setActiveEstimateId(null);
        toast.success("Estimate approved and linked to Budget Tracker.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to approve estimate.",
        );
      } finally {
        setPendingEstimateAction(null);
      }
    })();
  }

  function confirmReturnEstimate() {
    if (!returnEstimateId) return;

    void (async () => {
      try {
        setPendingEstimateAction({ id: returnEstimateId, type: "return" });
        const result = await rejectProjectEstimateAction({
          estimateId: returnEstimateId,
          rejectionReason: returnReason,
        });
        updateLiveEstimate(result.estimate as Estimate);
        await workspaceState.mutate();
        setReturnEstimateId(null);
        setActiveEstimateId(null);
        setReturnReason("");
        toast.success("Estimate returned to the engineer.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to return estimate.",
        );
      } finally {
        setPendingEstimateAction(null);
      }
    })();
  }

  return (
    <div className="min-h-full space-y-5 bg-slate-50/40 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="sticky top-0 z-40 -mx-4 -mt-5 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:-mt-7 lg:px-8">
        <Link href="/projects" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2">
          <ArrowLeft size={15} /> Back to Projects
        </Link>
      </div>
      <ProjectWorkspaceHeader project={project} />
      <ProjectWorkspaceTabs
        tabs={tabs}
        activeTab={pendingTab ?? tab}
        disabled={isTabPending}
        onSelect={switchTab}
      />

      {isTabPending ? (
        <ProjectWorkspaceTabSkeleton tab={pendingTab ?? tab} />
      ) : null}

      {!isTabPending && tab === "overview" ? (
        canReviewEstimates ? (
          <CeoProjectOverview
            project={project}
            budgetItems={liveBudgetItems}
            progressUpdates={liveProgressUpdates}
          />
        ) : (
          <EngineerProjectOverview
            project={project}
            activities={activityRows}
            budgetItems={liveBudgetItems}
            submissions={liveProgressSubmissions}
            materialRequests={liveMaterialRequests}
            progressUpdates={liveProgressUpdates}
            canUpdateProgress={canUpdateProgress}
            onUpdateProgress={() => switchTab("progress-updates")}
            onOpenMaterials={() => switchTab("materials")}
          />
        )
      ) : null}


      {!isTabPending && tab === "activities" ? (
        <EngineeringProgressWorksheet
          activities={activityRows}
          readOnly={!canUpdateProgress}
          isSubmitting={isSubmittingProgress}
          onSubmitProgress={submitProgress}
        />
      ) : null}

      {!isTabPending && tab === "progress-updates" ? (
        <ProjectProgressUpdatesPanel
          projectId={project.id}
          updates={liveProgressUpdates}
          canSubmit={canUpdateProgress}
          onCreated={(update) => {
            void workspaceState.mutate(
              (current) => ({
                activities: current?.activities ?? liveActivities,
                estimates: current?.estimates ?? liveEstimates,
                estimateItems: current?.estimateItems ?? liveEstimateItems,
                budgetItems: current?.budgetItems ?? liveBudgetItems,
                progressSubmissions: current?.progressSubmissions ?? liveProgressSubmissions,
                materialRequests: current?.materialRequests ?? liveMaterialRequests,
                progressUpdates: [update, ...(current?.progressUpdates ?? liveProgressUpdates)],
              }),
              false,
            );
          }}
        />
      ) : null}
      {!isTabPending && tab === "estimates" && canReviewEstimates ? (
        <ProjectEstimateReviewSection
          estimates={liveEstimates}
          projectBudget={project.budget}
          pendingAction={pendingEstimateAction}
          onViewDetails={setActiveEstimateId}
          onReturn={setReturnEstimateId}
          onApprove={approveEstimate}
        />
      ) : null}

      {!isTabPending && tab === "materials" ? (
        canReviewEstimates ? (
          <MaterialApprovalsPageClient
            projectName={project.name}
            requestedBy={project.engineer}
            requests={liveMaterialRequests}
            plannedMaterials={plannedMaterials}
            purchaseOrders={livePurchaseOrders}
            canManage
            onReviewed={() => workspaceState.mutate()}
          />
        ) : (
          <ProjectMaterialsPanel
            projectId={project.id}
            requests={liveMaterialRequests}
            plannedMaterials={plannedMaterials}
            purchaseOrders={livePurchaseOrders}
          />
        )
      ) : null}
      {!isTabPending && tab === "purchasing" ? (
        <>
          <ProjectPreviewNotice label="Purchasing approvals are preview data in this phase." />
          <PurchasingApprovalsPageClient projectName={project.name} />
        </>
      ) : null}
      {!isTabPending && tab === "documents" ? (
        <ProjectDocumentsPanel
          projectId={project.id}
          documents={liveDocuments}
          canUpload={canUpdateProgress}
          currentUserId={currentUserId}
          onCreated={(document) => {
            void workspaceState.mutate(
              (current) => ({
                activities: current?.activities ?? liveActivities,
                estimates: current?.estimates ?? liveEstimates,
                estimateItems: current?.estimateItems ?? liveEstimateItems,
                budgetItems: current?.budgetItems ?? liveBudgetItems,
                progressSubmissions: current?.progressSubmissions ?? liveProgressSubmissions,
                materialRequests: current?.materialRequests ?? liveMaterialRequests,
                progressUpdates: current?.progressUpdates ?? liveProgressUpdates,
                documents: [document, ...(current?.documents ?? liveDocuments)],
              }),
              false,
            );
          }}
          onDeleted={(documentId) => {
            void workspaceState.mutate(
              (current) => ({
                activities: current?.activities ?? liveActivities,
                estimates: current?.estimates ?? liveEstimates,
                estimateItems: current?.estimateItems ?? liveEstimateItems,
                budgetItems: current?.budgetItems ?? liveBudgetItems,
                progressSubmissions: current?.progressSubmissions ?? liveProgressSubmissions,
                materialRequests: current?.materialRequests ?? liveMaterialRequests,
                progressUpdates: current?.progressUpdates ?? liveProgressUpdates,
                documents: (current?.documents ?? liveDocuments).filter((document) => document.id !== documentId),
              }),
              false,
            );
          }}
        />
      ) : null}
      {!isTabPending && tab === "activity-log" ? (
        <ProjectActivityLogPanel
          engineerName={project.engineer}
          progressUpdates={liveProgressUpdates}
          progressSubmissions={liveProgressSubmissions}
          materialRequests={liveMaterialRequests}
          documents={liveDocuments}
        />
      ) : null}
      {!isTabPending && tab === "cost-tracking" ? (
        <ProjectCostTrackingPanel
          startingBudget={project.budget}
          materialRequests={liveMaterialRequests}
          purchaseOrders={livePurchaseOrders}
          materialReceipts={liveMaterialReceipts}
          expenses={liveProjectExpenses}
        />
      ) : null}

      {activeEstimate ? (
        <EstimateReportModal
          estimate={activeEstimate}
          items={activeEstimateItems}
          onClose={() => setActiveEstimateId(null)}
          footer={
            activeEstimate.status === "submitted" ? (
              <div className="ml-auto flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setReturnEstimateId(activeEstimate.id)}
                  disabled={pendingEstimateAction !== null}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <XCircle size={16} />
                  Return
                </button>
                <button
                  type="button"
                  onClick={() => approveEstimate(activeEstimate.id)}
                  disabled={pendingEstimateAction !== null}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {pendingEstimateAction?.id === activeEstimate.id &&
                  pendingEstimateAction.type === "approve" ? (
                    <LoaderCircle size={15} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  Approve
                </button>
              </div>
            ) : null
          }
        />
      ) : null}

      {returnEstimateId ? (
        <ProjectReturnEstimateDialog
          reason={returnReason}
          isPending={pendingEstimateAction !== null}
          onReasonChange={setReturnReason}
          onCancel={() => {
            setReturnEstimateId(null);
            setReturnReason("");
          }}
          onConfirm={confirmReturnEstimate}
        />
      ) : null}
    </div>
  );
}

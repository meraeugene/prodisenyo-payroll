"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  LoaderCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  approveProjectEstimateAction,
  rejectProjectEstimateAction,
} from "@/actions/costEstimator";
import {
  getProjectWorkspaceDataAction,
  submitProjectProgressAction,
} from "@/actions/projects";
import MaterialApprovalsPageClient from "@/features/material-approvals/components/MaterialApprovalsPageClient";
import PurchasingApprovalsPageClient from "@/features/purchasing-approvals/components/PurchasingApprovalsPageClient";
import EstimateReportModal from "@/features/cost-estimator/components/EstimateReportModal";
import {
  formatBudgetMoney,
  formatEstimateDateTime,
  formatProjectTypeLabel,
} from "@/features/cost-estimator/utils/costEstimatorFormatters";
import EngineeringProgressWorksheet from "./EngineeringProgressWorksheet";
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
};

const TABS = ["overview", "estimates", "materials", "purchasing", "budget"] as const;

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
  canUpdateProgress,
  canCreateEstimate,
  canReviewEstimates,
  activities,
  estimates,
  estimateItems,
  budgetItems,
}: {
  project: ProjectRecord;
  canUpdateProgress: boolean;
  canCreateEstimate: boolean;
  canReviewEstimates: boolean;
  activities: Activity[];
  estimates: Estimate[];
  estimateItems: ProjectEstimateItemRow[];
  budgetItems: BudgetItem[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("tab");
  const tab = TABS.includes(selected as any) ? selected! : "overview";
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
      fallbackData: { activities, estimates, estimateItems, budgetItems },
      refreshInterval: 4000,
      revalidateOnFocus: true,
    },
  );
  const liveActivities = workspaceState.data?.activities ?? activities;
  const liveEstimates = workspaceState.data?.estimates ?? estimates;
  const liveEstimateItems = workspaceState.data?.estimateItems ?? estimateItems;
  const liveBudgetItems = workspaceState.data?.budgetItems ?? budgetItems;
  const estimated = liveBudgetItems.reduce((sum, item) => sum + Number(item.estimated_cost), 0);
  const spent = liveBudgetItems.reduce((sum, item) => sum + Number(item.actual_spent), 0);
  const activityRows = liveActivities.map((activity) => mapActivity(project.name, activity));
  const activeEstimate =
    liveEstimates.find((estimate) => estimate.id === activeEstimateId) ?? null;
  const activeEstimateItems = activeEstimate
    ? liveEstimateItems.filter((item) => item.estimate_id === activeEstimate.id)
    : [];
  const money = (value: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(value);

  useEffect(() => {
    if (tab === "estimates" && canCreateEstimate && !canReviewEstimates) {
      router.replace(`/cost-estimator?projectId=${project.id}`);
    }
  }, [canCreateEstimate, canReviewEstimates, project.id, router, tab]);

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
        const result = await approveProjectEstimateAction(estimateId);
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
    <div className="space-y-5 px-4 py-4 sm:px-6">
      <header >
        <Link href="/projects" className="inline-flex bg-white shadow-sm items-center gap-2 text-sm font-semibold rounded-lg px-3 py-2 hover:bg-slate-100 text-slate-700 border border-slate-200">
          <ArrowLeft size={15} />
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
         
            <h1 className="text-2xl font-bold text-slate-950">{project.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{project.location}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                Site engineer: {project.engineer}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                Estimate engineer: {project.estimateEngineer || project.engineer}
              </span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs uppercase text-slate-500">Budget ceiling</p>
            <p className="text-xl font-bold">{money(project.budget)}</p>
          </div>
        </div>
      </header>



      <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-3">
        {TABS.map((item) => {
          const href =
            item === "estimates" && canCreateEstimate && !canReviewEstimates
              ? `/cost-estimator?projectId=${project.id}`
              : `/projects/${project.id}?tab=${item}`;

          return (
            <Link
              key={item}
              href={href}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                tab === item
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item === "overview" ? "Progress" : item}
            </Link>
          );
        })}
      </nav>

      {tab === "overview" ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card label="Completion" value={`${project.progress}%`} />
            <Card label="Activities" value={String(liveActivities.length)} />
            <Card label="Remaining budget" value={money(project.budget - spent)} />
          </div>
          <EngineeringProgressWorksheet
            activities={activityRows}
            readOnly={!canUpdateProgress}
            isSubmitting={isSubmittingProgress}
            onSubmitProgress={submitProgress}
          />
        </div>
      ) : null}

      {tab === "estimates" && canReviewEstimates ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="divide-y divide-slate-100">
            {liveEstimates.map((item) => (
              <div key={item.id} className="grid gap-4 py-4 text-sm lg:grid-cols-[1.4fr_0.75fr_auto] lg:items-center">
                <div
                  className={
                    item.status === "draft"
                      ? "w-full rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center font-semibold text-slate-500"
                      : "space-y-2"
                  }
                >
                  <p className="font-semibold capitalize text-slate-950">
                    {item.status === "draft"
                      ? "Waiting for engineer submission"
                      : item.status === "submitted"
                        ? "Needs CEO approval"
                        : item.status}
                  </p>
                  {item.status !== "draft" ? (
                    <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2 xl:grid-cols-4">
                      <span>Project: {item.project_name}</span>
                      <span>Type: {formatProjectTypeLabel(item.project_type)}</span>
                      <span>
                        Submitted: {formatEstimateDateTime(item.submitted_at ?? item.created_at)}
                      </span>
                      <span>
                        Engineer:{" "}
                        {item.requester_profile?.full_name?.trim() ||
                          item.requester_profile?.username ||
                          "Unknown engineer"}
                      </span>
                    </div>
                  ) : null}
                </div>
                <span className={item.status === "draft" ? "hidden" : Number(item.estimate_total) > project.budget ? "font-bold text-rose-600" : "font-semibold text-emerald-700"}>
                  {formatBudgetMoney(item.estimate_total)}
                  {Number(item.estimate_total) > project.budget ? " · Over ceiling" : ""}
                </span>
                {item.status === "submitted" ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setActiveEstimateId(item.id)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Eye size={16} />
                      View details
                    </button>
                    <button
                      type="button"
                      onClick={() => setReturnEstimateId(item.id)}
                      disabled={pendingEstimateAction !== null}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pendingEstimateAction?.id === item.id &&
                      pendingEstimateAction.type === "return" ? (
                        <LoaderCircle size={15} className="animate-spin" />
                      ) : (
                        <XCircle size={16} />
                      )}
                      Return
                    </button>
                    <button
                      type="button"
                      onClick={() => approveEstimate(item.id)}
                      disabled={pendingEstimateAction !== null}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pendingEstimateAction?.id === item.id &&
                      pendingEstimateAction.type === "approve" ? (
                        <LoaderCircle size={15} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      Approve
                    </button>
                  </div>
                ) : item.status !== "draft" ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                    No action needed
                  </span>
                ) : null}
              </div>
            ))}
            {!liveEstimates.length ? <p className="py-4 text-sm text-slate-500">No estimates submitted for CEO approval yet.</p> : null}
          </div>
        </section>
      ) : null}

      {tab === "materials" ? (
        <>
          <PreviewNotice label="Material approvals are preview data in this phase." />
          <MaterialApprovalsPageClient projectName={project.name} />
        </>
      ) : null}
      {tab === "purchasing" ? (
        <>
          <PreviewNotice label="Purchasing approvals are preview data in this phase." />
          <PurchasingApprovalsPageClient projectName={project.name} />
        </>
      ) : null}
      {tab === "budget" ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card label="Budget ceiling" value={money(project.budget)} />
            <Card label="Estimated" value={money(estimated)} />
            <Card label="Actual spent" value={money(spent)} />
          </div>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Budget items</h2>
            {liveBudgetItems.map((item) => (
              <div key={item.id} className="mt-3 flex justify-between gap-3 border-t border-slate-100 pt-3 text-sm">
                <span>
                  {item.name} <small className="text-slate-500">({item.category})</small>
                </span>
                <span>{money(item.actual_spent)} / {money(item.estimated_cost)}</span>
              </div>
            ))}
            {!liveBudgetItems.length ? <p className="mt-4 text-sm text-slate-500">No budget items yet.</p> : null}
            <Link href="/projects?section=budget-tracker" className="mt-4 inline-flex text-sm font-semibold text-emerald-800">
              Open full Budget Tracker
            </Link>
          </section>
        </div>
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
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_rgba(15,23,42,0.24)]">
            <div className="border-b border-slate-100 bg-emerald-900 px-5 py-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                Return estimate
              </p>
              <h2 className="mt-1 text-lg font-bold">
                Send this estimate back to the engineer
              </h2>
            </div>
            <div className="space-y-4 p-5">
              <textarea
                value={returnReason}
                onChange={(event) => setReturnReason(event.target.value)}
                rows={5}
                placeholder="Add an optional return note for the engineer."
                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-emerald-700"
              />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setReturnEstimateId(null);
                    setReturnReason("");
                  }}
                  disabled={pendingEstimateAction !== null}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmReturnEstimate}
                  disabled={pendingEstimateAction !== null}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingEstimateAction?.type === "return" ? (
                    <LoaderCircle size={15} className="animate-spin" />
                  ) : null}
                  Confirm return
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}

function PreviewNotice({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
      {label} Changes here are not stored in Supabase yet.
    </div>
  );
}

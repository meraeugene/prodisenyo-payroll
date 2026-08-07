"use client";

import React, { useMemo, useState, useTransition } from "react";
import {
  Building,
  CheckCircle,
  ClipboardList,
  Package,
  Search,
  ThumbsDown,
  ThumbsUp,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { reviewMaterialRequestAction } from "@/actions/materialWorkflow";
import MaterialRequestReviewDialog from "@/features/material-approvals/components/MaterialRequestReviewDialog";
import type { ProjectMaterialRequest } from "@/features/material-approvals/types";
import type { PlannedMaterialRow } from "@/features/material-requests/utils/plannedMaterials";
import {
  getMaterialApprovalBucket,
  getMaterialWorkflowLabel,
  mapMaterialApprovalDialogRequest,
  type MaterialApprovalBucket,
} from "@/features/material-approvals/utils/materialApproval";
import { cn } from "@/lib/utils";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

function priorityClass(priority: ProjectMaterialRequest["priority"]) {
  if (priority === "urgent") return "border-rose-100 bg-rose-50 text-rose-700";
  if (priority === "high") return "border-amber-100 bg-amber-50 text-amber-700";
  if (priority === "medium") return "border-sky-100 bg-sky-50 text-sky-700";
  return "border-slate-100 bg-slate-50 text-slate-700";
}

function statusClass(status: ProjectMaterialRequest["status"]) {
  if (status === "rejected" || status === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === "submitted") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === "purchasing" || status === "ordered") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export default function MaterialApprovalsPageClient({
  projectName,
  requestedBy,
  requests = [],
  plannedMaterials = [],
  canManage = false,
  onReviewed,
}: {
  projectName: string;
  requestedBy: string;
  requests: ProjectMaterialRequest[];
  plannedMaterials?: PlannedMaterialRow[];
  canManage?: boolean;
  onReviewed?: () => Promise<unknown> | unknown;
}) {
  const [activeTab, setActiveTab] = useState<MaterialApprovalBucket | "all">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [reviewingRequest, setReviewingRequest] = useState<ProjectMaterialRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [commentText, setCommentText] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredRequests = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesTab =
        activeTab === "all" ||
        getMaterialApprovalBucket(request.status) === activeTab;
      const matchesSearch =
        !search ||
        request.material_name.toLowerCase().includes(search) ||
        request.unit.toLowerCase().includes(search) ||
        projectName.toLowerCase().includes(search);
      return matchesTab && matchesSearch;
    });
  }, [activeTab, projectName, requests, searchTerm]);

  const stats = useMemo(
    () => ({
      pending: requests.filter(
        (request) => getMaterialApprovalBucket(request.status) === "pending",
      ).length,
      approved: requests.filter(
        (request) => getMaterialApprovalBucket(request.status) === "approved",
      ).length,
      rejected: requests.filter(
        (request) => getMaterialApprovalBucket(request.status) === "rejected",
      ).length,
    }),
    [requests],
  );

  function beginReview(
    request: ProjectMaterialRequest,
    action: "approve" | "reject",
  ) {
    if (!canManage || request.status !== "submitted") return;
    setReviewingRequest(request);
    setActionType(action);
    setCommentText("");
  }

  function confirmReview() {
    if (!reviewingRequest || !canManage) return;
    startTransition(async () => {
      try {
        await reviewMaterialRequestAction({
          requestId: reviewingRequest.id,
          decision: actionType,
          notes: commentText,
        });
        await onReviewed?.();
        toast.success(
          actionType === "approve"
            ? "Material request approved and sent to purchasing."
            : "Material request rejected.",
        );
        setReviewingRequest(null);
        setCommentText("");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to review material request.",
        );
      }
    });
  }

  const tabs = [
    { id: "pending" as const, label: "Pending (" + stats.pending + ")" },
    { id: "approved" as const, label: "Approved (" + stats.approved + ")" },
    { id: "rejected" as const, label: "Rejected (" + stats.rejected + ")" },
    { id: "all" as const, label: "All Requests" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-3 sm:flex-row sm:items-center">
        <div className="flex gap-1.5 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-all",
                activeTab === tab.id
                  ? "border-emerald-800 bg-emerald-800 text-white"
                  : "border-apple-mist bg-white text-apple-smoke hover:bg-apple-mist/50",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <label className="relative w-full sm:w-64">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-silver" />
          <span className="sr-only">Search material requests</span>
          <input
            type="search"
            placeholder="Search material, project..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="h-9 w-full rounded-xl border border-apple-mist bg-white pl-9 pr-4 text-xs outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      </div>

      <div className="space-y-4">
        {filteredRequests.map((request) => (
          <article
            key={request.id}
            className="flex flex-col justify-between gap-6 rounded-2xl border border-apple-mist bg-white p-5 shadow-[0_4px_20px_rgba(24,83,43,.03)] md:flex-row md:items-center"
          >
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                <Package size={25} />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider", priorityClass(request.priority))}>
                    {request.priority} urgency
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <Building size={11} /> {projectName}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-apple-charcoal">{request.material_name}</h3>
                  <p className="mt-0.5 text-sm font-semibold text-emerald-700">
                    Quantity: {Number(request.quantity).toLocaleString("en-PH")} {request.unit}
                  </p>
                  <MaterialEstimateSource request={request} plannedMaterials={plannedMaterials} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-400">
                  <span className="flex items-center gap-1"><User size={12} /> Requested by {requestedBy}</span>
                  <span>Needed by: {formatDate(request.needed_by)}</span>
                  <span>Submitted: {formatDate(request.created_at)}</span>
                </div>
                {request.notes ? (
                  <p className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs italic text-slate-500">
                    &ldquo;{request.notes}&rdquo;
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center">
              {request.status === "submitted" && canManage ? (
                <>
                  <button
                    type="button"
                    onClick={() => beginReview(request, "reject")}
                    className="flex h-10 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/30 px-4 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    <ThumbsDown size={14} /> Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => beginReview(request, "approve")}
                    className="flex h-10 items-center gap-1.5 rounded-xl bg-emerald-800 px-4 text-xs font-semibold text-white hover:bg-emerald-900"
                  >
                    <ThumbsUp size={14} /> Approve
                  </button>
                </>
              ) : (
                <span className={cn("flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold", statusClass(request.status))}>
                  {getMaterialApprovalBucket(request.status) === "rejected" ? <XCircle size={13} /> : <CheckCircle size={13} />}
                  {getMaterialWorkflowLabel(request.status)}
                </span>
              )}
            </div>
          </article>
        ))}

        {!filteredRequests.length ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <ClipboardList size={36} className="mx-auto text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-600">No requests found</p>
            <p className="mt-1 text-xs text-slate-400">No persisted material request matches this filter.</p>
          </div>
        ) : null}
      </div>

      {reviewingRequest ? (
        <MaterialRequestReviewDialog
          request={mapMaterialApprovalDialogRequest({
            request: reviewingRequest,
            projectName,
            requestedBy,
          })}
          action={actionType}
          comment={commentText}
          isPending={isPending}
          onCommentChange={setCommentText}
          onClose={() => setReviewingRequest(null)}
          onConfirm={confirmReview}
        />
      ) : null}
    </div>
  );
}
function MaterialEstimateSource({
  request,
  plannedMaterials,
}: {
  request: ProjectMaterialRequest;
  plannedMaterials: PlannedMaterialRow[];
}) {
  const planned = plannedMaterials.find(
    (material) => material.estimateItemId === request.estimate_item_id,
  );
  if (!planned) {
    return (
      <span className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
        Unplanned request
      </span>
    );
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-bold uppercase tracking-wider text-emerald-700">
        Approved estimate
      </span>
      <span>Reference: {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(planned.unitCost)} / {planned.unit}</span>
      <span>{planned.remainingQuantity} {planned.unit} remaining after active requests</span>
    </div>
  );
}

"use client";

import React, { useState, useTransition, useEffect } from "react";
import DashboardPageHero from "@/components/DashboardPageHero";
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  MessageSquare,
  LoaderCircle,
  ThumbsUp,
  ThumbsDown,
  Building,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MaterialRequest {
  id: string;
  projectName: string;
  materialName: string;
  quantity: number;
  unit: string;
  neededBy: string;
  priority: "low" | "medium" | "high" | "urgent";
  requestedBy: string;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  approvalNotes?: string;
}

const INITIAL_REQUESTS: MaterialRequest[] = [
  {
    id: "mat-1",
    projectName: "Grand Horizon Towers",
    materialName: "Portland Cement (Type 1)",
    quantity: 350,
    unit: "bags",
    neededBy: "2026-07-25",
    priority: "high",
    requestedBy: "Engineer User",
    status: "pending",
    notes: "Crucial for structural columns concrete pouring on July 26.",
  },
  {
    id: "mat-2",
    projectName: "Vista Verde Residences",
    materialName: "Deformed Steel Bar Grade 40 (16mm x 6m)",
    quantity: 120,
    unit: "pcs",
    neededBy: "2026-07-28",
    priority: "urgent",
    requestedBy: "Engineer User",
    status: "pending",
    notes: "Required for floor slab frame reinforcment.",
  },
  {
    id: "mat-3",
    projectName: "Skyline Business Park",
    materialName: "Double-Glazed Facade Glass Panels",
    quantity: 45,
    unit: "sheets",
    neededBy: "2026-08-10",
    priority: "medium",
    requestedBy: "Engineer User",
    status: "pending",
    notes: "Order needed early as lead time is 2 weeks.",
  },
  {
    id: "mat-4",
    projectName: "Grand Horizon Towers",
    materialName: 'Electrical PVC Conduit Pipe 3/4"',
    quantity: 500,
    unit: "pcs",
    neededBy: "2026-07-15",
    priority: "low",
    requestedBy: "Engineer User",
    status: "approved",
    notes: "Needed for grid conduit rough-ins.",
    approvalNotes: "Approved for procurement. Proceed with local vendor.",
  },
  {
    id: "mat-5",
    projectName: "Novaliches Warehouse Complex",
    materialName: "Ready-Mix Concrete (3000 PSI)",
    quantity: 12,
    unit: "cu.m",
    neededBy: "2026-07-12",
    priority: "high",
    requestedBy: "Engineer User",
    status: "rejected",
    notes: "Slab pouring preparation.",
    approvalNotes:
      "Rejected. Project currently on hold by client decision. Wait for reactivation.",
  },
];

export default function MaterialApprovalsPageClient() {
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [activeTab, setActiveTab] = useState<
    "pending" | "approved" | "rejected" | "all"
  >("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPendingTransition, startTransition] = useTransition();

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem("prodisenyo-material-requests-v2");
    if (saved) {
      try {
        setRequests(JSON.parse(saved));
      } catch (e) {
        setRequests(INITIAL_REQUESTS);
      }
    } else {
      setRequests(INITIAL_REQUESTS);
      localStorage.setItem(
        "prodisenyo-material-requests-v2",
        JSON.stringify(INITIAL_REQUESTS),
      );
    }
  }, []);

  // Action states for comments popup
  const [reviewingRequest, setReviewingRequest] =
    useState<MaterialRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [commentText, setCommentText] = useState("");

  const filteredRequests = React.useMemo(() => {
    return requests.filter((r) => {
      const matchesTab = activeTab === "all" ? true : r.status === activeTab;
      const matchesSearch =
        r.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.requestedBy.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [requests, activeTab, searchTerm]);

  const stats = React.useMemo(() => {
    const pending = requests.filter((r) => r.status === "pending").length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;
    return { pending, approved, rejected };
  }, [requests]);

  const handleActionClick = (
    request: MaterialRequest,
    action: "approve" | "reject",
  ) => {
    setReviewingRequest(request);
    setActionType(action);
    setCommentText("");
  };

  const handleConfirmAction = () => {
    if (!reviewingRequest) return;

    const targetStatus = (
      actionType === "approve" ? "approved" : "rejected"
    ) as MaterialRequest["status"];
    const statusWord = actionType === "approve" ? "Approved" : "Rejected";

    startTransition(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const updated = requests.map((r) =>
        r.id === reviewingRequest.id
          ? {
              ...r,
              status: targetStatus,
              approvalNotes: commentText.trim() || undefined,
            }
          : r,
      );

      setRequests(updated);
      localStorage.setItem(
        "prodisenyo-material-requests-v2",
        JSON.stringify(updated),
      );

      toast.success(
        `Request for ${reviewingRequest.materialName} successfully ${statusWord}!`,
      );
      setReviewingRequest(null);
    });
  };

  const getPriorityBadgeClass = (priority: MaterialRequest["priority"]) => {
    if (priority === "urgent")
      return "bg-rose-50 text-rose-700 border-rose-100";
    if (priority === "high")
      return "bg-amber-50 text-amber-700 border-amber-100";
    if (priority === "medium") return "bg-sky-50 text-sky-700 border-sky-100";
    return "bg-slate-50 text-slate-700 border-slate-100";
  };

  return (
    <div className="space-y-4 ">
      {/* Tabs list */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
        <div className="flex gap-1.5 overflow-x-auto">
          {(
            [
              { id: "pending", label: `Pending (${stats.pending})` },
              { id: "approved", label: `Approved (${stats.approved})` },
              { id: "rejected", label: `Rejected (${stats.rejected})` },
              { id: "all", label: "All Requests" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all",
                activeTab === tab.id
                  ? "bg-[#1f6a37] text-white shadow-xs"
                  : "text-apple-smoke hover:bg-apple-mist/50 hover:text-apple-charcoal border border-apple-mist bg-white",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-silver"
          />
          <input
            type="text"
            placeholder="Search material, project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-apple-mist bg-apple-mist/20 text-xs text-apple-charcoal outline-none placeholder:text-apple-silver focus:border-[#1f6a37] focus:bg-white transition"
          />
        </div>
      </div>

      {/* Request Grid */}
      <div className="space-y-4">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white border border-apple-mist rounded-2xl p-5 shadow-[0_4px_20px_rgba(24,83,43,0.03)] hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex flex-col sm:flex-row gap-4 items-start flex-1">
                {/* Material Thumbnail Image */}
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      req.materialName.toLowerCase().includes("cement")
                        ? "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=150&q=80"
                        : req.materialName.toLowerCase().includes("bar") ||
                            req.materialName.toLowerCase().includes("steel")
                          ? "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=150&q=80"
                          : req.materialName.toLowerCase().includes("glass") ||
                              req.materialName.toLowerCase().includes("facade")
                            ? "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=150&q=80"
                            : req.materialName.toLowerCase().includes("pipe") ||
                                req.materialName.toLowerCase().includes("pvc")
                              ? "https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&w=150&q=80"
                              : "https://images.unsplash.com/photo-1535732759880-bbd5c7265e3f?auto=format&fit=crop&w=150&q=80"
                    }
                    alt={req.materialName}
                    className="object-cover w-full h-full"
                  />
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "border px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                        getPriorityBadgeClass(req.priority),
                      )}
                    >
                      {req.priority} urgency
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                      <Building size={11} /> {req.projectName}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-apple-charcoal">
                      {req.materialName}
                    </h4>
                    <p className="text-sm font-semibold text-[#1f6a37] mt-0.5">
                      Quantity: {req.quantity} {req.unit}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-medium">
                    <div className="flex items-center gap-1">
                      <User size={12} />
                      <span>Requested by {req.requestedBy}</span>
                    </div>
                    <span>•</span>
                    <span>Needed by: {req.neededBy}</span>
                  </div>

                  {req.notes && (
                    <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl italic border border-slate-100">
                      &ldquo;{req.notes}&rdquo;
                    </p>
                  )}

                  {req.approvalNotes && (
                    <div className="bg-emerald-50/20 border border-emerald-100 text-emerald-800 rounded-xl p-2.5 flex gap-2">
                      <MessageSquare
                        size={14}
                        className="text-emerald-600 mt-0.5 shrink-0"
                      />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/80">
                          CEO Review Notes
                        </p>
                        <p className="text-xs italic mt-0.5">
                          {req.approvalNotes}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status details & actions */}
              <div className="flex items-center gap-2 self-end md:self-center">
                {req.status === "pending" ? (
                  <>
                    <button
                      onClick={() => handleActionClick(req, "reject")}
                      className="h-10 px-4 rounded-xl border border-rose-200 text-xs font-semibold text-rose-700 bg-rose-50/30 hover:bg-rose-50 hover:border-rose-300 transition flex items-center gap-1.5"
                    >
                      <ThumbsDown size={14} /> Reject
                    </button>
                    <button
                      onClick={() => handleActionClick(req, "approve")}
                      className="h-10 px-4 rounded-xl bg-[#1f6a37] text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-sm flex items-center gap-1.5"
                    >
                      <ThumbsUp size={14} /> Approve
                    </button>
                  </>
                ) : (
                  <span
                    className={cn(
                      "border px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wider",
                      req.status === "approved"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-700",
                    )}
                  >
                    {req.status === "approved" ? (
                      <CheckCircle size={13} />
                    ) : (
                      <XCircle size={13} />
                    )}
                    {req.status}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
            <ClipboardList size={36} className="mx-auto text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-500">
              No requests found
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Excellent! All items in this category are completed.
            </p>
          </div>
        )}
      </div>

      {/* Review Dialog / Modal */}
      {reviewingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-apple-mist rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-apple-charcoal">
              {actionType === "approve" ? "Approve" : "Reject"} Material Request
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {reviewingRequest.materialName} ({reviewingRequest.quantity}{" "}
              {reviewingRequest.unit}) for {reviewingRequest.projectName}
            </p>

            <div className="mt-4 space-y-3">
              <label className="text-xs font-semibold text-slate-700">
                Review Comments / Notes
              </label>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={
                  actionType === "approve"
                    ? "Provide approval notes, specifications, or vendor hints..."
                    : "Explain reason for rejecting the request..."
                }
                rows={3}
                className="w-full rounded-xl border border-apple-mist p-3 text-xs text-apple-charcoal outline-none placeholder:text-apple-silver transition focus:border-[#1f6a37]"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewingRequest(null)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isPendingTransition}
                className={cn(
                  "h-10 px-5 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center gap-1.5",
                  actionType === "approve"
                    ? "bg-[#1f6a37] hover:bg-emerald-800"
                    : "bg-rose-600 hover:bg-rose-700",
                )}
              >
                {isPendingTransition && (
                  <LoaderCircle size={14} className="animate-spin" />
                )}
                Confirm {actionType === "approve" ? "Approval" : "Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

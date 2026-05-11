"use client";

import {
  CheckCircle2,
  Clock3,
  Loader2,
  LoaderCircle,
  MapPin,
  XCircle,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import {
  approveOvertimeRequestFormAction,
  rejectOvertimeRequestFormAction,
} from "@/actions/payroll";
import {
  formatOvertimeRequesterRole,
  type OvertimeRequestRecord,
} from "@/features/overtime-requests/types";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusClasses(status: OvertimeRequestRecord["status"]) {
  if (status === "approved")
    return "bg-emerald-50 text-emerald-700 ring-emerald-200/40";
  if (status === "rejected")
    return "bg-[#eef7f0] text-[#2d6a4f] ring-[#cfe3d3]";
  return "bg-amber-50 text-amber-700 ring-amber-200/40";
}

function shouldShowOvertimePay(role: OvertimeRequestRecord["requester_role"]) {
  return !["payroll_manager", "engineer", "employee"].includes(role);
}

export default function OvertimeRequestApprovalQueue({
  initialRequests,
}: {
  initialRequests: OvertimeRequestRecord[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [pendingActionType, setPendingActionType] = useState<
    "approve" | "reject" | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const sortedRequests = useMemo(
    () =>
      [...requests].sort((a, b) => {
        if (a.status !== b.status) {
          if (a.status === "pending") return -1;
          if (b.status === "pending") return 1;
        }
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }),
    [requests],
  );

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === "pending").length,
    [requests],
  );

  function applyRequestPatch(
    requestId: string,
    patch: Partial<OvertimeRequestRecord>,
  ) {
    setRequests((current) =>
      current.map((request) =>
        request.id === requestId ? { ...request, ...patch } : request,
      ),
    );
  }

  function handleApprove(requestId: string) {
    setPendingActionId(requestId);
    setPendingActionType("approve");
    startTransition(async () => {
      try {
        const result = await approveOvertimeRequestFormAction(requestId);
        applyRequestPatch(requestId, {
          status: "approved",
          approved_at: result.approvedAt,
          rejected_at: null,
          rejection_reason: null,
        });
        window.dispatchEvent(new Event("payroll:pending-count-changed"));
      } finally {
        setPendingActionId(null);
        setPendingActionType(null);
      }
    });
  }

  function handleConfirmReject() {
    if (!rejectRequestId) return;

    setPendingActionId(rejectRequestId);
    setPendingActionType("reject");
    startTransition(async () => {
      try {
        const result = await rejectOvertimeRequestFormAction({
          requestId: rejectRequestId,
          rejectionReason,
        });
        applyRequestPatch(rejectRequestId, {
          status: "rejected",
          rejected_at: result.rejectedAt,
          rejection_reason: result.rejectionReason,
        });
        setRejectRequestId(null);
        setRejectionReason("");
        window.dispatchEvent(new Event("payroll:pending-count-changed"));
      } finally {
        setPendingActionId(null);
        setPendingActionType(null);
      }
    });
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div
        className="rounded-none p-5 text-[#1f4f2c] sm:rounded-[14px] sm:p-6"
        style={{ backgroundColor: "#e6faec" }}
      >
        <div className="flex items-center justify-between gap-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#2d6a4f]">
            CEO Approval Queue
          </p>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <Clock3 size={14} />
            {pendingCount} pending
          </span>
        </div>
        <h2 className="mt-1 text-xl font-bold text-[#1f4f2c]">
          Overtime Request Forms
        </h2>
        <p className="mt-2 text-sm text-[#2d6a4f] sm:text-[15px]">
          Review overtime requests submitted by payroll staff, engineers, and
          employees.
        </p>
      </div>

      <div className="mt-4 min-h-0 flex-1  ">
        <div className="min-h-0 h-full space-y-3 overflow-y-auto sm:pr-2">
          {sortedRequests.length === 0 ? (
            <p className="text-sm text-apple-steel">
              No overtime request forms are waiting for approval.
            </p>
          ) : (
            sortedRequests.map((request) => (
              <article
                key={request.id}
                className="group flex h-fit w-full max-w-full flex-col sm:rounded-2xl border border-apple-mist bg-[rgb(var(--apple-snow))] p-5 shadow-[0_8px_20px_rgba(24,83,43,0.04)] transition-all"
              >
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
                      {formatOvertimeRequesterRole(request.requester_role)}
                    </p>
                    <h3 className="text-[15px] font-bold tracking-tight text-apple-charcoal">
                      {request.employee_name} • {request.site_name}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${getStatusClasses(
                        request.status,
                      )}`}
                    >
                      {request.status === "approved" ? (
                        <>
                          <CheckCircle2 size={12} strokeWidth={2.5} />
                          Approved
                        </>
                      ) : request.status === "rejected" ? (
                        <>
                          <XCircle size={12} strokeWidth={2.5} />
                          Returned
                        </>
                      ) : (
                        <>
                          <Clock3 size={12} strokeWidth={2.5} />
                          Pending Approval
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-apple-steel">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-apple-smoke" />
                      {request.site_name}
                    </div>
                    <div className="hidden h-3 w-px bg-apple-mist lg:block" />
                    <div className="font-medium">{request.request_date}</div>
                  </div>

                  {request.period_label ? (
                    <p className="text-[13px] text-apple-steel">
                      <span className="font-medium">Period:</span>{" "}
                      {request.period_label}
                    </p>
                  ) : null}

                  {request.reason ? (
                    <div className="relative rounded-xl border border-apple-mist/50 bg-blue-50 px-3.5 py-2.5 text-xs italic text-apple-smoke shadow-sm">
                      &quot;{request.reason}&quot;
                    </div>
                  ) : null}

                  <p className="text-[11px] font-medium text-apple-smoke/80">
                    Submitted {formatDateTime(request.created_at)}
                  </p>

                  {request.rejection_reason ? (
                    <p className="rounded-xl border border-[#cfe3d3] bg-[#eef7f0] px-3 py-2 text-xs text-[#2d6a4f]">
                      Return reason:{" "}
                      <span className="font-semibold">
                        {request.rejection_reason}
                      </span>
                    </p>
                  ) : null}
                </div>

                {shouldShowOvertimePay(request.requester_role) ? (
                  <div className="mt-5 rounded-2xl border border-apple-mist bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-apple-steel/80">
                      Overtime Pay
                    </p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-black tracking-tight text-apple-charcoal">
                        ₱
                        {request.amount.toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-apple-smoke">
                      <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {request.overtime_hours.toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      total hrs
                    </div>
                  </div>
                ) : null}

                {request.status === "pending" ? (
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-6">
                    <div className="text-[11px] italic text-apple-steel">
                      Review required before payroll cutoff
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectRequestId(request.id);
                          setRejectionReason("");
                        }}
                        disabled={isPending}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#eef7f0] px-4 text-xs font-bold text-[#2d6a4f] transition-colors hover:bg-[#e2efe5] focus:outline-none focus:ring-2 focus:ring-[#cfe3d3] disabled:opacity-50"
                      >
                        <XCircle size={16} />
                        Return
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(request.id)}
                        disabled={isPending}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1f6a37] px-5 text-xs font-bold text-white shadow-md shadow-emerald-900/10 transition-all hover:bg-[#18552d] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
                      >
                        {pendingActionId === request.id &&
                        pendingActionType === "approve" ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Approving...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={16} />
                            Approve Request
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </div>

      {rejectRequestId ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.24)]">
            <div className="border-b border-apple-mist bg-[linear-gradient(135deg,#112e1a,#1f4f2c,#245f34)] px-5 py-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                Return Overtime Request
              </p>
              <h2 className="mt-2 text-lg font-semibold">
                Send this request back with a reason
              </h2>
            </div>

            <div className="space-y-4 px-5 py-5">
              <textarea
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                rows={5}
                placeholder="Add an optional return note."
                className="w-full rounded-2xl border border-apple-mist px-3 py-3 text-sm text-apple-charcoal outline-none transition focus:border-[#1f6a37]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectRequestId(null);
                    setRejectionReason("");
                  }}
                  disabled={isPending}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-apple-mist px-4 text-sm font-semibold text-apple-charcoal transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={isPending}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-[#5b7d63] px-4 text-sm font-semibold text-white transition hover:bg-[#4d6b54] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingActionId === rejectRequestId &&
                  pendingActionType === "reject" ? (
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
    </section>
  );
}

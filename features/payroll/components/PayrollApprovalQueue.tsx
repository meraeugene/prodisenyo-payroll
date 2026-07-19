"use client";

import { Clock3, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import PayrollApprovalEmployeeLogsModal from "@/features/payroll/components/PayrollApprovalEmployeeLogsModal";
import PayrollApprovalQueueCard from "@/features/payroll/components/PayrollApprovalQueueCard";
import { usePayrollApprovalQueue } from "@/features/payroll/hooks/usePayrollApprovalQueue";
import type { PendingOvertimeRequest } from "@/features/payroll/utils/payrollApprovalQueueHelpers";
import type { AppRole } from "@/types/database";

interface PayrollApprovalQueueProps {
  role: AppRole | null;
  roleLoading?: boolean;
  initialRequests?: PendingOvertimeRequest[];
  onRequestResolved?: (runId: string | null) => void;
}

export default function PayrollApprovalQueue({
  role,
  roleLoading = false,
  initialRequests = [],
  onRequestResolved,
}: PayrollApprovalQueueProps) {
  const [rejectConfirmRequest, setRejectConfirmRequest] =
    useState<PendingOvertimeRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submittingRejectRequestId, setSubmittingRejectRequestId] = useState<
    string | null
  >(null);
  const state = usePayrollApprovalQueue({
    role,
    roleLoading,
    initialRequests,
    onRequestResolved,
  });

  useEffect(() => {
    if (
      submittingRejectRequestId &&
      rejectConfirmRequest &&
      state.pendingActionId !== rejectConfirmRequest.id &&
      state.pendingActionType !== "reject"
    ) {
      setRejectConfirmRequest(null);
      setRejectionReason("");
      setSubmittingRejectRequestId(null);
    }
  }, [
    submittingRejectRequestId,
    rejectConfirmRequest,
    state.pendingActionId,
    state.pendingActionType,
  ]);

  if (!roleLoading && role !== "ceo") return null;

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="rounded-none border border-apple-mist bg-white p-5 text-[#1f4f2c] shadow-[0_8px_20px_rgba(24,83,43,0.04)] sm:rounded-[14px] sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="mt-1 text-xl font-bold text-[#1f4f2c]">
            Pending Overtime Requests
          </h2>
          <span className="inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <Clock3 size={14} />
            {state.pendingCount} pending
          </span>
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1  ">
        <div className="min-h-0 h-full overflow-hidden">
          {!state.hasRequests ? (
            <p className="text-sm text-apple-steel">
              No overtime requests are waiting for approval.
            </p>
          ) : (
            <div className="grid h-full min-h-0 grid-cols-1 gap-3 overflow-y-auto sm:pr-2">
              {state.pendingRequests.map((request) => (
                <PayrollApprovalQueueCard
                  key={request.id}
                  request={request}
                  isPending={state.isPending}
                  pendingActionId={state.pendingActionId}
                  pendingActionType={state.pendingActionType}
                  logsLoading={Boolean(
                    state.employeeLogsLoadingByRequestId[request.id],
                  )}
                  onOpenLogs={state.openRequestLogs}
                  onApprove={(adjustmentId) =>
                    state.handleAction(adjustmentId, "approve")
                  }
                  onReject={(requestToReject) => {
                    setRejectConfirmRequest(requestToReject);
                    setRejectionReason("");
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {state.activeLogsModalState ? (
        <PayrollApprovalEmployeeLogsModal
          modalState={state.activeLogsModalState}
          onClose={state.closeLogsModal}
        />
      ) : null}

      {rejectConfirmRequest ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.24)]">
            <div className="border-b border-apple-mist bg-[linear-gradient(135deg,#112e1a,#1f4f2c,#245f34)] px-5 py-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                Return Overtime
              </p>
              <h2 className="mt-2 text-lg font-semibold">
                Send this overtime request back to HR
              </h2>
            </div>

            <div className="space-y-4 px-5 py-5">
              <textarea
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                rows={5}
                placeholder="Add an optional return note for HR."
                className="w-full rounded-2xl border border-apple-mist px-3 py-3 text-sm text-apple-charcoal outline-none transition focus:border-[#1f6a37]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectConfirmRequest(null);
                    setRejectionReason("");
                  }}
                  disabled={
                    state.pendingActionId === rejectConfirmRequest.id &&
                    state.pendingActionType === "reject"
                  }
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-apple-mist px-4 text-sm font-semibold text-apple-charcoal transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    state.handleAction(
                      rejectConfirmRequest.id,
                      "reject",
                      rejectionReason,
                    );
                    setSubmittingRejectRequestId(rejectConfirmRequest.id);
                  }}
                  disabled={
                    state.pendingActionId === rejectConfirmRequest.id &&
                    state.pendingActionType === "reject"
                  }
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-[#5b7d63] px-4 text-sm font-semibold text-white transition hover:bg-[#4d6b54] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {state.pendingActionId === rejectConfirmRequest.id &&
                  state.pendingActionType === "reject" ? (
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

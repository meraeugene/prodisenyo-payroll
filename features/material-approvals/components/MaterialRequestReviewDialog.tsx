"use client";

import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MaterialRequest } from "@/features/material-approvals/types";

export default function MaterialRequestReviewDialog({
  request,
  action,
  comment,
  isPending,
  onCommentChange,
  onClose,
  onConfirm,
}: {
  request: MaterialRequest;
  action: "approve" | "reject";
  comment: string;
  isPending: boolean;
  onCommentChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="material-review-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-apple-mist bg-white p-6 shadow-2xl">
        <h3 id="material-review-title" className="text-lg font-bold text-apple-charcoal">
          {action === "approve" ? "Approve" : "Reject"} Material Request
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          {request.materialName} ({request.quantity} {request.unit}) for {request.projectName}
        </p>

        <label className="mt-4 grid gap-3 text-xs font-semibold text-slate-700">
          Review Comments / Notes
          <textarea
            value={comment}
            onChange={(event) => onCommentChange(event.target.value)}
            placeholder={
              action === "approve"
                ? "Provide approval notes, specifications, or vendor hints..."
                : "Explain reason for rejecting the request..."
            }
            rows={3}
            className="w-full rounded-xl border border-apple-mist p-3 text-xs text-apple-charcoal outline-none placeholder:text-apple-silver focus:border-[#1f6a37]"
          />
        </label>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              "flex h-10 items-center gap-1.5 rounded-xl px-5 text-xs font-semibold text-white shadow-sm disabled:opacity-60",
              action === "approve"
                ? "bg-[#1f6a37] hover:bg-emerald-800"
                : "bg-rose-600 hover:bg-rose-700",
            )}
          >
            {isPending ? <LoaderCircle size={14} className="animate-spin" /> : null}
            Confirm {action === "approve" ? "Approval" : "Rejection"}
          </button>
        </div>
      </div>
    </div>
  );
}

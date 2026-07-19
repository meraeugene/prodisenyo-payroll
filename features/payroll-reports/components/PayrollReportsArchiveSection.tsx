"use client";

import {
  CheckCircle2,
  Clock3,
  Eye,
  LoaderCircle,
  MoreHorizontal,
  Trash2,
  XCircle,
} from "lucide-react";
import { createPortal } from "react-dom";
import {
  formatPayrollReportDateTime,
  formatPayrollReportPeriodLabel,
  formatPayrollReportPeso,
  getPayrollReportStatusBadgeClass,
  getPayrollReportStatusLabel,
} from "@/features/payroll-reports/utils/payrollReportHelpers";
import type {
  PayrollRunRow,
  ReportActionsMenuState,
} from "@/features/payroll-reports/types";
import { cn } from "@/lib/utils";

export default function PayrollReportsArchiveSection({
  reports,
  refreshing,
  pendingReportsCount,
  deletingRunId,
  pendingDecisionRunId,
  pendingDecisionAction,
  openMenu,
  openMenuReport,
  deleteConfirmReport,
  rejectConfirmReport,
  rejectionReason,
  onToggleMenu,
  onViewReport,
  onApproveReport,
  onRejectReport,
  onAskDelete,
  onCloseRejectConfirm,
  onRejectionReasonChange,
  onConfirmReject,
  onCloseDeleteConfirm,
  onDeleteReport,
}: {
  reports: PayrollRunRow[];
  refreshing: boolean;
  pendingReportsCount: number;
  deletingRunId: string | null;
  pendingDecisionRunId: string | null;
  pendingDecisionAction: "approve" | "reject" | null;
  openMenu: ReportActionsMenuState | null;
  openMenuReport: PayrollRunRow | null;
  deleteConfirmReport: PayrollRunRow | null;
  rejectConfirmReport: PayrollRunRow | null;
  rejectionReason: string;
  onToggleMenu: (report: PayrollRunRow, rect: DOMRect) => void;
  onViewReport: (report: PayrollRunRow) => void;
  onApproveReport: (report: PayrollRunRow) => void;
  onRejectReport: (report: PayrollRunRow) => void;
  onAskDelete: (report: PayrollRunRow) => void;
  onCloseRejectConfirm: () => void;
  onRejectionReasonChange: (value: string) => void;
  onConfirmReject: () => void;
  onCloseDeleteConfirm: () => void;
  onDeleteReport: (report: PayrollRunRow) => void;
}) {
  return (
    <>
      <section className="mt-4 rounded-none border border-apple-mist bg-white p-5 shadow-[0_10px_30px_rgba(24,83,43,0.07)] sm:rounded-[16px]">
        <div className="mb-4">
          <span className="inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <Clock3 size={12} />
            {pendingReportsCount.toLocaleString("en-PH")} pending
          </span>
        </div>

        {reports.length === 0 ? (
          <p className="text-sm text-apple-steel">
            No payroll reports are waiting for review.
          </p>
        ) : (
          <div className="overflow-x-auto overflow-y-visible rounded-xl border border-apple-mist">
            <table className="min-w-[980px] w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[19%]" />
                <col className="w-[26%]" />
                <col className="w-[18%]" />
                <col className="w-[16%]" />
                <col className="w-[11%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead>
                <tr className="bg-[rgb(var(--apple-snow))] text-left">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-apple-steel">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-apple-steel">
                    Period
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-apple-steel">
                    Site
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.15em] text-apple-steel">
                    Total Payroll
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-apple-steel">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-apple-steel">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-mist">
                {reports.map((report) => (
                  <tr key={report.id} className="bg-white">
                    <td className="px-4 py-4 text-apple-smoke">
                      {formatPayrollReportDateTime(
                        report.submitted_at ?? report.created_at,
                      )}
                    </td>
                    <td className="px-4 py-4 font-medium text-apple-charcoal">
                      {formatPayrollReportPeriodLabel(report)}
                    </td>
                    <td className="px-4 py-4 text-apple-smoke">
                      {report.site_name}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-apple-charcoal">
                      {formatPayrollReportPeso(report.net_total ?? 0)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
                          getPayrollReportStatusBadgeClass(report.status),
                        )}
                      >
                        {getPayrollReportStatusLabel(report.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        type="button"
                        onClick={(event) =>
                          onToggleMenu(
                            report,
                            event.currentTarget.getBoundingClientRect(),
                          )
                        }
                        data-report-actions-root
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-apple-mist bg-white text-apple-charcoal transition hover:border-apple-steel disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Open report actions"
                        disabled={
                          deletingRunId === report.id ||
                          pendingDecisionRunId === report.id
                        }
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {openMenu && openMenuReport
        ? createPortal(
            <div
              data-report-actions-root
              className="fixed z-[140] min-w-[170px] -translate-x-full overflow-hidden rounded-lg border border-apple-mist bg-white text-left shadow-[0_14px_36px_rgba(16,24,40,0.18)]"
              style={{ top: openMenu.top, left: openMenu.left }}
            >
              <button
                type="button"
                onClick={() => onViewReport(openMenuReport)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-apple-charcoal transition hover:bg-emerald-50 hover:text-emerald-800"
              >
                <Eye size={14} />
                View Reports
              </button>
              {openMenuReport.status === "submitted" ? (
                <>
                  <button
                    type="button"
                    onClick={() => onApproveReport(openMenuReport)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={pendingDecisionRunId === openMenuReport.id}
                  >
                    <CheckCircle2 size={14} />
                    {pendingDecisionRunId === openMenuReport.id &&
                    pendingDecisionAction === "approve"
                      ? "Updating..."
                      : "Approve Payroll"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRejectReport(openMenuReport)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={pendingDecisionRunId === openMenuReport.id}
                  >
                    <XCircle size={14} />
                    {pendingDecisionRunId === openMenuReport.id &&
                    pendingDecisionAction === "reject"
                      ? "Updating..."
                      : "Return Payroll"}
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => onAskDelete(openMenuReport)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={
                  deletingRunId === openMenuReport.id ||
                  pendingDecisionRunId === openMenuReport.id
                }
              >
                <Trash2 size={14} />
                {deletingRunId === openMenuReport.id
                  ? "Deleting..."
                  : "Delete Payroll"}
              </button>
            </div>,
            document.body,
          )
        : null}

      {deleteConfirmReport
        ? createPortal(
            <div
              className="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
              onMouseDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  deletingRunId !== deleteConfirmReport.id
                ) {
                  onCloseDeleteConfirm();
                }
              }}
            >
              <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_rgba(15,23,42,0.26)]">
                <div className="border-b border-apple-mist bg-[linear-gradient(135deg,#112e1a,#1f4f2c,#245f34)] px-5 py-4 text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                    Confirm Delete
                  </p>
                  <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em]">
                    Delete Payroll Report?
                  </h3>
                </div>
                <div className="space-y-4 px-5 py-4">
                  <p className="text-sm text-apple-charcoal">
                    Delete payroll report for{" "}
                    <span className="font-semibold">
                      {formatPayrollReportPeriodLabel(deleteConfirmReport)}
                    </span>
                    ? This cannot be undone.
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={onCloseDeleteConfirm}
                      disabled={deletingRunId === deleteConfirmReport.id}
                      className="inline-flex h-9 items-center rounded-lg border border-apple-mist bg-white px-3 text-sm font-semibold text-apple-charcoal transition hover:border-apple-steel disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteReport(deleteConfirmReport)}
                      disabled={deletingRunId === deleteConfirmReport.id}
                      className="inline-flex h-9 items-center rounded-lg bg-rose-600 px-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingRunId === deleteConfirmReport.id ? (
                        <>
                          <LoaderCircle
                            size={15}
                            className="mr-2 animate-spin"
                          />
                          Deleting...
                        </>
                      ) : (
                        "Delete Payroll"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {rejectConfirmReport
        ? createPortal(
            <div
              className="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
              onMouseDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  pendingDecisionRunId !== rejectConfirmReport.id
                ) {
                  onCloseRejectConfirm();
                }
              }}
            >
              <div className="w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.24)]">
                <div className="border-b border-apple-mist bg-[linear-gradient(135deg,#112e1a,#1f4f2c,#245f34)] px-5 py-4 text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                    Return Payroll
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">
                    Send this payroll report back to HR
                  </h2>
                </div>

                <div className="space-y-4 px-5 py-5">
                  <p className="text-sm text-apple-steel">
                    Add an optional return note for{" "}
                    <span className="font-semibold text-apple-charcoal">
                      {formatPayrollReportPeriodLabel(rejectConfirmReport)}
                    </span>
                    .
                  </p>
                  <textarea
                    value={rejectionReason}
                    onChange={(event) =>
                      onRejectionReasonChange(event.target.value)
                    }
                    rows={5}
                    placeholder="Add an optional return note for HR."
                    className="w-full rounded-2xl border border-apple-mist px-3 py-3 text-sm text-apple-charcoal outline-none transition focus:border-[#1f6a37]"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={onCloseRejectConfirm}
                      disabled={pendingDecisionRunId === rejectConfirmReport.id}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-apple-mist px-4 text-sm font-semibold text-apple-charcoal transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={onConfirmReject}
                      disabled={pendingDecisionRunId === rejectConfirmReport.id}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-[#5b7d63] px-4 text-sm font-semibold text-white transition hover:bg-[#4d6b54] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pendingDecisionRunId === rejectConfirmReport.id &&
                      pendingDecisionAction === "reject" ? (
                        <>
                          <LoaderCircle
                            size={15}
                            className="mr-2 animate-spin"
                          />
                          Returning...
                        </>
                      ) : (
                        "Confirm Return"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

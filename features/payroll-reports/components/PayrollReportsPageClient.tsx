"use client";

import DashboardPageHero from "@/components/DashboardPageHero";
import PayrollReportModal from "@/features/payroll-reports/components/PayrollReportModal";
import PayrollReportsArchiveSection from "@/features/payroll-reports/components/PayrollReportsArchiveSection";
import { usePayrollReportsPage } from "@/features/payroll-reports/hooks/usePayrollReportsPage";
import type { PayrollRunRow } from "@/features/payroll-reports/types";

export default function PayrollReportsPageClient({
  initialData,
}: {
  initialData: { reports: PayrollRunRow[] };
}) {
  const state = usePayrollReportsPage({ initialReports: initialData.reports });

  return (
    <div className="p-0 sm:p-6">
      <DashboardPageHero eyebrow="CEO Review" title="Payroll Approvals" />

      <PayrollReportsArchiveSection
        reports={state.sortedReports}
        refreshing={state.refreshing}
        pendingReportsCount={state.pendingReportsCount}
        deletingRunId={state.deletingRunId}
        pendingDecisionRunId={state.pendingDecisionRunId}
        pendingDecisionAction={state.pendingDecisionAction}
        openMenu={state.openMenu}
        openMenuReport={state.openMenuReport}
        deleteConfirmReport={state.deleteConfirmReport}
        rejectConfirmReport={state.rejectConfirmReport}
        rejectionReason={state.rejectionReason}
        onToggleMenu={(report, rect) =>
          state.setOpenMenu((prev) =>
            prev?.runId === report.id
              ? null
              : { runId: report.id, top: rect.bottom + 6, left: rect.right },
          )
        }
        onViewReport={(report) => {
          state.setActiveReportId(report.id);
          state.setOpenMenu(null);
        }}
        onApproveReport={(report) => {
          void state.handleApproveReport(report);
        }}
        onRejectReport={(report) => {
          state.setRejectConfirmReport(report);
          state.setRejectionReason("");
          state.setOpenMenu(null);
        }}
        onAskDelete={(report) => {
          state.setDeleteConfirmReport(report);
          state.setOpenMenu(null);
        }}
        onCloseRejectConfirm={() => {
          state.setRejectConfirmReport(null);
          state.setRejectionReason("");
        }}
        onRejectionReasonChange={state.setRejectionReason}
        onConfirmReject={() => {
          void state.handleRejectReport();
        }}
        onCloseDeleteConfirm={() => state.setDeleteConfirmReport(null)}
        onDeleteReport={(report) => {
          void state.handleDeleteReport(report);
        }}
      />

      {state.error ? (
        <section className="rounded-none border border-red-100 bg-red-50 p-0 text-sm text-red-700 sm:rounded-[14px] sm:p-4">
          {state.error}
        </section>
      ) : null}

      {state.activeReport ? (
        <PayrollReportModal
          report={state.activeReport}
          details={state.activeDetails}
          onClose={() => state.setActiveReportId(null)}
          onRefresh={() => {
            void state.loadReportDetails();
          }}
        />
      ) : null}
    </div>
  );
}

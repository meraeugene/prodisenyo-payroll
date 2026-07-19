"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  approvePayrollReportAction,
  deletePayrollReportAction,
  getPayrollReportDetailsAction,
  getPayrollReportsDataAction,
  rejectPayrollReportAction,
} from "@/actions/payroll";
import type {
  PayrollRunRow,
  ReportActionsMenuState,
  ReportDetailsState,
} from "@/features/payroll-reports/types";

interface UsePayrollReportsPageOptions {
  initialReports: PayrollRunRow[];
}

export function usePayrollReportsPage({
  initialReports,
}: UsePayrollReportsPageOptions) {
  const [deletingRunId, setDeletingRunId] = useState<string | null>(null);
  const [pendingDecisionRunId, setPendingDecisionRunId] = useState<
    string | null
  >(null);
  const [pendingDecisionAction, setPendingDecisionAction] = useState<
    "approve" | "reject" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<ReportActionsMenuState | null>(null);
  const [deleteConfirmReport, setDeleteConfirmReport] =
    useState<PayrollRunRow | null>(null);
  const [rejectConfirmReport, setRejectConfirmReport] =
    useState<PayrollRunRow | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const previousPendingReportsCountRef = useRef<number | null>(null);
  const canPlayNotificationSoundRef = useRef(false);
  const reportsState = useSWR("payroll-approvals", getPayrollReportsDataAction, {
    fallbackData: { reports: initialReports },
    refreshInterval: 15000,
    revalidateOnFocus: true,
  });
  const reports = reportsState.data?.reports ?? [];

  useEffect(() => {
    if (!openMenu) return;
    const handleDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-report-actions-root]")) return;
      setOpenMenu(null);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    const closeMenu = () => setOpenMenu(null);
    document.addEventListener("mousedown", handleDocumentMouseDown);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [openMenu]);

  useEffect(() => {
    if (!deleteConfirmReport) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && deletingRunId !== deleteConfirmReport.id) {
        setDeleteConfirmReport(null);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [deleteConfirmReport, deletingRunId]);

  const sortedReports = useMemo(
    () =>
      [...reports].sort(
        (a, b) =>
          new Date(b.submitted_at ?? b.created_at).getTime() -
          new Date(a.submitted_at ?? a.created_at).getTime(),
      ),
    [reports],
  );
  const activeReport = activeReportId
    ? (sortedReports.find((row) => row.id === activeReportId) ?? null)
    : null;
  const activeDetailsState = useSWR(
    activeReport ? ["payroll-report-details", activeReport.id] : null,
    async ([, reportId]) => getPayrollReportDetailsAction(reportId),
    {
      refreshInterval: activeReport ? 15000 : 0,
      revalidateOnFocus: true,
    },
  );

  async function handleDeleteReport(report: PayrollRunRow) {
    setDeletingRunId(report.id);
    setError(null);
    try {
      await deletePayrollReportAction(report.id);
      await reportsState.mutate(
        (current) => ({
          reports: current?.reports.filter((row) => row.id !== report.id) ?? [],
        }),
        false,
      );
      setActiveReportId((prev) => (prev === report.id ? null : prev));
      setDeleteConfirmReport(null);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete payroll report.",
      );
    } finally {
      setDeletingRunId(null);
      setOpenMenu(null);
    }
  }

  async function handleApproveReport(report: PayrollRunRow) {
    setPendingDecisionRunId(report.id);
    setPendingDecisionAction("approve");
    setError(null);
    try {
      const result = await approvePayrollReportAction(report.id);
      await reportsState.mutate(
        (current) => ({
          reports:
            current?.reports.map((row) =>
              row.id === report.id
                ? {
                    ...row,
                    status: "approved",
                    submitted_at: row.submitted_at ?? result.approvedAt,
                  }
                : row,
            ) ?? [],
        }),
        false,
      );
      void reportsState.mutate();
      if (activeReportId === report.id) {
        void activeDetailsState.mutate();
      }
    } catch (approveError) {
      setError(
        approveError instanceof Error
          ? approveError.message
          : "Failed to approve payroll report.",
      );
    } finally {
      setPendingDecisionRunId(null);
      setPendingDecisionAction(null);
      setOpenMenu(null);
    }
  }

  async function handleRejectReport() {
    if (!rejectConfirmReport) return;

    setPendingDecisionRunId(rejectConfirmReport.id);
    setPendingDecisionAction("reject");
    setError(null);
    try {
      await rejectPayrollReportAction({
        payrollRunId: rejectConfirmReport.id,
        rejectionReason,
      });
      await reportsState.mutate(
        (current) => ({
          reports:
            current?.reports.filter(
              (row) => row.id !== rejectConfirmReport.id,
            ) ?? [],
        }),
        false,
      );
      setActiveReportId((prev) =>
        prev === rejectConfirmReport.id ? null : prev,
      );
      setRejectConfirmReport(null);
      setRejectionReason("");
    } catch (rejectError) {
      setError(
        rejectError instanceof Error
          ? rejectError.message
          : "Failed to return payroll report.",
      );
    } finally {
      setPendingDecisionRunId(null);
      setPendingDecisionAction(null);
      setOpenMenu(null);
    }
  }

  const openMenuReport = openMenu
    ? (sortedReports.find((row) => row.id === openMenu.runId) ?? null)
    : null;
  const pendingReportsCount = useMemo(
    () => reports.filter((report) => report.status === "submitted").length,
    [reports],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      canPlayNotificationSoundRef.current = true;
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const previousPendingReportsCount = previousPendingReportsCountRef.current;

    if (
      previousPendingReportsCount !== null &&
      pendingReportsCount > previousPendingReportsCount &&
      canPlayNotificationSoundRef.current
    ) {
      const audio = new Audio("/sounds/overtime-approval.mp3");
      audio.volume = 0.9;
      void audio.play().catch(() => undefined);
    }

    previousPendingReportsCountRef.current = pendingReportsCount;
  }, [pendingReportsCount]);

  const activeDetails: ReportDetailsState | null = activeDetailsState.error
    ? {
        loading: false,
        error:
          activeDetailsState.error instanceof Error
            ? activeDetailsState.error.message
            : "Unable to load report logs.",
        payrollItems: [],
        attendanceLogs: [],
        dailyTotals: [],
      }
    : activeReport
      ? (activeDetailsState.data?.details ?? {
          loading:
            activeDetailsState.isLoading || activeDetailsState.isValidating,
          error: null,
          payrollItems: [],
          attendanceLogs: [],
          dailyTotals: [],
        })
      : null;

  return {
    reports,
    sortedReports,
    refreshing: reportsState.isValidating,
    deletingRunId,
    pendingDecisionRunId,
    pendingDecisionAction,
    error,
    openMenu,
    setOpenMenu,
    openMenuReport,
    deleteConfirmReport,
    setDeleteConfirmReport,
    rejectConfirmReport,
    setRejectConfirmReport,
    rejectionReason,
    setRejectionReason,
    activeReport,
    activeDetails,
    setActiveReportId,
    pendingReportsCount,
    loadReports: reportsState.mutate,
    loadReportDetails: activeDetailsState.mutate,
    handleDeleteReport,
    handleApproveReport,
    handleRejectReport,
  };
}

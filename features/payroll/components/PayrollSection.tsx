"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Calculator,
  FileSpreadsheet,
  Loader2,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { highlight } from "@/components/Highlight";
import type { PayrollRow } from "@/lib/payrollEngine";
import { ROLE_CODE_TO_NAME, type RoleCode } from "@/lib/payrollConfig";
import {
  exportAllPayslipsToPdf,
  exportEmployeePayslipToPdf,
  type PayslipExportRecord,
} from "@/lib/payslipExport";
import type { Step2Sort } from "@/types";
import type { UsePayrollStateResult } from "@/features/payroll/hooks/usePayrollState";
import PaidHolidayModal from "@/features/payroll/components/PaidHolidayModal";
import { buildVisiblePages } from "@/features/shared/pagination";
import {
  allocateCombinedBranchPay,
  FIXED_PAY_RATE_PER_DAY,
} from "@/features/payroll/utils/payrollSelectors";
import {
  extractSiteName,
  formatLogTime,
  formatPayrollNumber,
  toWeekLabel,
} from "@/features/payroll/utils/payrollFormatters";
import { buildEmployeeBranchRateKey } from "@/features/payroll/utils/payrollMappers";
import {
  buildGroupedEmployeeCompensation,
  buildGroupedEmployeeMetrics,
  buildPayslipRecord,
  buildPayrollPeriodLabel,
  formatDaysLabel,
  groupByEmployee,
  matchesGroupedEmployeeFilters,
  normalizeEmployeeName,
  pickRepresentativeRow,
  round2,
  summarizeGroupedSites,
  type GroupedEmployeeMetrics,
  type GroupedEmployeePayrollRow,
} from "@/features/payroll/utils/payrollSectionHelpers";
import type { AppRole } from "@/types/database";

interface PayrollSectionProps {
  dailyRowsCount: number;
  availableSites: string[];
  payroll: UsePayrollStateResult;
  onGeneratePreview: () => void;
  onSavePayroll: () => void;
  currentPayrollRunId: string | null;
  currentPayrollRunStatus:
    | "draft"
    | "submitted"
    | "approved"
    | "rejected"
    | null;
  currentUserRole: AppRole | null;
  savePending: boolean;
}

const PAYROLL_PREVIEW_LIMIT = 10;

export default function PayrollSection({
  dailyRowsCount,
  availableSites,
  payroll,
  onGeneratePreview,
  onSavePayroll,
  currentPayrollRunId,
  currentPayrollRunStatus,
  currentUserRole,
  savePending,
}: PayrollSectionProps) {
  const [showPaidHolidayModal, setShowPaidHolidayModal] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const canSavePayroll =
    (currentUserRole === "payroll_manager" || currentUserRole === "ceo") &&
    payroll.payrollGenerated &&
    payroll.payrollRows.length > 0;

  const groupedPayrollRows = useMemo(
    () =>
      groupByEmployee(payroll.payrollRows, payroll.payrollSort).filter(
        (employee) =>
          matchesGroupedEmployeeFilters(employee, {
            siteFilter: payroll.payrollSiteFilter,
            roleFilter: payroll.payrollRoleFilter,
            nameFilter: payroll.payrollNameFilter,
            dateFilter: payroll.payrollDateFilter,
          }),
      ),
    [
      payroll.payrollRows,
      payroll.payrollSort,
      payroll.payrollSiteFilter,
      payroll.payrollRoleFilter,
      payroll.payrollNameFilter,
      payroll.payrollDateFilter,
    ],
  );

  const groupedPayrollTotalPages = useMemo(
    () =>
      Math.max(1, Math.ceil(groupedPayrollRows.length / PAYROLL_PREVIEW_LIMIT)),
    [groupedPayrollRows.length],
  );

  const groupedPayrollPage = Math.min(
    payroll.payrollPage,
    groupedPayrollTotalPages,
  );
  const groupedPayrollPreviewStart =
    (groupedPayrollPage - 1) * PAYROLL_PREVIEW_LIMIT;
  const groupedPayrollPreviewEnd =
    groupedPayrollPreviewStart + PAYROLL_PREVIEW_LIMIT;

  const groupedPayrollPreviewRows = useMemo(
    () =>
      groupedPayrollRows.slice(
        groupedPayrollPreviewStart,
        groupedPayrollPreviewEnd,
      ),
    [groupedPayrollRows, groupedPayrollPreviewStart, groupedPayrollPreviewEnd],
  );

  const groupedPayrollPages = useMemo(
    () => buildVisiblePages(groupedPayrollPage, groupedPayrollTotalPages),
    [groupedPayrollPage, groupedPayrollTotalPages],
  );

  const payrollPeriodLabel = useMemo(
    () => buildPayrollPeriodLabel(payroll.payrollRows),
    [payroll.payrollRows],
  );

  const groupedPayrollTotals = useMemo(() => {
    let totalPay = 0;

    for (const employee of groupedPayrollRows) {
      totalPay += buildGroupedEmployeeMetrics(employee, payroll).totalPay;
    }

    return { pay: round2(totalPay) };
  }, [groupedPayrollRows, payroll]);

  const groupedPayslipRecords = useMemo(
    () =>
      groupedPayrollRows
        .map((employee) =>
          buildPayslipRecord(employee, payrollPeriodLabel, payroll),
        )
        .filter((record): record is PayslipExportRecord => Boolean(record)),
    [groupedPayrollRows, payrollPeriodLabel, payroll],
  );

  const activeMobileFilterCount = useMemo(() => {
    let count = 0;
    if (payroll.payrollSiteFilter !== "ALL") count += 1;
    if (payroll.payrollRoleFilter !== "ALL") count += 1;
    if (payroll.payrollNameFilter.trim()) count += 1;
    if (payroll.payrollSort !== "name-asc") count += 1;
    return count;
  }, [
    payroll.payrollSiteFilter,
    payroll.payrollRoleFilter,
    payroll.payrollNameFilter,
    payroll.payrollSort,
  ]);

  function handleExportAllPayslips() {
    if (groupedPayslipRecords.length === 0) return;
    void exportAllPayslipsToPdf(groupedPayslipRecords);
  }

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (payroll.payrollTab !== "payroll") return;
    if (payroll.payrollPage <= groupedPayrollTotalPages) return;
    payroll.setPayrollPage(groupedPayrollTotalPages);
  }, [payroll, groupedPayrollTotalPages]);

  useEffect(() => {
    if (!openActionMenuId) return;

    function handlePointerDown(event: MouseEvent) {
      if (!actionMenuRef.current) return;
      if (actionMenuRef.current.contains(event.target as Node)) return;
      setOpenActionMenuId(null);
      setActionMenuPosition(null);
    }

    function handleViewportChange() {
      setOpenActionMenuId(null);
      setActionMenuPosition(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [openActionMenuId]);

  const payrollActiveRowsCount =
    payroll.payrollTab === "payroll"
      ? groupedPayrollRows.length
      : payroll.payrollActiveRowsCount;
  const payrollPreviewStart =
    payroll.payrollTab === "payroll"
      ? groupedPayrollPreviewStart
      : payroll.payrollPreviewStart;
  const payrollPreviewEnd =
    payroll.payrollTab === "payroll"
      ? groupedPayrollPreviewEnd
      : payroll.payrollPreviewEnd;
  const payrollTotalPages =
    payroll.payrollTab === "payroll"
      ? groupedPayrollTotalPages
      : payroll.payrollTotalPages;
  const payrollPage =
    payroll.payrollTab === "payroll" ? groupedPayrollPage : payroll.payrollPage;
  const payrollPages =
    payroll.payrollTab === "payroll"
      ? groupedPayrollPages
      : payroll.payrollPages;

  if (dailyRowsCount === 0) return null;

  return (
    <section
      className="animate-fade-up mt-4"
      style={{ animationFillMode: "both", animationDelay: "80ms" }}
    >
      <div className="rounded-none border border-apple-mist bg-white shadow-[0_10px_30px_rgba(24,83,43,0.07)] sm:rounded-[14px]">
        <div className="flex flex-col gap-4 border-b border-apple-mist px-4 pb-4 pt-5 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:pb-5 sm:pt-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xs font-mono font-semibold text-apple-steel uppercase tracking-widest">
                Step 3
              </span>
              {payroll.payrollGenerated && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-2xs font-semibold text-emerald-700">
                  Complete
                </span>
              )}
              {currentPayrollRunStatus && (
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-2xs font-semibold text-sky-700">
                  {currentPayrollRunStatus === "submitted"
                    ? "PENDING REVIEW"
                    : currentPayrollRunStatus === "rejected"
                      ? "RETURNED"
                      : currentPayrollRunStatus.toUpperCase()}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-apple-charcoal tracking-tight">
              Generate Payroll
            </h2>
            <p className="text-sm text-apple-smoke mt-1">
              Generate a preview after reviewing attendance logs, then submit
              the payroll record for CEO review.
            </p>
          </div>

          {!payroll.payrollGenerated && (
            <button
              type="button"
              onClick={onGeneratePreview}
              disabled={savePending}
              className="flex items-center gap-2 rounded-[10px] bg-[#1f6a37] hover:bg-[#18552d] px-5 py-3 text-sm font-semibold text-white transition  disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Calculator size={18} />
              Generate Payroll Preview
            </button>
          )}
        </div>

        {payroll.payrollGenerated && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="space-y-5 px-4 py-5 sm:px-6 sm:py-6"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => payroll.setPayrollTab("payroll")}
                className={`rounded-[10px] border px-3 py-1.5 text-xs font-semibold transition-all duration-150
                  ${
                    payroll.payrollTab === "payroll"
                      ? "border-[#1f6a37] bg-[#1f6a37] text-white"
                      : "border-apple-mist bg-white text-apple-ash hover:border-[#7ebd8b]"
                  }`}
              >
                Payroll Summary
              </button>
              <button
                onClick={() => payroll.setPayrollTab("logs")}
                className={`rounded-[10px] border px-3 py-1.5 text-xs font-semibold transition-all duration-150
                  ${
                    payroll.payrollTab === "logs"
                      ? "border-[#1f6a37] bg-[#1f6a37] text-white"
                      : "border-apple-mist bg-white text-apple-ash hover:border-[#7ebd8b]"
                  }`}
              >
                Attendance Logs
              </button>

              <div className="flex w-full gap-2 overflow-x-auto pb-1 sm:ml-auto sm:w-auto sm:flex-nowrap sm:overflow-visible sm:pb-0">
                {canSavePayroll && (
                  <button
                    type="button"
                    onClick={onSavePayroll}
                    disabled={savePending}
                    className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] bg-[#1f6a37] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#18552d] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
                  >
                    {savePending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Calculator size={14} />
                    )}
                    {savePending ? "Submitting..." : "Submit Payroll Report"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={payroll.openPayrollRateModal}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border border-apple-mist px-3.5 py-2 text-xs font-semibold text-apple-ash transition hover:border-apple-steel sm:min-h-0"
                >
                  <SlidersHorizontal size={14} />
                  Edit Branch Rates
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaidHolidayModal(true)}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border border-apple-mist px-3.5 py-2 text-xs font-semibold text-apple-ash transition hover:border-apple-steel disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
                >
                  <CalendarDays size={14} />
                  Paid Holidays
                </button>
                <button
                  type="button"
                  onClick={handleExportAllPayslips}
                  disabled={groupedPayslipRecords.length === 0}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border border-apple-mist px-3.5 py-2 text-xs font-semibold text-apple-ash transition hover:border-apple-steel disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
                >
                  <FileSpreadsheet size={14} />
                  Export Payslips PDF
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative w-full sm:hidden">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-silver"
                  size={16}
                />

                <input
                  type="text"
                  value={payroll.payrollNameFilter}
                  onChange={(e) => payroll.setPayrollNameFilter(e.target.value)}
                  placeholder="Search employee"
                  id="searchPayrollEmployeeMobile"
                  className="h-11 w-full rounded-[12px] border border-[#d9e2e6] bg-white pl-9 pr-9 text-sm text-[#334951] placeholder:text-[#9babaf] transition-all hover:border-[#0f6f74]/35 focus:border-[#0f6f74] focus:outline-none focus:ring-2 focus:ring-[#0f6f74]/10"
                />

                {payroll.payrollNameFilter && (
                  <button
                    type="button"
                    onClick={() => payroll.setPayrollNameFilter("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-apple-steel"
                    aria-label="Clear payroll search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowMobileFilters(true)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[#d9e2e6] bg-white px-4 text-sm font-semibold text-[#41565f] transition-all hover:border-[#0f6f74]/35 sm:hidden"
              >
                <SlidersHorizontal size={15} />
                Filters
                {activeMobileFilterCount > 0 ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1f6a37] px-1.5 text-[11px] font-semibold text-white">
                    {activeMobileFilterCount}
                  </span>
                ) : null}
              </button>

              <select
                value={payroll.payrollSiteFilter}
                onChange={(e) => payroll.setPayrollSiteFilter(e.target.value)}
                className="hidden h-11 w-full cursor-pointer rounded-[12px] border border-[#d9e2e6] bg-white px-3 text-sm text-[#334951] transition-all hover:border-[#0f6f74]/35 focus:border-[#0f6f74] focus:outline-none focus:ring-2 focus:ring-[#0f6f74]/10 sm:block"
              >
                <option value="ALL">All files/sites</option>
                {availableSites.map((siteOption) => (
                  <option key={siteOption} value={siteOption}>
                    {siteOption}
                  </option>
                ))}
              </select>

              <select
                value={payroll.payrollRoleFilter}
                onChange={(e) =>
                  payroll.setPayrollRoleFilter(
                    e.target.value as RoleCode | "ALL",
                  )
                }
                className="hidden h-11 w-full cursor-pointer rounded-[12px] border border-[#d9e2e6] bg-white px-3 text-sm text-[#334951] transition-all hover:border-[#0f6f74]/35 focus:border-[#0f6f74] focus:outline-none focus:ring-2 focus:ring-[#0f6f74]/10 sm:block"
              >
                <option value="ALL">All Roles</option>

                {payroll.roleCodes.map((role) => (
                  <option key={role} value={role}>
                    {role} - {ROLE_CODE_TO_NAME[role]}
                  </option>
                ))}
              </select>

              <div className="relative hidden w-full sm:block">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-silver"
                  size={16}
                />

                <input
                  type="text"
                  value={payroll.payrollNameFilter}
                  onChange={(e) => payroll.setPayrollNameFilter(e.target.value)}
                  placeholder="Search employee... ( / )"
                  id="searchPayrollEmployee"
                  className="h-11 w-full rounded-[12px] border border-[#d9e2e6] pl-9 pr-9 text-sm text-[#334951] placeholder:text-[#9babaf] transition-all hover:border-[#0f6f74]/35 focus:border-[#0f6f74] focus:outline-none focus:ring-2 focus:ring-[#0f6f74]/10"
                />

                {payroll.payrollNameFilter && (
                  <button
                    type="button"
                    onClick={() => payroll.setPayrollNameFilter("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-apple-steel"
                    aria-label="Clear payroll search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <select
                value={payroll.payrollSort}
                onChange={(e) =>
                  payroll.setPayrollSort(e.target.value as Step2Sort)
                }
                className="hidden h-11 w-full cursor-pointer rounded-[12px] border border-[#d9e2e6] bg-white px-3 text-sm text-[#334951] transition-all hover:border-[#0f6f74]/35 focus:border-[#0f6f74] focus:outline-none focus:ring-2 focus:ring-[#0f6f74]/10 sm:block"
              >
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>

              <button
                type="button"
                onClick={payroll.clearPayrollFilters}
                className="hidden h-11 w-full rounded-[12px] border border-[#d9e2e6] text-sm font-semibold text-[#41565f] transition-all hover:border-[#0f6f74]/35 sm:block"
              >
                Clear Filters
              </button>
            </div>

            {payroll.payrollTab === "payroll" ? (
              <>
                <div className="grid grid-cols-1 gap-2 sm:flex sm:gap-2">
                  {payrollPeriodLabel && (
                    <div className="inline-flex w-full items-center rounded-[10px] border border-[#d9e2e6] bg-[#f9fbfc] px-3 py-1.5 text-sm font-semibold text-[#22353b] sm:w-auto sm:whitespace-nowrap">
                      Payroll Period: {payrollPeriodLabel}
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto rounded-[14px] border border-[#e7ecef] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)] [-webkit-overflow-scrolling:touch]">
                  <table className="w-full text-sm table-auto min-w-[1020px]">
                    <thead>
                      <tr className="border-b border-[#edf1f3] bg-[#fafbfc]">
                        {[
                          "Employee",
                          "Role",
                          "Site",
                          "Total Hours",
                          "Days Worked",
                          "Rate/Hour",
                          "Total Pay",
                          "Actions",
                        ].map((h) => (
                          <th
                            key={h}
                            className={`px-4 py-3.5 text-2xs font-semibold uppercase tracking-widest text-[#9babaf] ${
                              h === "#" ||
                              h === "Total Hours" ||
                              h === "Days Worked" ||
                              h === "Rate/Hour" ||
                              h === "Total Pay"
                                ? "text-right"
                                : h === "Actions"
                                  ? "text-center"
                                  : "text-left"
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groupedPayrollPreviewRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-10">
                            <div className="flex flex-col items-center justify-center text-center gap-3 text-apple-steel">
                              <Search size={22} className="text-apple-silver" />

                              <p className="text-sm font-semibold text-apple-charcoal">
                                No employees found
                              </p>

                              <p className="text-xs text-apple-steel max-w-sm">
                                Try clearing filters, searching another name, or
                                changing the date.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        groupedPayrollPreviewRows.map((employee, index) => {
                          const employeeNumber =
                            groupedPayrollPreviewStart + index + 1;
                          const representativeRow = pickRepresentativeRow(
                            employee.sites,
                          );
                          const siteBreakdown = summarizeGroupedSites(
                            employee.sites,
                          );
                          const employeeMetrics = buildGroupedEmployeeMetrics(
                            employee,
                            payroll,
                          );
                          const employeeDaysWorked =
                            employeeMetrics.payableDays;
                          const employeeTotalPay = employeeMetrics.totalPay;
                          const employeeHourlyRateLabel =
                            employeeMetrics.dailyRates.length <= 1
                              ? formatPayrollNumber(
                                  (employeeMetrics.dailyRates[0] ??
                                    FIXED_PAY_RATE_PER_DAY) / 8,
                                )
                              : "Mixed";
                          const employeeHourlyRateTitle =
                            employeeMetrics.dailyRates.length > 1
                              ? `Branch hourly rates: ${employeeMetrics.dailyRates
                                  .map((rate) => formatPayrollNumber(rate / 8))
                                  .join(", ")}`
                              : undefined;

                          return (
                            <tr
                              key={representativeRow?.id ?? employee.name}
                              className="border-b border-[#edf1f3] last:border-0 odd:bg-[#fbfcfd] transition hover:bg-[#f5f9fa]"
                            >
                              <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                                {highlight(
                                  employee.name,
                                  payroll.payrollNameFilter,
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs font-semibold text-apple-charcoal">
                                {employee.role}
                              </td>

                              <td className="px-4 py-3">
                                <p className="text-sm font-semibold text-apple-charcoal">
                                  {siteBreakdown
                                    .map((siteRow) => siteRow.site)
                                  .join(", ")}
                                </p>
                              </td>

                              <td className="px-4 py-3 text-sm font-mono text-apple-charcoal text-right">
                                {formatPayrollNumber(employeeMetrics.totalHours)} hrs
                              </td>
                              <td className="px-4 py-3 text-sm font-mono text-apple-charcoal text-right">
                                {formatDaysLabel(employeeDaysWorked)}
                              </td>
                              <td
                                className="px-4 py-3 text-sm font-mono text-apple-ash text-right"
                                title={employeeHourlyRateTitle}
                              >
                                {employeeHourlyRateLabel}
                              </td>
                              <td className="px-4 py-3 text-sm font-mono text-apple-charcoal font-semibold text-right">
                                {formatPayrollNumber(employeeTotalPay)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div
                                  className="relative flex items-center justify-center"
                                  ref={
                                    openActionMenuId ===
                                    (representativeRow?.id ?? employee.name)
                                      ? actionMenuRef
                                      : null
                                  }
                                >
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      const nextId =
                                        representativeRow?.id ?? employee.name;
                                      const rect =
                                        event.currentTarget.getBoundingClientRect();

                                      setOpenActionMenuId((current) => {
                                        if (current === nextId) {
                                          setActionMenuPosition(null);
                                          return null;
                                        }

                                        setActionMenuPosition({
                                          top: rect.bottom + 8,
                                          left: rect.left + rect.width / 2,
                                        });
                                        return nextId;
                                      });
                                    }}
                                    className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] border transition-all duration-200 border-[#d9e2e6] text-[#41565f] ${
                                      openActionMenuId ===
                                      (representativeRow?.id ?? employee.name)
                                        ? "bg-[#f3f6f8]"
                                        : "hover:border-[#0f6f74]/35 hover:bg-[#f7faf9]"
                                    }`}
                                    aria-label={`Open actions for ${employee.name}`}
                                    aria-expanded={
                                      openActionMenuId ===
                                      (representativeRow?.id ?? employee.name)
                                    }
                                    aria-haspopup="menu"
                                  >
                                    <MoreHorizontal size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-apple-silver bg-[#1f6a37]">
                        <td className="px-4 py-3 text-sm font-semibold text-white">
                          Summary
                        </td>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3 text-right text-sm font-mono font-semibold text-white">
                          {formatPayrollNumber(groupedPayrollTotals.pay)}
                        </td>
                        <td className="px-4 py-3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            ) : (
              <div className="overflow-x-auto rounded-[14px] border border-[#e7ecef] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)] [-webkit-overflow-scrolling:touch]">
                <table className="w-full text-sm table-auto min-w-[900px]">
                  <thead>
                    <tr className="border-b border-[#edf1f3] bg-[#fafbfc]">
                      {[
                        "Worker",
                        "Role",
                        "Site",
                        "Date",
                        "Regular Hours",
                        "OT Hours",
                        "Total Hours",
                      ].map((h) => (
                        <th
                          key={h}
                          className={`px-4 py-3.5 text-2xs font-semibold uppercase tracking-widest text-[#9babaf] ${
                            h.includes("Hours") ? "text-right" : "text-left"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payroll.payrollPreviewLogs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-6 text-center text-sm text-apple-smoke"
                        >
                          No attendance logs match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      payroll.payrollPreviewLogs.map((record, index) => (
                        <tr
                          key={`${record.role}-${record.name}-${record.date}-${record.site}-${index}`}
                          className="border-b border-[#edf1f3] last:border-0 odd:bg-[#fbfcfd] transition hover:bg-[#f5f9fa]"
                        >
                          <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                            {record.name}
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-apple-charcoal">
                            {record.role}
                          </td>
                          <td className="px-4 py-3 text-xs text-apple-smoke">
                            {extractSiteName(record.site)}
                          </td>
                          <td className="px-4 py-3 text-xs text-apple-smoke">
                            {record.date}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-apple-ash">
                            {formatPayrollNumber(record.hours)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-apple-ash">
                            {formatPayrollNumber(record.overtimeHours ?? 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-apple-ash">
                            {formatPayrollNumber(record.totalHours ?? record.hours)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm  text-apple-steel">
                Showing{" "}
                {payrollActiveRowsCount === 0 ? 0 : payrollPreviewStart + 1}-
                {Math.min(payrollPreviewEnd, payrollActiveRowsCount)} of{" "}
                {payrollActiveRowsCount}{" "}
                {payroll.payrollTab === "payroll"
                  ? "employee rows"
                  : "attendance log rows"}
                .
              </p>

              {payrollActiveRowsCount > PAYROLL_PREVIEW_LIMIT && (
                <div className="flex items-center gap-1 flex-wrap">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => payroll.setPayrollPage(1)}
                    disabled={payrollPage === 1}
                    className={`h-8 rounded-[10px] border px-2.5 text-xs font-semibold
${
  payrollPage === 1
    ? "border-apple-mist text-apple-silver cursor-not-allowed"
    : "border-apple-silver text-apple-charcoal hover:border-[#7ebd8b]"
}`}
                  >
                    First
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() =>
                      payroll.setPayrollPage((p) => Math.max(1, p - 1))
                    }
                    disabled={payrollPage === 1}
                    className={`h-8 rounded-[10px] border px-3 text-xs font-semibold
${
  payrollPage === 1
    ? "border-apple-mist text-apple-silver cursor-not-allowed"
    : "border-apple-silver text-apple-charcoal hover:border-[#7ebd8b]"
}`}
                  >
                    <ArrowLeft size={16} />
                  </motion.button>

                  {payrollPages.map((p) => (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.05 }}
                      key={p}
                      onClick={() => payroll.setPayrollPage(p)}
                      className={`h-8 w-8 rounded-[10px] border text-xs font-semibold transition
${
  payrollPage === p
    ? "bg-[#1f6a37] text-white border-[#1f6a37]"
    : "border-apple-silver text-apple-charcoal hover:border-[#7ebd8b]"
}`}
                    >
                      {p}
                    </motion.button>
                  ))}

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() =>
                      payroll.setPayrollPage((p) =>
                        Math.min(payrollTotalPages, p + 1),
                      )
                    }
                    disabled={payrollPage === payrollTotalPages}
                    className={`h-8 rounded-[10px] border px-3 text-xs font-semibold
${
  payrollPage === payrollTotalPages
    ? "border-apple-mist text-apple-silver cursor-not-allowed"
    : "border-apple-silver text-apple-charcoal hover:border-[#7ebd8b]"
}`}
                  >
                    <ArrowRight size={16} />
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => payroll.setPayrollPage(payrollTotalPages)}
                    disabled={payrollPage === payrollTotalPages}
                    className={`h-8 rounded-[10px] border px-2.5 text-xs font-semibold
${
  payrollPage === payrollTotalPages
    ? "border-apple-mist text-apple-silver cursor-not-allowed"
    : "border-apple-silver text-apple-charcoal hover:border-[#7ebd8b]"
}`}
                  >
                    Last
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <PaidHolidayModal
        show={showPaidHolidayModal}
        holidays={payroll.paidHolidays}
        periodStart={payroll.payrollDateRange?.start ?? null}
        periodEnd={payroll.payrollDateRange?.end ?? null}
        onClose={() => setShowPaidHolidayModal(false)}
        onAddManualHoliday={payroll.addManualPaidHoliday}
        onRemoveHoliday={payroll.removePaidHoliday}
        onLoadPhilippineHolidays={payroll.loadPhilippinePaidHolidays}
        onClearHolidays={payroll.clearPaidHolidays}
      />
      {isMounted && showMobileFilters
        ? createPortal(
            <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/45"
                aria-label="Close mobile filters"
                onClick={() => setShowMobileFilters(false)}
              />

              <div className="relative w-full max-w-sm rounded-2xl border border-apple-mist bg-white p-4 shadow-[0_20px_48px_rgba(15,23,42,0.22)]">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-apple-steel">
                    Filters
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowMobileFilters(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-apple-mist text-apple-ash"
                    aria-label="Close filters panel"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  <select
                    value={payroll.payrollSiteFilter}
                    onChange={(e) =>
                      payroll.setPayrollSiteFilter(e.target.value)
                    }
                    className="h-11 w-full cursor-pointer rounded-[12px] border border-[#d9e2e6] bg-white px-3 text-sm text-[#334951] transition-all hover:border-[#0f6f74]/35 focus:border-[#0f6f74] focus:outline-none focus:ring-2 focus:ring-[#0f6f74]/10"
                  >
                    <option value="ALL">Site</option>
                    {availableSites.map((siteOption) => (
                      <option key={siteOption} value={siteOption}>
                        {siteOption}
                      </option>
                    ))}
                  </select>

                  <select
                    value={payroll.payrollRoleFilter}
                    onChange={(e) =>
                      payroll.setPayrollRoleFilter(
                        e.target.value as RoleCode | "ALL",
                      )
                    }
                    className="h-11 w-full cursor-pointer rounded-[12px] border border-[#d9e2e6] bg-white px-3 text-sm text-[#334951] transition-all hover:border-[#0f6f74]/35 focus:border-[#0f6f74] focus:outline-none focus:ring-2 focus:ring-[#0f6f74]/10"
                  >
                    <option value="ALL">Role</option>

                    {payroll.roleCodes.map((role) => (
                      <option key={role} value={role}>
                        {role} - {ROLE_CODE_TO_NAME[role]}
                      </option>
                    ))}
                  </select>

                  <select
                    value={payroll.payrollSort}
                    onChange={(e) =>
                      payroll.setPayrollSort(e.target.value as Step2Sort)
                    }
                    className="h-11 w-full cursor-pointer rounded-[12px] border border-[#d9e2e6] bg-white px-3 text-sm text-[#334951] transition-all hover:border-[#0f6f74]/35 focus:border-[#0f6f74] focus:outline-none focus:ring-2 focus:ring-[#0f6f74]/10"
                  >
                    <option value="name-asc">Sort: A-Z</option>
                    <option value="name-desc">Sort: Z-A</option>
                  </select>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => payroll.clearPayrollFilters()}
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-[12px] border border-[#d9e2e6] text-sm font-semibold text-[#41565f]"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMobileFilters(false)}
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-[12px] bg-[#1f6a37] text-sm font-semibold text-white"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      {isMounted && openActionMenuId && actionMenuPosition
        ? createPortal(
            <div
              ref={actionMenuRef}
              className="animate-fade-in fixed z-[140] min-w-max -translate-x-1/2 overflow-hidden rounded-[14px] border border-[#d9e2e6] bg-white p-1.5 text-left shadow-[0_16px_36px_rgba(15,23,42,0.12)]"
              style={{
                top: actionMenuPosition.top,
                left: actionMenuPosition.left,
              }}
              role="menu"
            >
              <button
                type="button"
                onClick={() => {
                  const selectedEmployee = groupedPayrollRows.find(
                    (employee) =>
                      (pickRepresentativeRow(employee.sites)?.id ??
                        employee.name) === openActionMenuId,
                  );
                  if (!selectedEmployee) return;

                  const representativeRow = pickRepresentativeRow(
                    selectedEmployee.sites,
                  );
                  if (!representativeRow) return;

                  const compensation = buildGroupedEmployeeCompensation(
                    selectedEmployee,
                    payroll,
                  );
                  const metrics = buildGroupedEmployeeMetrics(
                    selectedEmployee,
                    payroll,
                  );
                  const displayRow: PayrollRow = {
                    ...representativeRow,
                    worker: selectedEmployee.name,
                    role: selectedEmployee.role,
                    site: summarizeGroupedSites(selectedEmployee.sites)
                      .map((entry) => entry.site)
                      .join(", "),
                    hoursWorked: metrics.totalHours,
                    overtimeHours: selectedEmployee.sites.reduce(
                      (sum, row) => sum + row.overtimeHours,
                      0,
                    ),
                    regularPay: compensation.totalBasePay,
                    totalPay: metrics.totalPay,
                  };

                  payroll.openPayrollEditModal(representativeRow, displayRow);
                  setOpenActionMenuId(null);
                  setActionMenuPosition(null);
                }}
                className="flex w-full items-center whitespace-nowrap rounded-[10px] px-3 py-2 text-[11px] font-semibold text-[#41565f] transition hover:bg-[#f5f9fa]"
                role="menuitem"
              >
                Edit Employee
              </button>
              <button
                type="button"
                onClick={() => {
                  const selectedEmployee = groupedPayrollRows.find(
                    (employee) =>
                      (pickRepresentativeRow(employee.sites)?.id ??
                        employee.name) === openActionMenuId,
                  );
                  const payslipRecord = selectedEmployee
                    ? buildPayslipRecord(
                        selectedEmployee,
                        payrollPeriodLabel,
                        payroll,
                      )
                    : null;
                  if (!payslipRecord) return;
                  void exportEmployeePayslipToPdf(payslipRecord);
                  setOpenActionMenuId(null);
                  setActionMenuPosition(null);
                }}
                className="flex w-full items-center whitespace-nowrap rounded-[10px] px-3 py-2 text-[11px] font-semibold text-[#41565f] transition hover:bg-[#f5f9fa]"
                role="menuitem"
              >
                Export Payslip
              </button>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

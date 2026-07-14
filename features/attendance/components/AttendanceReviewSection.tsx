"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Search, X } from "lucide-react";
import { highlight } from "@/components/Highlight";
import type { AttendanceRecord } from "@/types";
import type { UseAttendanceReviewResult } from "@/features/attendance/hooks/useAttendanceReview";
import { formatLogTime } from "@/features/payroll/utils/payrollFormatters";

interface AttendanceReviewSectionProps {
  step: number;
  site: string;
  records: AttendanceRecord[];
  attendance: UseAttendanceReviewResult;
}

export default function AttendanceReviewSection({
  step,
  site,
  records,
  attendance,
}: AttendanceReviewSectionProps) {
  if (step < 2) return null;

  const {
    step2View,
    setStep2View,
    step2SiteFilter,
    setStep2SiteFilter,
    step2NameFilter,
    setStep2NameFilter,
    step2DateFilter,
    setStep2DateFilter,
    step2Sort,
    setStep2Sort,
    availableSites,
    branchSummaries,
    previewDailyRows,
    previewRecords,
    activeRowsCount,
    previewStart,
    previewEnd,
    totalRowsForCurrentView,
    totalRecordPages,
    recordsPage,
    setRecordsPage,
    step2Pages,
    clearFilters,
  } = attendance;

  return (
    <section
      className="animate-fade-up"
      style={{ animationFillMode: "both", animationDelay: "40ms" }}
    >
      <div className="overflow-hidden rounded-none border border-apple-mist bg-white shadow-[0_10px_30px_rgba(24,83,43,0.07)] sm:rounded-[14px]">
        <div className="border-b border-apple-mist px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-2xs font-mono font-semibold text-apple-steel uppercase tracking-widest">
              Step 2
            </span>
            <span className="rounded-full border border-[#1f6a37] bg-[#1f6a37] px-2 py-0.5 text-2xs font-semibold text-white">
              {site}
            </span>
            {step > 2 && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-2xs font-semibold text-emerald-700">
                Complete
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-apple-charcoal tracking-tight">
            Review Attendance Logs
          </h2>
          <p className="text-sm text-apple-smoke mt-1">
            Employees who did not use biometric attendance are not included.
          </p>
        </div>

        <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
          {branchSummaries.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {branchSummaries.map((branch, i) => (
                <motion.div
                  key={branch.siteName}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-[12px] border border-apple-mist  px-4 py-3 transition hover:bg-white shadow-[0_8px_18px_rgba(24,83,43,0.06)] bg-[linear-gradient(135deg,#112e1a,#1f4f2c,#245f34)]  "
                >
                  <p className="text-[11px] uppercase tracking-wider text-white/65">
                    Branch
                  </p>

                  <p className="mt-1 text-sm font-semibold text-white">
                    {branch.siteName.split(" ")[0]}
                  </p>

                  <p className="mt-1 text-sm text-white/55">
                    {branch.employeeCount}{" "}
                    {branch.employeeCount === 1 ? "employee" : "employees"}
                  </p>
                </motion.div>
              ))}
            </div>
          )}

          {records.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setStep2View("daily");
                }}
                className={`rounded-[10px] border px-3 py-1.5 text-xs font-semibold transition-all duration-150
                  ${
                    step2View === "daily"
                      ? "border-[#1f6a37] bg-[#1f6a37] text-white"
                      : "border-apple-mist bg-white text-apple-ash hover:border-[#7ebd8b]"
                  }`}
              >
                Daily View
              </button>
              <button
                onClick={() => {
                  setStep2View("detailed");
                }}
                className={`rounded-[10px] border px-3 py-1.5 text-xs font-semibold transition-all duration-150
                  ${
                    step2View === "detailed"
                      ? "border-[#1f6a37] bg-[#1f6a37] text-white"
                      : "border-apple-mist bg-white text-apple-ash hover:border-[#7ebd8b]"
                  }`}
              >
                Detailed Logs
              </button>
            </div>
          )}

          {records.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <select
                value={step2SiteFilter}
                onChange={(e) => setStep2SiteFilter(e.target.value)}
                className="h-11 cursor-pointer w-full rounded-[12px] border border-[#d9e2e6] bg-white px-3 text-sm text-[#334951] transition-all hover:border-[#0f6f74]/35 focus:border-[#0f6f74] focus:outline-none focus:ring-2 focus:ring-[#0f6f74]/10"
              >
                <option value="ALL">All files/sites</option>
                {availableSites.map((siteOption) => (
                  <option key={siteOption} value={siteOption}>
                    {siteOption}
                  </option>
                ))}
              </select>

              <div className="relative w-full">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-silver"
                  size={16}
                />

                <input
                  type="text"
                  value={step2NameFilter}
                  onChange={(e) => setStep2NameFilter(e.target.value)}
                  placeholder="Search employee... ( / )"
                  id="searchEmployee"
                  className="h-11 w-full rounded-[12px] border border-[#d9e2e6] bg-white py-2.5 pl-9 pr-9 text-sm text-[#334951] transition-all hover:border-[#0f6f74]/35 focus:border-[#0f6f74] focus:outline-none focus:ring-2 focus:ring-[#0f6f74]/10"
                />

                {step2NameFilter && (
                  <button
                    onClick={() => setStep2NameFilter("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-apple-steel"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <input
                type="date"
                value={step2DateFilter}
                onChange={(e) => setStep2DateFilter(e.target.value)}
                className="h-11 cursor-pointer w-full rounded-[12px] border border-[#d9e2e6] bg-white px-3 text-sm text-[#334951] transition-all hover:border-[#0f6f74]/35 focus:border-[#0f6f74] focus:outline-none focus:ring-2 focus:ring-[#0f6f74]/10"
              />

              <select
                value={step2Sort}
                onChange={(e) =>
                  setStep2Sort(e.target.value as typeof step2Sort)
                }
                className="h-11 w-full cursor-pointer rounded-[12px] border border-[#d9e2e6] bg-white px-3 text-sm text-[#334951] transition-all hover:border-[#0f6f74]/35 focus:border-[#0f6f74] focus:outline-none focus:ring-2 focus:ring-[#0f6f74]/10"
              >
                <option value="date-asc">Date first (oldest)</option>
                <option value="date-desc">Date first (newest)</option>
                <option value="name-asc">Name first (A-Z)</option>
                <option value="name-desc">Name first (Z-A)</option>
              </select>

              <button
                onClick={clearFilters}
                className="h-11 w-full rounded-[12px] border border-[#d9e2e6] bg-white px-3 text-sm font-semibold text-[#334951] transition-all hover:border-[#0f6f74]/35"
              >
                Clear Filters
              </button>
            </div>
          )}

          {records.length > 0 ? (
            step2View === "daily" ? (
              <div className="w-full overflow-x-auto overflow-y-visible rounded-[14px] border border-[#e7ecef] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)] [-webkit-overflow-scrolling:touch]">
                <table className="min-w-[1250px] w-full text-sm table-auto">
                  <thead>
                    <tr className="border-b border-[#edf1f3] bg-[#fafbfc]">
                      {[
                        "Date",
                        "Employee",
                        "Site",
                        "Time1 In",
                        "Time1 Out",
                        "Time2 In",
                        "Time2 Out",
                        "OT In",
                        "OT Out",
                        "Regular Hours",
                        "OT Hours",
                        "Total Hours",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3.5 text-left text-2xs font-semibold uppercase tracking-widest text-[#9babaf]"
                        >
                          {h === "Regular Hours" ? (
                            <span title="Regular hours exclude the mandatory unpaid one-hour break. Longer recorded lunch breaks are also excluded.">
                              Regular Hours*
                            </span>
                          ) : (
                            h
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewDailyRows.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-10">
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
                      previewDailyRows.map((row) => (
                        <tr
                          key={`${row.date}-${row.employee}`}
                          className="border-b border-[#edf1f3] last:border-0 odd:bg-[#fbfcfd] transition hover:bg-[#f5f9fa]"
                        >
                          <td className="px-4 py-3 text-sm  text-apple-ash">
                            {row.date}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                            {highlight(row.employee, step2NameFilter)}
                          </td>
                          <td className="px-4 py-3 text-xs text-apple-smoke">
                            {row.site.split(" ")[0]}
                          </td>
                          <td className="px-4 py-3 text-sm  text-apple-ash">
                            {row.time1In ? (
                              formatLogTime(row.time1In)
                            ) : (
                              <span className="text-red-500 ">Missed</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm  text-apple-ash">
                            {row.time1Out ? (
                              formatLogTime(row.time1Out)
                            ) : (
                              <span className="text-red-500 ">Missed</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm  text-apple-ash">
                            {row.time2In ? (
                              formatLogTime(row.time2In)
                            ) : (
                              <span className="text-red-500 ">Missed</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm  text-apple-ash">
                            {row.time2Out ? (
                              formatLogTime(row.time2Out)
                            ) : (
                              <span className="text-red-500 ">Missed</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm  text-apple-ash">
                            {row.otIn ? formatLogTime(row.otIn) : "--:--"}
                          </td>
                          <td className="px-4 py-3 text-sm  text-apple-ash">
                            {row.otOut ? formatLogTime(row.otOut) : "--:--"}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                            {row.regularHours.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                            {row.overtimeHours.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                            {row.totalHours.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <p className="px-4 py-2 text-xs text-apple-steel">
                  * Regular Hours exclude the mandatory unpaid one-hour break.
                  Longer recorded lunch breaks are also unpaid.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[14px] border border-[#e7ecef] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)] [-webkit-overflow-scrolling:touch]">
                <table className="w-full text-sm table-auto">
                  <thead>
                    <tr className="border-b border-[#edf1f3] bg-[#fafbfc]">
                      {[
                        "Date",
                        "Employee",
                        "Log Time",
                        "Type",
                        "Source",
                        "Site",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3.5 text-left text-2xs font-semibold uppercase tracking-widest text-[#9babaf]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRecords.map((r, idx) => (
                      <tr
                        key={`${r.employee}-${r.date}-${r.logTime}-${r.type}-${idx}`}
                        className="border-b border-[#edf1f3] last:border-0 odd:bg-[#fbfcfd] transition hover:bg-[#f5f9fa]"
                      >
                        <td className="px-4 py-3 text-sm font-mono text-apple-ash">
                          {r.date}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                          {r.employee}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-apple-ash">
                          {formatLogTime(r.logTime)}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-apple-charcoal">
                          {r.type}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-apple-steel">
                          {r.source}
                        </td>
                        <td className="px-4 py-3 text-xs text-apple-smoke">
                          {r.site}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <p className="text-sm text-apple-smoke">
              No detailed time logs detected. Upload a raw biometric attendance
              sheet with Date/Week or Date/Weekday and IN/OUT time columns.
            </p>
          )}

          {activeRowsCount > 0 && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-apple-steel">
                Showing {previewStart + 1}-
                {Math.min(previewEnd, activeRowsCount)} of {activeRowsCount}{" "}
                {step2View === "daily" ? "employee-day rows" : "cleaned logs"}
                {activeRowsCount !== totalRowsForCurrentView
                  ? ` (filtered from ${totalRowsForCurrentView}).`
                  : "."}
              </p>

              {activeRowsCount > 10 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setRecordsPage(1)}
                    disabled={recordsPage === 1}
                    className={`h-8 rounded-[10px] border px-2.5 text-xs font-semibold
${
  recordsPage === 1
    ? "border-apple-mist text-apple-silver cursor-not-allowed"
    : "border-apple-silver text-apple-charcoal hover:border-[#7ebd8b]"
}`}
                  >
                    First
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setRecordsPage((p) => Math.max(1, p - 1))}
                    disabled={recordsPage === 1}
                    className={`h-8 rounded-[10px] border px-3 text-xs font-semibold
${
  recordsPage === 1
    ? "border-apple-mist text-apple-silver cursor-not-allowed"
    : "border-apple-silver text-apple-charcoal hover:border-[#7ebd8b]"
}`}
                  >
                    <ArrowLeft size={16} />
                  </motion.button>

                  {step2Pages.map((p) => (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.05 }}
                      key={p}
                      onClick={() => setRecordsPage(p)}
                      className={`h-8 w-8 rounded-[10px] border text-xs font-semibold transition
${
  recordsPage === p
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
                      setRecordsPage((p) => Math.min(totalRecordPages, p + 1))
                    }
                    disabled={recordsPage === totalRecordPages}
                    className={`h-8 rounded-[10px] border px-3 text-xs font-semibold
${
  recordsPage === totalRecordPages
    ? "border-apple-mist text-apple-silver cursor-not-allowed"
    : "border-apple-silver text-apple-charcoal hover:border-[#7ebd8b]"
}`}
                  >
                    <ArrowRight size={16} />
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setRecordsPage(totalRecordPages)}
                    disabled={recordsPage === totalRecordPages}
                    className={`h-8 rounded-[10px] border px-2.5 text-xs font-semibold
${
  recordsPage === totalRecordPages
    ? "border-apple-mist text-apple-silver cursor-not-allowed"
    : "border-apple-silver text-apple-charcoal hover:border-[#7ebd8b]"
}`}
                  >
                    Last
                  </motion.button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

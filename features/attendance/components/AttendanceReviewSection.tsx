"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Search, X } from "lucide-react";
import { highlight } from "@/components/Highlight";
import type { AttendanceRecord } from "@/types";
import type { UseAttendanceReviewResult } from "@/features/attendance/hooks/useAttendanceReview";

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
      <div className="bg-white rounded-3xl border border-apple-mist shadow-apple-xs overflow-hidden">
        <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6 border-b border-apple-mist">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-2xs font-mono font-semibold text-apple-steel uppercase tracking-widest">
              Step 2
            </span>
            <span className="text-2xs font-semibold text-apple-smoke bg-apple-snow px-2 py-0.5 rounded-full border border-apple-mist">
              {site}
            </span>
            {step > 2 && (
              <span className="text-2xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                Complete
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-apple-charcoal tracking-tight">
            Review Attendance Logs
          </h2>
          <p className="text-sm text-apple-smoke mt-1">
            Your biometric files are cleaned and converted into readable daily
            time logs.
          </p>
        </div>

        <div className="px-5 sm:px-8 py-6 sm:py-8 space-y-5">
          {branchSummaries.length > 0 && (
            <div className="rounded-2xl border border-apple-mist bg-white px-5 py-4">
              <p className="text-2xs font-semibold text-apple-steel uppercase tracking-widest mb-4">
                Branch Summary
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {branchSummaries.map((branch, i) => (
                  <motion.div
                    key={branch.siteName}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-apple-mist bg-apple-snow px-4 py-3 hover:shadow-sm transition"
                  >
                    <p className="text-[11px] text-apple-steel uppercase tracking-wider">
                      Branch
                    </p>

                    <p className="text-sm font-semibold text-apple-charcoal mt-1">
                      {branch.siteName.split(" ")[0]}
                    </p>

                    <p className="text-sm mt-1">
                      {branch.employeeCount}{" "}
                      {branch.employeeCount === 1 ? "employee" : "employees"}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {records.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setStep2View("daily");
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150
                  ${
                    step2View === "daily"
                      ? "bg-apple-charcoal text-white border-apple-charcoal"
                      : "bg-white text-apple-charcoal border-apple-silver hover:border-apple-charcoal"
                  }`}
              >
                Daily View
              </button>
              <button
                onClick={() => {
                  setStep2View("detailed");
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150
                  ${
                    step2View === "detailed"
                      ? "bg-apple-charcoal text-white border-apple-charcoal"
                      : "bg-white text-apple-charcoal border-apple-silver hover:border-apple-charcoal"
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
                className="w-full px-3 h-10 rounded-2xl border border-apple-silver  hover:border-apple-charcoal cursor-pointer bg-white text-sm text-apple-charcoal
                  focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal transition-all"
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
                  className="w-full hover:border-apple-charcoal pl-9 pr-9 py-2.5 rounded-2xl border border-apple-silver bg-white text-sm"
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
                className="w-full hover:border-apple-charcoal px-3 h-10 rounded-2xl border border-apple-silver bg-white text-sm text-apple-charcoal
                  focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal transition-all"
              />

              <select
                value={step2Sort}
                onChange={(e) =>
                  setStep2Sort(e.target.value as typeof step2Sort)
                }
                className="w-full px-3 h-10 rounded-2xl border border-apple-silver hover:border-apple-charcoal cursor-pointer bg-white text-sm text-apple-charcoal
                  focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal transition-all"
              >
                <option value="date-asc">Date first (oldest)</option>
                <option value="date-desc">Date first (newest)</option>
                <option value="name-asc">Name first (A-Z)</option>
                <option value="name-desc">Name first (Z-A)</option>
              </select>

              <button
                onClick={clearFilters}
                className="w-full px-3 h-10 rounded-2xl border border-apple-silver bg-white text-sm font-semibold text-apple-charcoal
                  hover:border-apple-charcoal transition-all"
              >
                Clear Filters
              </button>
            </div>
          )}

          {records.length > 0 ? (
            step2View === "daily" ? (
              <div className="rounded-3xl border border-apple-mist bg-white shadow-apple-xs w-full">
                <table className="w-full text-sm table-auto">
                  <thead>
                    <tr className="border-b border-apple-mist">
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
                        "Hrs",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3.5 text-left text-2xs font-semibold uppercase tracking-widest text-apple-steel"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewDailyRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-10">
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
                          className="border-b border-apple-mist/60 last:border-0 odd:bg-apple-snow/40 hover:bg-apple-snow/70 transition"
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
                              row.time1In
                            ) : (
                              <span className="text-red-500 ">Missed</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm  text-apple-ash">
                            {row.time1Out ? (
                              row.time1Out
                            ) : (
                              <span className="text-red-500 ">Missed</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm  text-apple-ash">
                            {row.time2In ? (
                              row.time2In
                            ) : (
                              <span className="text-red-500 ">Missed</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm  text-apple-ash">
                            {row.time2Out ? (
                              row.time2Out
                            ) : (
                              <span className="text-red-500 ">Missed</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm  text-apple-ash">
                            {row.otIn || "--:--"}
                          </td>
                          <td className="px-4 py-3 text-sm  text-apple-ash">
                            {row.otOut || "--:--"}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                            {row.hours.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-apple-mist bg-white shadow-apple-xs [-webkit-overflow-scrolling:touch]">
                <table className="w-full text-sm table-auto">
                  <thead>
                    <tr className="border-b border-apple-mist">
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
                          className="px-4 py-3.5 text-left text-2xs font-semibold uppercase tracking-widest text-apple-steel"
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
                        className="border-b border-apple-mist/60 last:border-0 odd:bg-apple-snow/40 hover:bg-apple-snow/70 transition"
                      >
                        <td className="px-4 py-3 text-sm font-mono text-apple-ash">
                          {r.date}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                          {r.employee}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-apple-ash">
                          {r.logTime}
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
                    className={`px-2.5 h-8 rounded-xl text-xs font-semibold border
${
  recordsPage === 1
    ? "border-apple-mist text-apple-silver cursor-not-allowed"
    : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
}`}
                  >
                    First
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setRecordsPage((p) => Math.max(1, p - 1))}
                    disabled={recordsPage === 1}
                    className={`px-3 h-8 rounded-xl text-xs font-semibold border
${
  recordsPage === 1
    ? "border-apple-mist text-apple-silver cursor-not-allowed"
    : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
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
                      className={`w-8 h-8 rounded-lg text-xs font-semibold border transition
${
  recordsPage === p
    ? "bg-apple-charcoal text-white border-apple-charcoal"
    : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
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
                    className={`px-3 h-8 rounded-xl text-xs font-semibold border
${
  recordsPage === totalRecordPages
    ? "border-apple-mist text-apple-silver cursor-not-allowed"
    : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
}`}
                  >
                    <ArrowRight size={16} />
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setRecordsPage(totalRecordPages)}
                    disabled={recordsPage === totalRecordPages}
                    className={`px-2.5 h-8 rounded-xl text-xs font-semibold border
${
  recordsPage === totalRecordPages
    ? "border-apple-mist text-apple-silver cursor-not-allowed"
    : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
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

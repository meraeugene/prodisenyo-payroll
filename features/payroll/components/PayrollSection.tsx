"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Calculator, Search } from "lucide-react";
import { highlight } from "@/components/Highlight";
import { ROLE_CODE_TO_NAME, type RoleCode } from "@/lib/payrollConfig";
import type { Step2Sort } from "@/types";
import type { UsePayrollStateResult } from "@/features/payroll/hooks/usePayrollState";
import { formatPayrollNumber } from "@/features/payroll/utils/payrollFormatters";

interface PayrollSectionProps {
  dailyRowsCount: number;
  availableSites: string[];
  payroll: UsePayrollStateResult;
  onGeneratePayroll: () => void;
}

export default function PayrollSection({
  dailyRowsCount,
  availableSites,
  payroll,
  onGeneratePayroll,
}: PayrollSectionProps) {
  if (dailyRowsCount === 0) return null;

  return (
    <section
      className="animate-fade-up"
      style={{ animationFillMode: "both", animationDelay: "80ms" }}
    >
      <div className="bg-white rounded-3xl border border-apple-mist shadow-apple-xs overflow-hidden">
        <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6 border-b border-apple-mist flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xs font-mono font-semibold text-apple-steel uppercase tracking-widest">
                Step 3
              </span>
              {payroll.payrollGenerated && (
                <span className="text-2xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                  Complete
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-apple-charcoal tracking-tight">
              Generate Payroll
            </h2>
            <p className="text-sm text-apple-smoke mt-1">
              Generate payroll after reviewing attendance logs.
            </p>
            {/* {payroll.payrollSaveNotice && (
              <p className="mt-2 text-xs font-semibold text-green-700">
                {payroll.payrollSaveNotice}
              </p>
            )} */}
          </div>

          {!payroll.payrollGenerated && (
            <button
              type="button"
              onClick={onGeneratePayroll}
              disabled={payroll.payrollRows.length === 0}
              className="px-5 py-3 rounded-2xl bg-apple-charcoal text-white text-sm font-semibold hover:bg-apple-black transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Calculator size={18} />
              Generate Payroll
            </button>
          )}
        </div>

        {payroll.payrollGenerated && (
          <div className="px-5 sm:px-8 py-6 sm:py-8 space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => payroll.setPayrollTab("payroll")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150
                  ${
                    payroll.payrollTab === "payroll"
                      ? "bg-apple-charcoal text-white border-apple-charcoal"
                      : "bg-white text-apple-charcoal border-apple-silver hover:border-apple-charcoal"
                  }`}
              >
                Payroll Summary
              </button>
              <button
                onClick={() => payroll.setPayrollTab("logs")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150
                  ${
                    payroll.payrollTab === "logs"
                      ? "bg-apple-charcoal text-white border-apple-charcoal"
                      : "bg-white text-apple-charcoal border-apple-silver hover:border-apple-charcoal"
                  }`}
              >
                Attendance Logs
              </button>

              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={payroll.handleExportPayroll}
                  disabled={payroll.filteredPayrollRows.length === 0}
                  className="px-3.5 py-2 rounded-xl border border-apple-silver text-xs font-semibold text-apple-ash hover:border-apple-charcoal transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export Excel
                </button>
                <button
                  type="button"
                  onClick={payroll.openPayrollRateModal}
                  className="px-3.5 py-2 rounded-xl border border-apple-silver text-xs font-semibold text-apple-ash hover:border-apple-charcoal transition"
                >
                  Edit Rates
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <select
                value={payroll.payrollSiteFilter}
                onChange={(e) => payroll.setPayrollSiteFilter(e.target.value)}
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

              <select
                value={payroll.payrollRoleFilter}
                onChange={(e) =>
                  payroll.setPayrollRoleFilter(
                    e.target.value as RoleCode | "ALL",
                  )
                }
                className="w-full h-10 px-3 rounded-2xl border border-apple-silver
focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15
focus:border-apple-charcoal hover:border-apple-charcoal cursor-pointer text-sm text-apple-charcoal bg-white"
              >
                <option value="ALL">All Roles</option>

                {payroll.roleCodes.map((role) => (
                  <option key={role} value={role}>
                    {role} - {ROLE_CODE_TO_NAME[role]}
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
                  value={payroll.payrollNameFilter}
                  onChange={(e) => payroll.setPayrollNameFilter(e.target.value)}
                  placeholder="Search employee... ( / )"
                  id="searchPayrollEmployee"
                  className="w-full  hover:border-apple-charcoal h-10 pl-9 pr-3 rounded-2xl border border-apple-silver
                    focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal
                    text-sm text-apple-charcoal placeholder:text-apple-silver transition-all"
                />
              </div>

              <input
                type="date"
                value={payroll.payrollDateFilter}
                onChange={(e) => payroll.setPayrollDateFilter(e.target.value)}
                className="w-full h-10 hover:border-apple-charcoal px-3 rounded-2xl border border-apple-silver
                  focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal
                  text-sm text-apple-charcoal placeholder:text-apple-silver transition-all"
              />

              <select
                value={payroll.payrollSort}
                onChange={(e) =>
                  payroll.setPayrollSort(e.target.value as Step2Sort)
                }
                className="w-full h-10 px-3 rounded-2xl border border-apple-silver
                  focus:outline-none hover:border-apple-charcoal cursor-pointer  focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal
                  text-sm text-apple-charcoal bg-white transition-all"
              >
                <option value="date-asc">Date first (oldest)</option>
                <option value="date-desc">Date first (latest)</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>

              <button
                type="button"
                onClick={payroll.clearPayrollFilters}
                className="w-full h-10 rounded-2xl border border-apple-silver text-sm font-semibold text-apple-ash hover:border-apple-charcoal transition-all"
              >
                Clear Filters
              </button>
            </div>

            {payroll.payrollTab === "payroll" ? (
              <div className="overflow-x-auto rounded-3xl border border-apple-mist bg-white shadow-apple-xs [-webkit-overflow-scrolling:touch]">
                <table className="w-full text-sm table-auto min-w-[900px]">
                  <thead>
                    <tr className="border-b border-apple-mist">
                      {[
                        "Worker",
                        "Role",
                        "Site",
                        "Date",
                        "Hours",
                        "Rate",
                        "Total Pay",
                        "Edit",
                      ].map((h) => (
                        <th
                          key={h}
                          className={`px-4 py-3.5 text-2xs font-semibold uppercase tracking-widest text-apple-steel ${
                            h === "Hours" || h === "Rate" || h === "Total Pay"
                              ? "text-right"
                              : h === "Edit"
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
                    {payroll.payrollPreviewRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-6 text-center text-sm text-apple-smoke"
                        >
                          No payroll rows match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      payroll.payrollPreviewRows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-apple-mist/60 last:border-0 odd:bg-apple-snow/40 hover:bg-apple-snow/70 transition"
                        >
                          <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                            {highlight(row.worker, payroll.payrollNameFilter)}
                          </td>

                          <td className="px-4 py-3 text-xs font-semibold text-apple-charcoal">
                            {row.role}
                          </td>
                          <td className="px-4 py-3 text-xs text-apple-smoke">
                            {row.site.split(" ")[0]}
                          </td>
                          <td className="px-4 py-3 text-xs text-apple-smoke">
                            {row.date || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-apple-ash text-right">
                            {formatPayrollNumber(row.hoursWorked)}
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-apple-ash text-right">
                            {formatPayrollNumber(row.rate)}
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-apple-charcoal font-semibold text-right">
                            {formatPayrollNumber(row.totalPay)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => payroll.openPayrollEditModal(row)}
                              className="px-3 py-1.5 rounded-lg border border-apple-silver text-2xs font-semibold text-apple-ash hover:border-apple-charcoal transition"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-apple-silver bg-apple-snow/70">
                      <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                        Summary
                      </td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-right text-sm font-mono font-semibold text-apple-charcoal">
                        {formatPayrollNumber(payroll.payrollTotals.hours)}
                      </td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-right text-sm font-mono font-semibold text-apple-charcoal">
                        {formatPayrollNumber(payroll.payrollTotals.pay)}
                      </td>
                      <td className="px-4 py-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-apple-mist bg-white shadow-apple-xs [-webkit-overflow-scrolling:touch]">
                <table className="w-full text-sm table-auto min-w-[760px]">
                  <thead>
                    <tr className="border-b border-apple-mist">
                      {["Worker", "Role", "Site", "Date", "Hours"].map((h) => (
                        <th
                          key={h}
                          className={`px-4 py-3.5 text-2xs font-semibold uppercase tracking-widest text-apple-steel ${
                            h === "Hours" ? "text-right" : "text-left"
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
                          colSpan={5}
                          className="px-4 py-6 text-center text-sm text-apple-smoke"
                        >
                          No attendance logs match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      payroll.payrollPreviewLogs.map((record, index) => (
                        <tr
                          key={`${record.role}-${record.name}-${record.date}-${record.site}-${index}`}
                          className="border-b border-apple-mist/60 last:border-0 odd:bg-apple-snow/40 hover:bg-apple-snow/70 transition"
                        >
                          <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                            {record.name}
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-apple-charcoal">
                            {record.role}
                          </td>
                          <td className="px-4 py-3 text-xs text-apple-smoke">
                            {record.site}
                          </td>
                          <td className="px-4 py-3 text-xs text-apple-smoke">
                            {record.date}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-apple-ash">
                            {formatPayrollNumber(record.hours)}
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
                {payroll.payrollActiveRowsCount === 0
                  ? 0
                  : payroll.payrollPreviewStart + 1}
                -
                {Math.min(
                  payroll.payrollPreviewEnd,
                  payroll.payrollActiveRowsCount,
                )}{" "}
                of {payroll.payrollActiveRowsCount}{" "}
                {payroll.payrollTab === "payroll"
                  ? "employee payroll rows"
                  : "attendance log rows"}
                .
              </p>

              {payroll.payrollActiveRowsCount > 10 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => payroll.setPayrollPage(1)}
                    disabled={payroll.payrollPage === 1}
                    className={`px-2.5 h-8 rounded-xl text-xs font-semibold border
${
  payroll.payrollPage === 1
    ? "border-apple-mist text-apple-silver cursor-not-allowed"
    : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
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
                    disabled={payroll.payrollPage === 1}
                    className={`px-3 h-8 rounded-xl text-xs font-semibold border
${
  payroll.payrollPage === 1
    ? "border-apple-mist text-apple-silver cursor-not-allowed"
    : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
}`}
                  >
                    <ArrowLeft size={16} />
                  </motion.button>

                  {payroll.payrollPages.map((p) => (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.05 }}
                      key={p}
                      onClick={() => payroll.setPayrollPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold border transition
${
  payroll.payrollPage === p
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
                      payroll.setPayrollPage((p) =>
                        Math.min(payroll.payrollTotalPages, p + 1),
                      )
                    }
                    disabled={payroll.payrollPage === payroll.payrollTotalPages}
                    className={`px-3 h-8 rounded-xl text-xs font-semibold border
${
  payroll.payrollPage === payroll.payrollTotalPages
    ? "border-apple-mist text-apple-silver cursor-not-allowed"
    : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
}`}
                  >
                    <ArrowRight size={16} />
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() =>
                      payroll.setPayrollPage(payroll.payrollTotalPages)
                    }
                    disabled={payroll.payrollPage === payroll.payrollTotalPages}
                    className={`px-2.5 h-8 rounded-xl text-xs font-semibold border
${
  payroll.payrollPage === payroll.payrollTotalPages
    ? "border-apple-mist text-apple-silver cursor-not-allowed"
    : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
}`}
                  >
                    Last
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

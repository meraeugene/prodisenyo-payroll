"use client";

import { X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ROLE_CODE_TO_NAME, type RoleCode } from "@/lib/payrollConfig";
import type { DailyLogRow } from "@/types";
import type { UsePayrollStateResult } from "@/features/payroll/hooks/usePayrollState";
import {
  formatPayrollNumber,
  normalizeNumericInput,
  toClockHours,
  toWeekLabel,
} from "@/features/payroll/utils/payrollFormatters";
import { getLogOverrideKey } from "@/features/payroll/utils/payrollMappers";

const EMPLOYEE_ANALYTICS_COLORS = ["#2563EB", "#F59E0B", "#10B981", "#8B5CF6"];

interface PayrollEditModalProps {
  payroll: UsePayrollStateResult;
}

export default function PayrollEditModal({ payroll }: PayrollEditModalProps) {
  const { editingPayrollRow, payrollEditDraft } = payroll;

  if (!editingPayrollRow || !payrollEditDraft) return null;

  function updateDraft(
    field: "hoursWorked" | "rate" | "overtimeHours",
    value: string,
  ) {
    payroll.setPayrollEditDraft((prev) =>
      prev
        ? {
            ...prev,
            [field]: normalizeNumericInput(value),
          }
        : prev,
    );
  }

  function getHoursValue(log: DailyLogRow): string {
    const key = getLogOverrideKey(log);
    const value = payroll.logHourOverrides[key] ?? log.hours;
    return normalizeNumericInput(String(value));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="w-full max-w-6xl max-h-[88vh] overflow-y-auto rounded-lg border border-apple-mist bg-white shadow-apple-xs">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-apple-mist px-5 sm:px-7 py-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-2xs font-semibold  uppercase tracking-widest">
              Calculation Details
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {/* Employee */}
              <h3 className="text-lg font-semibold text-apple-charcoal tracking-tight">
                {editingPayrollRow.worker}
              </h3>

              <span className="text-apple-silver">•</span>

              {/* Role */}
              <span className="px-2.5 py-1 rounded-full border border-apple-mist bg-apple-snow text-xs font-medium text-apple-charcoal">
                {ROLE_CODE_TO_NAME[editingPayrollRow.role as RoleCode] ??
                  "Unknown Role"}
              </span>

              <span className="text-apple-silver">•</span>

              {/* Site */}
              <span className="text-sm text-apple-steel">
                {editingPayrollRow.site}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={payroll.closePayrollEditModal}
            className="w-9 h-9 rounded-full border border-apple-silver text-apple-smoke hover:text-apple-charcoal hover:border-apple-charcoal transition flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 sm:px-7 py-5 sm:py-6 space-y-5">
          <div className="rounded-2xl border border-apple-mist  px-4 py-3 text-sm text-apple-charcoal space-y-1">
            <p>
              <span className="font-semibold">Reg Hours</span> = Attendance Days
              x 8 = {payroll.editingPayrollSummary.attendanceDays} x 8 ={" "}
              {formatPayrollNumber(payroll.editingPayrollSummary.regularHours)}
            </p>
            <p>
              <span className="font-semibold">OT Hours</span> = OT Normal + OT
              Special ={" "}
              {toClockHours(payroll.editingPayrollSummary.otNormalHours)} +
              00:00 ={" "}
              {toClockHours(payroll.editingPayrollSummary.otNormalHours)}
            </p>
          </div>

          <div className="rounded-2xl border border-apple-mist bg-white">
            <div className="px-4 py-3 border-b border-apple-mist">
              <p className="text-2xs font-semibold uppercase tracking-widest">
                Source Summary
              </p>
              <p className="text-sm text-apple-smoke mt-1">
                {payroll.editingPayrollLogs.length} attendance log row
                {payroll.editingPayrollLogs.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  label: "Absences (Day)",
                  value: String(payroll.editingPayrollSummary.absenceDays),
                },
                { label: "Leave (Day)", value: "0" },
                { label: "Business Trip (Day)", value: "0" },
                {
                  label: "Attendance (Day)",
                  value: String(payroll.editingPayrollSummary.attendanceDays),
                },
                {
                  label: "OT Normal",
                  value: toClockHours(
                    payroll.editingPayrollSummary.otNormalHours,
                  ),
                },
                { label: "OT Special", value: "00:00" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-apple-mist bg-apple-snow px-3 py-2"
                >
                  <p className="text-2xs font-medium text-apple-steel uppercase tracking-wider">
                    {item.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold font-mono text-apple-charcoal">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-apple-mist bg-white">
            <div className="px-4 py-3 border-b border-apple-mist">
              <p className="text-2xs font-semibold  uppercase tracking-widest">
                Finance Adjustments
              </p>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-apple-steel uppercase tracking-wider">
                  Date
                </span>

                <div className="w-full px-3 h-10 rounded-2xl border border-apple-silver bg-apple-snow text-sm font-semibold text-apple-charcoal flex items-center">
                  {payrollEditDraft.date}
                </div>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-apple-steel uppercase tracking-wider">
                  Hours Worked
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={payrollEditDraft.hoursWorked}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => updateDraft("hoursWorked", e.target.value)}
                  className="w-full font-semibold hover:border-apple-charcoal px-3 h-10 rounded-2xl border border-apple-silver bg-white text-sm text-apple-charcoal focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal transition-all"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-apple-steel uppercase tracking-wider">
                  Rate (Hourly)
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={payrollEditDraft.rate}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => updateDraft("rate", e.target.value)}
                  className="w-full font-semibold hover:border-apple-charcoal px-3 h-10 rounded-2xl border border-apple-silver bg-white text-sm text-apple-charcoal focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal transition-all"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-apple-steel uppercase tracking-wider">
                  Overtime Hours
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={payrollEditDraft.overtimeHours}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => updateDraft("overtimeHours", e.target.value)}
                  className="w-full font-semibold hover:border-apple-charcoal px-3 h-10 rounded-2xl border border-apple-silver bg-white text-sm text-apple-charcoal focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal transition-all"
                />
              </label>
            </div>
          </div>

          {payroll.payrollEditPreview && (
            <div className="rounded-xl border border-apple-mist bg-apple-snow px-3 py-2 text-apple-ash">
              Preview Total Pay:{" "}
              <span className="font-bold text-apple-charcoal">
                {formatPayrollNumber(payroll.payrollEditPreview.totalPay)}
              </span>
            </div>
          )}

          <div className="rounded-2xl border border-apple-mist bg-white">
            <div className="px-4 py-3 border-b border-apple-mist">
              <h4 className="text-sm font-semibold text-apple-charcoal">
                Employee Analytics
              </h4>
              <p className="text-xs text-apple-smoke mt-1">
                Visual insights into the employee&apos;s attendance and work
                patterns.
              </p>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-apple-charcoal mb-2">
                  Daily Hours Worked Trend
                </p>
                <div className="h-[220px]">
                  {payroll.employeeDailyHoursTrend.length === 0 ? (
                    <p className="text-sm text-apple-smoke">
                      No attendance logs yet.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={payroll.employeeDailyHoursTrend}
                        margin={{ top: 8, right: 8, left: -18, bottom: 8 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#F1F5F9"
                        />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#64748B", fontSize: 10 }}
                          minTickGap={12}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#64748B", fontSize: 10 }}
                        />
                        <Tooltip
                          formatter={(value: number) => [
                            formatPayrollNumber(value),
                            "Hours Worked",
                          ]}
                          labelFormatter={(label: string) => `Date: ${label}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="hoursWorked"
                          stroke="#2563EB"
                          strokeWidth={2.2}
                          dot={{ r: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-apple-charcoal mb-2">
                  Attendance Breakdown
                </p>
                <div className="h-[220px]">
                  {payroll.employeeAttendanceBreakdown.every(
                    (item) => item.value === 0,
                  ) ? (
                    <p className="text-sm text-apple-smoke">
                      No attendance distribution yet.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={payroll.employeeAttendanceBreakdown}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={72}
                          paddingAngle={2}
                          isAnimationActive={false}
                        >
                          {payroll.employeeAttendanceBreakdown.map(
                            (entry, index) => (
                              <Cell
                                key={`${entry.name}-${index}`}
                                fill={
                                  EMPLOYEE_ANALYTICS_COLORS[
                                    index % EMPLOYEE_ANALYTICS_COLORS.length
                                  ]
                                }
                              />
                            ),
                          )}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-apple-charcoal mb-2">
                  Clock-in Time Consistency
                </p>
                <div className="h-[220px]">
                  {payroll.employeeClockInConsistency.length === 0 ? (
                    <p className="text-sm text-apple-smoke">
                      No clock-in data yet.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={payroll.employeeClockInConsistency}
                        margin={{ top: 8, right: 8, left: -18, bottom: 8 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#F1F5F9"
                        />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#64748B", fontSize: 10 }}
                          minTickGap={12}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#64748B", fontSize: 10 }}
                          domain={[0, 24]}
                        />
                        <Tooltip
                          formatter={(
                            _value: number,
                            _name: string,
                            item: { payload?: { timeInLabel?: string } },
                          ) => [item.payload?.timeInLabel ?? "-", "Time In"]}
                          labelFormatter={(label: string) => `Date: ${label}`}
                        />
                        <Bar
                          dataKey="timeIn"
                          fill="#10B981"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-apple-mist bg-white overflow-x-auto">
            <div className="px-4 py-3 border-b border-apple-mist">
              <p className="text-2xs font-semibold uppercase tracking-widest">
                All Report Logs
              </p>
            </div>
            <table className="w-full text-sm min-w-[980px]">
              <thead>
                <tr className="border-b border-apple-mist">
                  {[
                    "Date/Week",
                    "Time1 In",
                    "Time1 Out",
                    "Time2 In",
                    "Time2 Out",
                    "OT In",
                    "OT Out",
                    "Hours",
                  ].map((h) => (
                    <th
                      key={h}
                      className={`px-3 py-2.5 text-2xs font-semibold uppercase tracking-widest text-apple-steel ${
                        h === "Hours" ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payroll.editingPayrollLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-5 text-center text-sm text-apple-smoke"
                    >
                      No attendance logs found for this worker.
                    </td>
                  </tr>
                ) : (
                  payroll.editingPayrollLogs.map((log) => (
                    <tr
                      key={`${log.date}-${log.employee}`}
                      className="border-b  border-apple-mist/60 last:border-0 odd:bg-apple-snow/40"
                    >
                      <td className="px-3 py-2.5 text-sm  text-apple-charcoal">
                        {toWeekLabel(log.date)}
                      </td>

                      <td className="px-3 py-2.5 text-sm text-apple-charcoal">
                        {log.time1In ? (
                          log.time1In
                        ) : (
                          <span className="text-red-500 ">Missed</span>
                        )}
                      </td>

                      <td className="px-3 py-2.5 text-sm text-apple-charcoal">
                        {log.time1Out ? (
                          log.time1Out
                        ) : (
                          <span className="text-red-500 ">Missed</span>
                        )}
                      </td>

                      <td className="px-3 py-2.5 text-sm text-apple-charcoal">
                        {log.time2In ? (
                          log.time2In
                        ) : (
                          <span className="text-red-500 ">Missed</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-apple-charcoal">
                        {log.time2Out ? (
                          log.time2Out
                        ) : (
                          <span className="text-red-500 ">Missed</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-apple-charcoal">
                        {log.otIn || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-apple-charcoal">
                        {log.otOut || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          onFocus={(e) => e.currentTarget.select()}
                          value={getHoursValue(log)}
                          onChange={(e) =>
                            payroll.updateLogHour(log, e.target.value)
                          }
                          className="w-20 hover:border-apple-charcoal text-right px-2 py-1 rounded-lg border border-apple-charcoal/40 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-apple-charcoal/20"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-2">
            {/* <p className="text-xs text-apple-steel">
              Saving total hours:{" "}
              <span className="font-semibold text-apple-charcoal">
                {formatPayrollNumber(
                  payroll.hasLogHourOverrides
                    ? payroll.totalEditedLogHours
                    : parseNonNegativeOrFallback(
                        payrollEditDraft.hoursWorked,
                        editingPayrollRow.hoursWorked,
                      ),
                )}
              </span>
            </p> */}
            <div className="invisible"></div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={payroll.closePayrollEditModal}
                className="px-4 h-10 rounded-2xl border border-apple-silver text-sm font-semibold text-apple-ash hover:border-apple-charcoal transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={payroll.savePayrollEdit}
                className="px-4 h-10 rounded-2xl bg-apple-charcoal text-white text-sm font-semibold hover:bg-apple-black transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

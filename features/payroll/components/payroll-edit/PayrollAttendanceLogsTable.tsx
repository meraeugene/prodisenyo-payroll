"use client";

import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";
import type { DailyLogRow } from "@/types";
import {
  extractSiteName,
  formatLogTime,
  formatPayrollNumber,
  toWeekLabel,
} from "@/features/payroll/utils/payrollFormatters";
import { round2 } from "@/features/payroll/utils/payrollEditModalHelpers";
import { buildPayrollLogBiometricBreakdown } from "@/features/payroll/utils/payrollLogHours";
import {
  getPayrollLogStatus,
  getPayrollLogTimeIn,
  getPayrollLogTimeOut,
} from "@/features/payroll/utils/payrollCalculationPresentation";

interface PayrollAttendanceLogsTableProps {
  logs: DailyLogRow[];
  visibleLogs: DailyLogRow[];
  page: number;
  totalPages: number;
  showAllLogs: boolean;
  paidHolidayDates: Set<string>;
  getRegularHours: (log: DailyLogRow) => number;
  getOvertimeHours: (log: DailyLogRow) => number;
  onUpdateHour: (
    log: DailyLogRow,
    field: "regularHours" | "overtimeHours",
    value: string,
  ) => void;
  onPageChange: (page: number) => void;
  onToggleAllLogs: () => void;
}

export function PayrollAttendanceLogsTable(
  props: PayrollAttendanceLogsTableProps,
) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-slate-200 px-3.5">
        <div className="flex items-center gap-2">
          <Clock3 size={16} className="text-emerald-700" />
          <div>
            <h3 className="text-xs font-bold text-slate-950">Attendance Logs</h3>
            <p className="text-[10px] text-slate-400">Biometric time and editable payable hours</p>
          </div>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
          {props.logs.length} record{props.logs.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-xs">
          <thead className="bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
            <tr>
              {[
                "Date",
                "Site",
                "Time In – Out",
                "Worked",
                "Lunch",
                "Regular",
                "OT",
                "Payable",
                "Status",
              ].map((label) => (
                <th key={label} className="px-3 py-2 text-left font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.logs.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500">
                  No attendance logs found.
                </td>
              </tr>
            ) : (
              props.visibleLogs.map((log, index) => {
                const regular = props.getRegularHours(log);
                const overtime = props.getOvertimeHours(log);
                const status = getPayrollLogStatus(
                  regular,
                  overtime,
                  props.paidHolidayDates.has(log.date),
                );
                const biometric = buildPayrollLogBiometricBreakdown(log);
                const timeIn = getPayrollLogTimeIn(log);
                const timeOut = getPayrollLogTimeOut(log);

                return (
                  <tr
                    key={`${log.date}-${log.employee}-${index}`}
                    className="border-t border-slate-100 transition-colors hover:bg-slate-50/70"
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-800">
                      {toWeekLabel(log.date)}
                    </td>
                    <td className="max-w-28 truncate px-3 py-2 text-slate-500">
                      {extractSiteName(log.site) || "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-700">
                      {timeIn ? formatLogTime(timeIn) : "-"}
                      <span className="mx-1.5 text-slate-300">–</span>
                      {timeOut ? formatLogTime(timeOut) : "-"}
                    </td>
                    <td className="px-3 py-2 font-mono font-semibold text-slate-800">
                      {formatPayrollNumber(biometric.workedHours)}
                    </td>
                    <td className="px-3 py-2 font-mono font-semibold text-amber-700">
                      -{formatPayrollNumber(biometric.lunchDeductionHours)}
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        aria-label={`Regular hours for ${log.date}`}
                        type="number"
                        min={0}
                        max={16}
                        step="0.01"
                        value={formatPayrollNumber(regular)}
                        onChange={(event) =>
                          props.onUpdateHour(log, "regularHours", event.target.value)
                        }
                        className="h-7 w-[58px] rounded-md border border-slate-200 bg-white px-1.5 text-right font-mono text-[11px] font-semibold outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        aria-label={`Overtime hours for ${log.date}`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={formatPayrollNumber(overtime)}
                        onChange={(event) =>
                          props.onUpdateHour(log, "overtimeHours", event.target.value)
                        }
                        className="h-7 w-[58px] rounded-md border border-slate-200 bg-white px-1.5 text-right font-mono text-[11px] font-semibold outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                      />
                    </td>
                    <td className="px-3 py-2 font-mono font-bold text-slate-950">
                      {formatPayrollNumber(round2(regular + overtime))}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-[9px] font-bold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3.5 py-2">
        <span className="text-[10px] text-slate-500">
          Showing {props.visibleLogs.length} of {props.logs.length}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous logs page"
            onClick={() => props.onPageChange(Math.max(1, props.page - 1))}
            disabled={props.page === 1 || props.showAllLogs}
            className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-35"
          >
            <ArrowLeft size={13} />
          </button>
          <span className="min-w-11 text-center text-[10px] font-semibold text-slate-600">
            {props.showAllLogs ? "All" : `${props.page}/${props.totalPages}`}
          </span>
          <button
            type="button"
            aria-label="Next logs page"
            onClick={() =>
              props.onPageChange(Math.min(props.totalPages, props.page + 1))
            }
            disabled={props.page === props.totalPages || props.showAllLogs}
            className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-35"
          >
            <ArrowRight size={13} />
          </button>
          <button
            type="button"
            onClick={props.onToggleAllLogs}
            className="h-7 rounded-md border border-slate-200 px-2.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            {props.showAllLogs ? "Paginate" : "View all"}
          </button>
        </div>
      </div>
    </section>
  );
}

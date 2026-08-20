"use client";

import { CalendarDays } from "lucide-react";
import type { CutoffAttendanceDay } from "@/features/payroll/utils/payrollAttendanceEngine";
import { secondsToDecimalHours } from "@/features/payroll/utils/payrollAttendanceEngine";

interface CutoffAttendanceTableProps {
  days: CutoffAttendanceDay[];
  onResolve: (day: CutoffAttendanceDay) => void;
}

const badgeStyles: Record<string, string> = {
  WORKED: "bg-emerald-50 text-emerald-700",
  REGULAR_HOLIDAY: "bg-violet-50 text-violet-700",
  SPECIAL_NON_WORKING_HOLIDAY: "bg-violet-50 text-violet-700",
  REST_DAY: "bg-sky-50 text-sky-700",
  NO_BIOMETRIC: "bg-amber-50 text-amber-700",
  ABSENT: "bg-red-50 text-red-600",
};

export function CutoffAttendanceTable({ days, onResolve }: CutoffAttendanceTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-11 items-center justify-between border-b border-slate-200 px-3.5">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-emerald-700" />
          <div>
            <h3 className="text-xs font-bold text-slate-950">Cutoff Attendance</h3>
            <p className="text-[10px] text-slate-400">Every date in the payroll cutoff</p>
          </div>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">{days.length} dates</span>
      </div>
      <div className="max-h-[440px] overflow-auto">
        <table className="w-full min-w-[760px] text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
            <tr>
              {['Date', 'Time In - Out', 'Raw', 'Classification', 'Regular', 'OT', 'Payable', 'Action'].map((label) => (
                <th key={label} className="px-3 py-2 text-left font-semibold">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.date} className="border-t border-slate-100 hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-800">{day.date}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-[10px] text-slate-600">{day.biometricTimeIn ?? '-'} - {day.biometricTimeOut ?? '-'}</td>
                <td className="px-3 py-2 font-mono">{secondsToDecimalHours(day.biometricWorkedSeconds)}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex rounded-md px-2 py-1 text-[9px] font-bold ${badgeStyles[day.classification] ?? 'bg-slate-100 text-slate-700'}`}>
                    {day.classification.replaceAll('_', ' ')}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono">{secondsToDecimalHours(day.approvedRegularSeconds)}</td>
                <td className="px-3 py-2 font-mono">{secondsToDecimalHours(day.approvedOvertimeSeconds)}</td>
                <td className="px-3 py-2 font-mono font-bold">{secondsToDecimalHours(day.payableSeconds)}</td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => onResolve(day)} className="h-7 rounded-md border border-emerald-200 px-2.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50">
                    {day.needsReview ? 'Resolve' : 'Review'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

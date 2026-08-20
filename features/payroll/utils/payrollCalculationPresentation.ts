import type { DailyLogRow } from "@/types";
import { OVERTIME_ALERT_HOURS, round2 } from "@/features/payroll/utils/payrollEditModalHelpers";
import { FULL_WORKDAY_HOURS } from "@/features/payroll/utils/payrollSelectors";

export interface PayrollLogStatus {
  label: string;
  className: string;
}

export function getPayrollLogStatus(
  regularHours: number,
  overtimeHours: number,
  isPaidHoliday: boolean,
): PayrollLogStatus {
  if (isPaidHoliday) {
    return { label: "Paid holiday", className: "bg-sky-50 text-sky-700" };
  }

  if (round2(regularHours + overtimeHours) >= OVERTIME_ALERT_HOURS) {
    return { label: "Review", className: "bg-rose-50 text-rose-700" };
  }

  if (overtimeHours > 0) {
    return { label: "Overtime", className: "bg-violet-50 text-violet-700" };
  }

  if (regularHours > 0 && regularHours < FULL_WORKDAY_HOURS) {
    return { label: "Under 8h", className: "bg-amber-50 text-amber-700" };
  }

  return { label: "Regular", className: "bg-emerald-50 text-emerald-700" };
}

export function getPayrollLogTimeIn(log: DailyLogRow) {
  return log.time1In || log.time2In || log.otIn;
}

export function getPayrollLogTimeOut(log: DailyLogRow) {
  return log.otOut || log.time2Out || log.time1Out;
}

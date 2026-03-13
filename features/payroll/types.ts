import type { DailyLogRow } from "@/types";

export interface PayrollEditDraft {
  date: string;
  hoursWorked: string;
  rate: string;
  overtimeHours: string;
}

export interface PayrollRowOverride {
  date: string;
  hoursWorked: number;
  overtimeHours: number;
  customRate: number | null;
  logHours?: Record<string, number>;
}

export interface PayrollEditSummary {
  attendanceDays: number;
  absenceDays: number;
  regularHours: number;
  otNormalHours: number;
}

export interface PayrollEmployeeDailyHoursTrend {
  date: string;
  isoDate: string;
  hoursWorked: number;
}

export interface PayrollAttendanceBreakdownItem {
  name: "Attendance" | "Absences" | "Leave" | "Business Trip";
  value: number;
}

export interface PayrollClockInConsistencyItem {
  date: string;
  isoDate: string;
  timeIn: number;
  timeInLabel: string;
}

export type LogHourOverrideMap = Record<string, number>;

export interface PayrollEditContext {
  editingPayrollLogs: DailyLogRow[];
  logHourOverrides: LogHourOverrideMap;
}


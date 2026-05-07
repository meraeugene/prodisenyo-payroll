import type { DailyLogRow } from "@/types";

export interface PayrollEditDraft {
  date: string;
  hoursWorked: string;
  rate: string;
  overtimeHours: string;
}

export interface PayrollCashAdvanceEntry {
  id: string;
  amount: number;
  notes: string;
}

export interface PayrollOvertimeEntry {
  id: string;
  hours: number;
  pay: number;
  notes: string;
  status?: "pending" | "approved" | "rejected";
  requestId?: string | null;
}

export interface PayrollPaidLeaveEntry {
  id: string;
  days: number;
  pay: number;
  notes: string;
}

export interface PayrollAdjustmentSet {
  cashAdvanceEntries: PayrollCashAdvanceEntry[];
  overtimeEntries: PayrollOvertimeEntry[];
  paidLeaveEntries: PayrollPaidLeaveEntry[];
}

export interface PayrollRowOverride {
  date: string;
  hoursWorked: number;
  overtimeHours: number;
  customRate: number | null;
  logHours?: LogHourOverrideMap;
  cashAdvanceEntries?: PayrollCashAdvanceEntry[];
  overtimeEntries?: PayrollOvertimeEntry[];
  paidLeaveEntries?: PayrollPaidLeaveEntry[];
  cashAdvanceTotal?: number;
  overtimeEntriesPayTotal?: number;
  overtimeEntriesHoursTotal?: number;
  paidLeaveEntriesPayTotal?: number;
}

export interface PayrollEditSummary {
  attendanceDays: number;
  absenceDays: number;
  regularHours: number;
  otNormalHours: number;
}

export interface PaidHolidayItem {
  date: string;
  name: string;
  source: "ph" | "manual";
}

export interface PayrollDateRange {
  start: string;
  end: string;
  year: number;
}

export interface LogHourOverride {
  regularHours: number;
  overtimeHours: number;
}

export type LogHourOverrideValue = number | Partial<LogHourOverride>;

export type LogHourOverrideMap = Record<string, LogHourOverride>;

export interface PayrollEditContext {
  editingPayrollLogs: DailyLogRow[];
  logHourOverrides: LogHourOverrideMap;
}


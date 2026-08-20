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

export interface PayrollAllowanceEntry {
  id: string;
  amount: number;
  notes: string;
}

export interface PayrollDeductionEntry {
  id: string;
  sssGsis: number;
  philHealth: number;
  pagIbig: number;
  withholdingTax: number;
  otherDeductions: number;
}

export interface PayrollAdjustmentSet {
  cashAdvanceEntries: PayrollCashAdvanceEntry[];
  overtimeEntries: PayrollOvertimeEntry[];
  paidLeaveEntries: PayrollPaidLeaveEntry[];
  allowanceEntries: PayrollAllowanceEntry[];
  deductionEntries: PayrollDeductionEntry[];
  biometricOvertimeStatus: "approved" | "rejected" | null;
  /** When approved, total biometric OT hours (matches edit modal / all-site logs). */
  biometricOvertimeHours?: number | null;
  attendanceDecisions?: PayrollAttendanceDecisionMap;
  attendanceDays?: PayrollAttendanceDaySnapshot[];
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
  allowanceEntries?: PayrollAllowanceEntry[];
  deductionEntries?: PayrollDeductionEntry[];
  cashAdvanceTotal?: number;
  overtimeEntriesPayTotal?: number;
  overtimeEntriesHoursTotal?: number;
  paidLeaveEntriesPayTotal?: number;
  allowanceEntriesTotal?: number;
  deductionsTotal?: number;
  biometricOvertimeStatus?: "approved" | "rejected" | null;
  biometricOvertimeHours?: number | null;
  attendanceDecisions?: PayrollAttendanceDecisionMap;
  attendanceDays?: PayrollAttendanceDaySnapshot[];
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

export const ATTENDANCE_CLASSIFICATIONS = [
  "WORKED",
  "NO_BIOMETRIC",
  "ABSENT",
  "REST_DAY",
  "REGULAR_HOLIDAY",
  "SPECIAL_NON_WORKING_HOLIDAY",
  "PAID_LEAVE",
  "UNPAID_LEAVE",
  "OFFICIAL_BUSINESS",
  "MANUAL_ATTENDANCE",
  "FORGOT_TO_LOG",
  "COMPANY_PAID_DAY",
] as const;

export type AttendanceClassification =
  (typeof ATTENDANCE_CLASSIFICATIONS)[number];

export type AttendanceDecisionSource =
  | "biometric"
  | "schedule"
  | "holiday"
  | "leave"
  | "manual"
  | "system";

export interface PayrollAttendanceDecision {
  date: string;
  classification: AttendanceClassification;
  approvedRegularSeconds: number;
  approvedOvertimeSeconds: number;
  overtimeStatus: "pending" | "approved" | "rejected";
  reason: string;
  notes?: string;
  source: AttendanceDecisionSource;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

export type PayrollAttendanceDecisionMap = Record<
  string,
  PayrollAttendanceDecision
>;

export interface PayrollAttendanceDaySnapshot {
  date: string;
  dayOfWeek: number;
  isScheduledWorkday: boolean | null;
  biometricTimeIn: string | null;
  biometricTimeOut: string | null;
  biometricWorkedSeconds: number;
  breakSeconds: number;
  calculatedRegularSeconds: number;
  detectedOvertimeSeconds: number;
  classification: AttendanceClassification;
  approvedRegularSeconds: number;
  approvedOvertimeSeconds: number;
  payableSeconds: number;
  overtimeStatus: "pending" | "approved" | "rejected";
  source: AttendanceDecisionSource;
  isManualOverride: boolean;
  overrideReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  needsReview: boolean;
}


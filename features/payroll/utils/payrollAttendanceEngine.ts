import type {
  AttendanceClassification,
  AttendanceDecisionSource,
  PayrollAttendanceDecisionMap,
} from "@/features/payroll/types";

const SECONDS_PER_HOUR = 3600;
const MONEY_SCALE = 100;
const MULTIPLIER_SCALE = 10_000;

export interface CutoffBiometricDay {
  date: string;
  timeIn?: string | null;
  timeOut?: string | null;
  rawWorkedSeconds: number;
  breakSeconds: number;
  calculatedRegularSeconds: number;
  detectedOvertimeSeconds: number;
}

export interface EmployeeScheduleDay {
  dayOfWeek: number;
  isWorkday: boolean;
  standardSeconds: number;
  breakSeconds: number;
}

export interface PayrollHolidayRule {
  date: string;
  classification:
    | "REGULAR_HOLIDAY"
    | "SPECIAL_NON_WORKING_HOLIDAY";
  payableSeconds: number;
}

export interface PayrollLeaveRule {
  date: string;
  classification: "PAID_LEAVE" | "UNPAID_LEAVE";
  payableSeconds: number;
}

export interface CutoffAttendanceDay {
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

export interface BuildCutoffAttendanceInput {
  periodStart: string;
  periodEnd: string;
  biometricDays?: CutoffBiometricDay[];
  schedule?: EmployeeScheduleDay[];
  holidays?: PayrollHolidayRule[];
  leaves?: PayrollLeaveRule[];
  decisions?: PayrollAttendanceDecisionMap;
}

export interface PayrollMoneyAdjustment {
  category: "allowance" | "cash_advance" | "deduction" | "other_earning";
  amountCentavos: number;
}

export interface PayrollBreakdown {
  regularSeconds: number;
  holidaySeconds: number;
  overtimeSeconds: number;
  regularPayCentavos: number;
  holidayPayCentavos: number;
  overtimePayCentavos: number;
  allowanceCentavos: number;
  otherEarningsCentavos: number;
  grossPayCentavos: number;
  cashAdvanceCentavos: number;
  deductionsCentavos: number;
  netPayCentavos: number;
}

export interface CalculateReviewedPayrollInput {
  days: CutoffAttendanceDay[];
  dailyRateCentavos: number;
  standardDaySeconds: number;
  overtimeMultiplierBasisPoints?: number;
  regularHolidayMultiplierBasisPoints?: number;
  specialHolidayMultiplierBasisPoints?: number;
  adjustments?: PayrollMoneyAdjustment[];
}

export interface PayrollException {
  date: string | null;
  code:
    | "NO_BIOMETRIC"
    | "PENDING_OVERTIME"
    | "MISSING_SCHEDULE"
    | "MISSING_RATE";
  message: string;
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid ISO date: ${value}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function nonNegativeInteger(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

export function decimalHoursToSeconds(hours: number) {
  return nonNegativeInteger(hours * SECONDS_PER_HOUR);
}

export function secondsToDecimalHours(seconds: number, decimals = 2) {
  const scale = 10 ** decimals;
  return Math.round((nonNegativeInteger(seconds) / SECONDS_PER_HOUR) * scale) / scale;
}

export function formatDurationSeconds(seconds: number) {
  const totalMinutes = Math.round(nonNegativeInteger(seconds) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function roundMoneyCentavos(pesos: number) {
  return Math.round((Number.isFinite(pesos) ? pesos : 0) * MONEY_SCALE);
}

function payForSeconds(
  seconds: number,
  dailyRateCentavos: number,
  standardDaySeconds: number,
  multiplierBasisPoints = MULTIPLIER_SCALE,
) {
  if (standardDaySeconds <= 0 || dailyRateCentavos <= 0) return 0;
  return Math.round(
    (nonNegativeInteger(seconds) * nonNegativeInteger(dailyRateCentavos) * multiplierBasisPoints) /
      standardDaySeconds /
      MULTIPLIER_SCALE,
  );
}

export function buildCutoffAttendance(
  input: BuildCutoffAttendanceInput,
): CutoffAttendanceDay[] {
  const start = parseIsoDate(input.periodStart);
  const end = parseIsoDate(input.periodEnd);
  if (end < start) throw new Error("Payroll cutoff end precedes its start.");

  const biometricByDate = new Map((input.biometricDays ?? []).map((day) => [day.date, day]));
  const scheduleByDay = new Map((input.schedule ?? []).map((day) => [day.dayOfWeek, day]));
  const holidayByDate = new Map((input.holidays ?? []).map((day) => [day.date, day]));
  const leaveByDate = new Map((input.leaves ?? []).map((day) => [day.date, day]));
  const decisions = input.decisions ?? {};
  const rows: CutoffAttendanceDay[] = [];

  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = toIsoDate(cursor);
    const dayOfWeek = cursor.getUTCDay();
    const schedule = scheduleByDay.get(dayOfWeek);
    const biometric = biometricByDate.get(date);
    const holiday = holidayByDate.get(date);
    const leave = leaveByDate.get(date);
    const decision = decisions[date];

    let classification: AttendanceClassification = "NO_BIOMETRIC";
    let approvedRegularSeconds = 0;
    let source: AttendanceDecisionSource = "system";

    if (schedule && !schedule.isWorkday) {
      classification = "REST_DAY";
      source = "schedule";
    } else if (holiday) {
      classification = holiday.classification;
      approvedRegularSeconds = nonNegativeInteger(holiday.payableSeconds);
      source = "holiday";
    } else if (leave) {
      classification = leave.classification;
      approvedRegularSeconds =
        leave.classification === "PAID_LEAVE"
          ? nonNegativeInteger(leave.payableSeconds)
          : 0;
      source = "leave";
    } else if (biometric && biometric.rawWorkedSeconds > 0) {
      classification = "WORKED";
      approvedRegularSeconds = nonNegativeInteger(biometric.calculatedRegularSeconds);
      source = "biometric";
    }

    if (decision) {
      classification = decision.classification;
      approvedRegularSeconds = nonNegativeInteger(decision.approvedRegularSeconds);
      source = decision.source;
    }

    const detectedOvertimeSeconds = nonNegativeInteger(
      biometric?.detectedOvertimeSeconds ?? 0,
    );
    const overtimeStatus = decision?.overtimeStatus ?? "pending";
    const approvedOvertimeSeconds =
      overtimeStatus === "approved"
        ? nonNegativeInteger(decision?.approvedOvertimeSeconds ?? 0)
        : 0;
    const needsReview =
      classification === "NO_BIOMETRIC" ||
      (detectedOvertimeSeconds > 0 && !decision);

    rows.push({
      date,
      dayOfWeek,
      isScheduledWorkday: schedule ? schedule.isWorkday : null,
      biometricTimeIn: biometric?.timeIn ?? null,
      biometricTimeOut: biometric?.timeOut ?? null,
      biometricWorkedSeconds: nonNegativeInteger(biometric?.rawWorkedSeconds ?? 0),
      breakSeconds: nonNegativeInteger(biometric?.breakSeconds ?? schedule?.breakSeconds ?? 0),
      calculatedRegularSeconds: nonNegativeInteger(
        biometric?.calculatedRegularSeconds ?? 0,
      ),
      detectedOvertimeSeconds,
      classification,
      approvedRegularSeconds,
      approvedOvertimeSeconds,
      payableSeconds: approvedRegularSeconds + approvedOvertimeSeconds,
      overtimeStatus,
      source,
      isManualOverride: Boolean(decision),
      overrideReason: decision?.reason || null,
      reviewedBy: decision?.reviewedBy ?? null,
      reviewedAt: decision?.reviewedAt ?? null,
      needsReview,
    });
  }

  return rows;
}

export function validateAttendanceDecision(
  classification: AttendanceClassification,
  approvedRegularSeconds: number,
  reason: string,
) {
  const requiresReason = [
    "MANUAL_ATTENDANCE",
    "FORGOT_TO_LOG",
    "COMPANY_PAID_DAY",
    "OFFICIAL_BUSINESS",
  ].includes(classification);
  if (requiresReason && !reason.trim()) {
    throw new Error("A reason is required for manual attendance overrides.");
  }
  if (approvedRegularSeconds < 0) {
    throw new Error("Approved payable time cannot be negative.");
  }
}

export function collectPayrollExceptions(
  days: CutoffAttendanceDay[],
  dailyRateCentavos: number,
): PayrollException[] {
  const exceptions: PayrollException[] = [];
  if (dailyRateCentavos <= 0) {
    exceptions.push({ date: null, code: "MISSING_RATE", message: "Employee rate is missing." });
  }
  if (days.some((day) => day.isScheduledWorkday === null)) {
    exceptions.push({ date: null, code: "MISSING_SCHEDULE", message: "Employee schedule is missing." });
  }
  for (const day of days) {
    if (day.classification === "NO_BIOMETRIC") {
      exceptions.push({ date: day.date, code: "NO_BIOMETRIC", message: "Resolve attendance classification." });
    }
    if (day.detectedOvertimeSeconds > 0 && day.overtimeStatus === "pending") {
      exceptions.push({ date: day.date, code: "PENDING_OVERTIME", message: "Confirm or exclude detected overtime." });
    }
  }
  return exceptions;
}

export function calculateReviewedPayroll(
  input: CalculateReviewedPayrollInput,
): PayrollBreakdown {
  const regularHolidayMultiplier = input.regularHolidayMultiplierBasisPoints ?? MULTIPLIER_SCALE;
  const specialHolidayMultiplier = input.specialHolidayMultiplierBasisPoints ?? MULTIPLIER_SCALE;
  let regularSeconds = 0;
  let regularHolidaySeconds = 0;
  let specialHolidaySeconds = 0;
  let overtimeSeconds = 0;

  for (const day of input.days) {
    if (day.classification === "REGULAR_HOLIDAY") {
      regularHolidaySeconds += day.approvedRegularSeconds;
    } else if (day.classification === "SPECIAL_NON_WORKING_HOLIDAY") {
      specialHolidaySeconds += day.approvedRegularSeconds;
    } else {
      regularSeconds += day.approvedRegularSeconds;
    }
    overtimeSeconds += day.approvedOvertimeSeconds;
  }

  const regularPayCentavos = payForSeconds(
    regularSeconds,
    input.dailyRateCentavos,
    input.standardDaySeconds,
  );
  const regularHolidayPayCentavos = payForSeconds(
    regularHolidaySeconds,
    input.dailyRateCentavos,
    input.standardDaySeconds,
    regularHolidayMultiplier,
  );
  const specialHolidayPayCentavos = payForSeconds(
    specialHolidaySeconds,
    input.dailyRateCentavos,
    input.standardDaySeconds,
    specialHolidayMultiplier,
  );
  const overtimePayCentavos = payForSeconds(
    overtimeSeconds,
    input.dailyRateCentavos,
    input.standardDaySeconds,
    input.overtimeMultiplierBasisPoints ?? 12_500,
  );
  const allowanceCentavos = (input.adjustments ?? [])
    .filter((item) => item.category === "allowance")
    .reduce((sum, item) => sum + nonNegativeInteger(item.amountCentavos), 0);
  const otherEarningsCentavos = (input.adjustments ?? [])
    .filter((item) => item.category === "other_earning")
    .reduce((sum, item) => sum + nonNegativeInteger(item.amountCentavos), 0);
  const cashAdvanceCentavos = (input.adjustments ?? [])
    .filter((item) => item.category === "cash_advance")
    .reduce((sum, item) => sum + nonNegativeInteger(item.amountCentavos), 0);
  const deductionsCentavos = (input.adjustments ?? [])
    .filter((item) => item.category === "deduction")
    .reduce((sum, item) => sum + nonNegativeInteger(item.amountCentavos), 0);
  const holidayPayCentavos = regularHolidayPayCentavos + specialHolidayPayCentavos;
  const grossPayCentavos =
    regularPayCentavos +
    holidayPayCentavos +
    overtimePayCentavos +
    allowanceCentavos +
    otherEarningsCentavos;

  return {
    regularSeconds,
    holidaySeconds: regularHolidaySeconds + specialHolidaySeconds,
    overtimeSeconds,
    regularPayCentavos,
    holidayPayCentavos,
    overtimePayCentavos,
    allowanceCentavos,
    otherEarningsCentavos,
    grossPayCentavos,
    cashAdvanceCentavos,
    deductionsCentavos,
    netPayCentavos: grossPayCentavos - cashAdvanceCentavos - deductionsCentavos,
  };
}

export function assertPayrollMutable(status: "draft" | "submitted" | "approved" | "rejected") {
  if (status === "approved") {
    throw new Error("Approved payroll is locked. Reopen it with a recorded reason before editing.");
  }
}

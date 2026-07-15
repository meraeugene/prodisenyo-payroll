import type { DailyLogRow } from "@/types";
import { calculateDailyWorkMinutes } from "@/lib/utils";

export interface PayrollLogBiometricBreakdown {
  workedHours: number;
  lunchDeductionHours: number;
}

const LEGACY_HOUR_TOLERANCE = 0.011;

function roundHours(value: number) {
  return Math.round(value * 100) / 100;
}

export function buildPayrollLogBiometricBreakdown(
  log: DailyLogRow,
): PayrollLogBiometricBreakdown {
  const minutes = calculateDailyWorkMinutes(log);
  const hasLunchMetadata = Number.isFinite(minutes.lunchDeductionMinutes);
  const rawRegularMinutes = Number.isFinite(minutes.rawRegularMinutes)
    ? minutes.rawRegularMinutes
    : minutes.regularMinutes;
  const lunchDeductionMinutes = hasLunchMetadata
    ? minutes.lunchDeductionMinutes
    : Math.min(Math.max(rawRegularMinutes, 0), 60);
  const workedMinutes = hasLunchMetadata
    ? minutes.totalMinutes + lunchDeductionMinutes
    : rawRegularMinutes + minutes.overtimeMinutes;

  return {
    workedHours: roundHours(workedMinutes / 60),
    lunchDeductionHours: roundHours(lunchDeductionMinutes / 60),
  };
}

export function normalizeLegacyRawRegularHours(
  log: DailyLogRow,
  regularHours: number,
): number {
  const minutes = calculateDailyWorkMinutes(log);
  const rawHours = minutes.rawRegularMinutes / 60;
  const payableRegularHours = minutes.regularMinutes / 60;
  const matchesLegacyRawHours =
    Number.isFinite(regularHours) &&
    Math.abs(regularHours - rawHours) < LEGACY_HOUR_TOLERANCE &&
    Math.abs(rawHours - payableRegularHours) >= LEGACY_HOUR_TOLERANCE;

  return matchesLegacyRawHours ? payableRegularHours : regularHours;
}

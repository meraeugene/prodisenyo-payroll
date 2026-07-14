export interface EmployeeBranchRateConfig {
  dailyRate: number;
  regularPaidHours: number;
}

export const DEFAULT_REGULAR_PAID_HOURS = 8;
export const UNPAID_BREAK_HOURS_PER_WORKDAY = 1;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeRegularPaidHours(value: number | null | undefined): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return DEFAULT_REGULAR_PAID_HOURS;
  }

  return round2(numericValue);
}

export function capRegularWorkedHours(
  workedHours: number | null | undefined,
  regularPaidHours: number | null | undefined,
): number {
  const numericWorkedHours = Number(workedHours);
  if (!Number.isFinite(numericWorkedHours) || numericWorkedHours <= 0) {
    return 0;
  }

  return round2(
    Math.min(numericWorkedHours, normalizeRegularPaidHours(regularPaidHours)),
  );
}

export function calculatePaidRegularHours(
  actualRegularHours: number | null | undefined,
  regularPaidHours: number | null | undefined,
): number {
  const numericActualHours = Number(actualRegularHours);
  if (!Number.isFinite(numericActualHours) || numericActualHours <= 0) {
    return 0;
  }

  return capRegularWorkedHours(
    Math.max(0, numericActualHours - UNPAID_BREAK_HOURS_PER_WORKDAY),
    regularPaidHours,
  );
}

export function normalizeEmployeeBranchRateConfig(
  config:
    | {
        dailyRate?: number | null;
        regularPaidHours?: number | null;
      }
    | null
    | undefined,
  fallbackDailyRate: number,
): EmployeeBranchRateConfig {
  const dailyRate = Number(config?.dailyRate);

  return {
    dailyRate:
      Number.isFinite(dailyRate) && dailyRate >= 0
        ? round2(dailyRate)
        : round2(fallbackDailyRate),
    regularPaidHours: normalizeRegularPaidHours(config?.regularPaidHours),
  };
}

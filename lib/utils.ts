import { Step2Sort } from "@/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesSearchText(value: string, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const normalizedValue = normalizeSearchText(value);
  const compactValue = normalizedValue.replace(/\s+/g, "");
  const compactQuery = normalizedQuery.replace(/\s+/g, "");

  return (
    normalizedValue.includes(normalizedQuery) ||
    compactValue.includes(compactQuery)
  );
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
  if (h < 0 || h > 23 || m < 0 || m > 59) return -1;
  return h * 60 + m;
}

const REGULAR_TIMEOUT_OT_IN_FALLBACK_START_MINUTES = 17 * 60 + 30;
const EVENING_OVERTIME_START_MINUTES = 18 * 60;
const END_OF_DAY_MINUTES = 24 * 60;
const MISFILED_TIME1_OUT_IN_START_MINUTES = 10 * 60;
const MISFILED_TIME1_OUT_IN_END_MINUTES = 12 * 60 + 59;

interface DailyWorkTimeFields {
  time1In?: string | null;
  time1Out?: string | null;
  time2In?: string | null;
  time2Out?: string | null;
  otIn?: string | null;
  otOut?: string | null;
}

function earlierTime(current: string, incoming: string): string {
  if (!current) return incoming;
  return timeToMinutes(incoming) < timeToMinutes(current) ? incoming : current;
}

function laterTime(current: string, incoming: string): string {
  if (!current) return incoming;
  return timeToMinutes(incoming) > timeToMinutes(current) ? incoming : current;
}

function pairMinutes(inTime: string, outTime: string): number {
  if (!inTime || !outTime) return 0;
  const inMinutes = timeToMinutes(inTime);
  const outMinutes = timeToMinutes(outTime);
  if (outMinutes >= inMinutes) return outMinutes - inMinutes;
  return outMinutes + 24 * 60 - inMinutes;
}

function boundedForwardPairMinutes(inTime: string, outTime: string): number {
  if (!inTime || !outTime) return 0;
  const inMinutes = timeToMinutes(inTime);
  const outMinutes = timeToMinutes(outTime);
  if (
    !Number.isFinite(inMinutes) ||
    !Number.isFinite(outMinutes) ||
    inMinutes < 0 ||
    outMinutes < 0 ||
    outMinutes <= inMinutes
  ) {
    return 0;
  }

  const minutes = outMinutes - inMinutes;
  return minutes <= 16 * 60 ? minutes : 0;
}

function normalizeBiometricDailyTimes(times: DailyWorkTimeFields): {
  time1In: string;
  time1Out: string;
  time2In: string;
  time2Out: string;
  otIn: string;
  otOut: string;
} {
  const normalized = {
    time1In: times.time1In ?? "",
    time1Out: times.time1Out ?? "",
    time2In: times.time2In ?? "",
    time2Out: times.time2Out ?? "",
    otIn: times.otIn ?? "",
    otOut: times.otOut ?? "",
  };

  const time1OutMinutes = timeToMinutes(normalized.time1Out);
  const time2OutMinutes = timeToMinutes(normalized.time2Out);
  const time1OutLooksLikeLateMorningIn =
    time1OutMinutes >= MISFILED_TIME1_OUT_IN_START_MINUTES &&
    time1OutMinutes <= MISFILED_TIME1_OUT_IN_END_MINUTES;

  if (
    !normalized.time1In &&
    !normalized.time2In &&
    normalized.time1Out &&
    normalized.time2Out &&
    time1OutLooksLikeLateMorningIn &&
    time2OutMinutes > time1OutMinutes
  ) {
    normalized.time1In = normalized.time1Out;
    normalized.time1Out = "";
  }

  return normalized;
}

function earliestValidMinutes(...times: string[]): number | null {
  const values = times
    .map((time) => timeToMinutes(time))
    .filter((minutes) => minutes >= 0);
  if (values.length === 0) return null;
  return Math.min(...values);
}

function latestValidMinutes(...times: string[]): number | null {
  const values = times
    .map((time) => timeToMinutes(time))
    .filter((minutes) => minutes >= 0);
  if (values.length === 0) return null;
  return Math.max(...values);
}

function resolveRegularOutMinutes(
  time1Out: string,
  time2Out: string,
  otIn: string,
): number | null {
  const regularOutMinutes = latestValidMinutes(time1Out, time2Out);
  if (regularOutMinutes !== null) return regularOutMinutes;

  const otInMinutes = timeToMinutes(otIn);
  if (otInMinutes < REGULAR_TIMEOUT_OT_IN_FALLBACK_START_MINUTES) {
    return null;
  }

  return otInMinutes;
}

function calculateRegularSpanMinutes(times: {
  time1In: string;
  time1Out: string;
  time2In: string;
  time2Out: string;
  otIn: string;
}): number {
  const regularInMinutes = earliestValidMinutes(times.time1In, times.time2In);
  const regularOutMinutes = resolveRegularOutMinutes(
    times.time1Out,
    times.time2Out,
    times.otIn,
  );

  if (regularInMinutes === null || regularOutMinutes === null) return 0;

  const regularSpanMinutes = regularOutMinutes - regularInMinutes;
  if (regularSpanMinutes <= 0 || regularSpanMinutes > 16 * 60) return 0;

  return regularSpanMinutes;
}

function calculateDailyWorkMinutes(times: {
  time1In?: string | null;
  time1Out?: string | null;
  time2In?: string | null;
  time2Out?: string | null;
  otIn?: string | null;
  otOut?: string | null;
}): { regularMinutes: number; overtimeMinutes: number; totalMinutes: number } {
  const { time1In, time1Out, time2In, time2Out, otIn, otOut } =
    normalizeBiometricDailyTimes(times);

  const regularMinutes = calculateRegularSpanMinutes({
    time1In,
    time1Out,
    time2In,
    time2Out,
    otIn,
  });
  const overtimeMinutes = boundedForwardPairMinutes(otIn, otOut);

  return {
    regularMinutes,
    overtimeMinutes,
    totalMinutes: regularMinutes + overtimeMinutes,
  };
}

function computeSameDayOvertimeMinutes(inTime: string, outTime: string): number {
  if (!inTime) return 0;

  const inMinutes = timeToMinutes(inTime);
  const outMinutes = outTime ? timeToMinutes(outTime) : -1;
  if (!Number.isFinite(inMinutes) || inMinutes < 0) return 0;

  const effectiveStart = Math.max(inMinutes, EVENING_OVERTIME_START_MINUTES);
  if (effectiveStart >= END_OF_DAY_MINUTES) return 0;

  if (!outTime || !Number.isFinite(outMinutes) || outMinutes < 0 || outMinutes <= inMinutes) {
    return END_OF_DAY_MINUTES - effectiveStart;
  }

  const effectiveEnd = Math.min(outMinutes, END_OF_DAY_MINUTES);
  return Math.max(0, effectiveEnd - effectiveStart);
}

function computeNextDayCarryMinutes(inTime: string, outTime: string): number {
  if (!inTime || !outTime) return 0;

  const inMinutes = timeToMinutes(inTime);
  const outMinutes = timeToMinutes(outTime);
  if (
    !Number.isFinite(inMinutes) ||
    !Number.isFinite(outMinutes) ||
    inMinutes < 0 ||
    outMinutes < 0
  ) {
    return 0;
  }

  if (outMinutes > inMinutes) return 0;
  return outMinutes;
}

function earliestNonEmptyTime(...times: string[]): string {
  const valid = times.filter(Boolean);
  if (valid.length === 0) return "";
  return valid.reduce((earliest, current) =>
    timeToMinutes(current) < timeToMinutes(earliest) ? current : earliest,
  );
}

function latestNonEmptyTime(...times: string[]): string {
  const valid = times.filter(Boolean);
  if (valid.length === 0) return "";
  return valid.reduce((latest, current) =>
    timeToMinutes(current) > timeToMinutes(latest) ? current : latest,
  );
}

function compareStep2Rows(
  aDate: string,
  aName: string,
  bDate: string,
  bName: string,
  sortMode: Step2Sort,
): number {
  if (sortMode === "date-asc") {
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    return aName.localeCompare(bName);
  }
  if (sortMode === "date-desc") {
    if (aDate !== bDate) return bDate.localeCompare(aDate);
    return aName.localeCompare(bName);
  }
  if (sortMode === "name-asc") {
    if (aName !== bName) return aName.localeCompare(bName);
    return aDate.localeCompare(bDate);
  }
  if (aName !== bName) return bName.localeCompare(aName);
  return aDate.localeCompare(bDate);
}

export {
  earlierTime,
  laterTime,
  pairMinutes,
  calculateDailyWorkMinutes,
  normalizeBiometricDailyTimes,
  computeSameDayOvertimeMinutes,
  computeNextDayCarryMinutes,
  earliestNonEmptyTime,
  latestNonEmptyTime,
  compareStep2Rows,
  normalizeSearchText,
  matchesSearchText,
};

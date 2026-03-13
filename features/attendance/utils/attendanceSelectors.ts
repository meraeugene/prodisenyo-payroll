import type { AttendanceRecord, DailyLogRow, Step2Sort } from "@/types";
import {
  compareStep2Rows,
  earlierTime,
  earliestNonEmptyTime,
  laterTime,
  latestNonEmptyTime,
  pairMinutes,
} from "@/lib/utils";

export interface AttendanceFilters {
  siteFilter: string;
  nameFilter: string;
  dateFilter: string;
  sort: Step2Sort;
}

export interface BranchSummary {
  siteName: string;
  employeeCount: number;
}

export function inferMinutesFromPunches(times: string[]): number {
  const punches = times.filter(Boolean);
  if (punches.length < 2) return 0;

  let best = 0;
  const maxShiftMinutes = 16 * 60;

  for (let i = 0; i < punches.length; i += 1) {
    for (let j = 0; j < punches.length; j += 1) {
      if (i === j) continue;
      const diff = pairMinutes(punches[i], punches[j]);
      if (diff > best && diff <= maxShiftMinutes) {
        best = diff;
      }
    }
  }

  return best;
}

export function buildDailyRows(records: AttendanceRecord[]): DailyLogRow[] {
  const grouped = new Map<string, DailyLogRow>();

  for (const record of records) {
    const key = `${record.date}|||${record.employee.trim().toLowerCase()}`;
    const current = grouped.get(key) ?? {
      date: record.date,
      employee: record.employee,
      time1In: "",
      time1Out: "",
      time2In: "",
      time2Out: "",
      otIn: "",
      otOut: "",
      hours: 0,
      site: record.site,
    };

    if (!current.site && record.site) current.site = record.site;

    if (record.source === "Time1" && record.type === "IN") {
      current.time1In = earlierTime(current.time1In, record.logTime);
    } else if (record.source === "Time1" && record.type === "OUT") {
      current.time1Out = laterTime(current.time1Out, record.logTime);
    } else if (record.source === "Time2" && record.type === "IN") {
      current.time2In = earlierTime(current.time2In, record.logTime);
    } else if (record.source === "Time2" && record.type === "OUT") {
      current.time2Out = laterTime(current.time2Out, record.logTime);
    } else if (record.source === "OT" && record.type === "IN") {
      current.otIn = earlierTime(current.otIn, record.logTime);
    } else if (record.source === "OT" && record.type === "OUT") {
      current.otOut = laterTime(current.otOut, record.logTime);
    }

    grouped.set(key, current);
  }

  return Array.from(grouped.values()).map((row) => {
    const regularIn = earliestNonEmptyTime(row.time1In, row.time2In);
    const regularOut = latestNonEmptyTime(row.time1Out, row.time2Out);

    // Some exports place late end-of-day punches in OT In/Out instead of regular Out.
    const otAsRegularOut = !regularOut
      ? latestNonEmptyTime(row.otOut, row.otIn)
      : "";
    const effectiveRegularOut = regularOut || otAsRegularOut;
    const regularMinutes = pairMinutes(regularIn, effectiveRegularOut);

    const usedOtAsRegularBoundary =
      !regularOut && Boolean(otAsRegularOut) && Boolean(regularIn);
    const otMinutes =
      row.otIn && row.otOut && !usedOtAsRegularBoundary
        ? pairMinutes(row.otIn, row.otOut)
        : 0;

    const strictMinutes = regularMinutes + otMinutes;
    const inferredMinutes =
      strictMinutes === 0
        ? inferMinutesFromPunches([
            row.time1In,
            row.time1Out,
            row.time2In,
            row.time2Out,
            row.otIn,
            row.otOut,
          ])
        : 0;

    const minutes = strictMinutes || inferredMinutes;

    return {
      ...row,
      hours: Math.round((minutes / 60) * 100) / 100,
    };
  });
}

export function selectAvailableSites(records: AttendanceRecord[]): string[] {
  return Array.from(
    new Set(
      records
        .map((record) => record.site.trim())
        .filter((value) => value.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

export function filterDetailedRecords(
  records: AttendanceRecord[],
  filters: AttendanceFilters,
): AttendanceRecord[] {
  const nameFilter = filters.nameFilter.trim().toLowerCase();
  const dateFilter = filters.dateFilter.trim();

  const filtered = records.filter((record) => {
    if (filters.siteFilter !== "ALL" && record.site !== filters.siteFilter)
      return false;
    if (dateFilter && record.date !== dateFilter) return false;
    if (nameFilter && !record.employee.toLowerCase().includes(nameFilter))
      return false;
    return true;
  });

  filtered.sort((a, b) => {
    const byPrimary = compareStep2Rows(
      a.date,
      a.employee,
      b.date,
      b.employee,
      filters.sort,
    );
    if (byPrimary !== 0) return byPrimary;
    if (a.logTime !== b.logTime) return a.logTime.localeCompare(b.logTime);
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.source.localeCompare(b.source);
  });

  return filtered;
}

export function filterDailyRows(
  dailyRows: DailyLogRow[],
  filters: AttendanceFilters,
): DailyLogRow[] {
  const nameFilter = filters.nameFilter.trim().toLowerCase();
  const dateFilter = filters.dateFilter.trim();

  const filtered = dailyRows.filter((row) => {
    if (filters.siteFilter !== "ALL" && row.site !== filters.siteFilter)
      return false;
    if (dateFilter && row.date !== dateFilter) return false;
    if (nameFilter && !row.employee.toLowerCase().includes(nameFilter))
      return false;
    return true;
  });

  filtered.sort((a, b) =>
    compareStep2Rows(a.date, a.employee, b.date, b.employee, filters.sort),
  );

  return filtered;
}

export function selectBranchSummaries(
  records: AttendanceRecord[],
): BranchSummary[] {
  const map = new Map<string, Set<string>>();

  for (const record of records) {
    const siteKey = record.site?.trim().toUpperCase().split(" ")[0];
    if (!siteKey) continue;
    if (!map.has(siteKey)) {
      map.set(siteKey, new Set<string>());
    }
    map.get(siteKey)?.add(record.employee.trim());
  }

  return Array.from(map.entries())
    .map(([siteName, employeesSet]) => ({
      siteName,
      employeeCount: employeesSet.size,
    }))
    .sort((a, b) => a.siteName.localeCompare(b.siteName));
}


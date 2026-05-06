import type { AttendanceRecord, DailyLogRow, Step2Sort } from "@/types";
import {
  calculateDailyWorkMinutes,
  compareStep2Rows,
  earlierTime,
  laterTime,
  matchesSearchText,
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

const MAX_SHIFT_MINUTES = 16 * 60;

function toMinutes(time: string): number {
  const [hourText, minuteText] = time.split(":");
  const hours = Number(hourText);
  const minutes = Number(minuteText);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return -1;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return -1;
  return hours * 60 + minutes;
}

function forwardPairMinutes(inTime: string, outTime: string): number {
  if (!inTime || !outTime) return 0;
  const inMinutes = toMinutes(inTime);
  const outMinutes = toMinutes(outTime);
  if (inMinutes < 0 || outMinutes < 0) return 0;
  if (outMinutes <= inMinutes) return 0;
  return outMinutes - inMinutes;
}

export function inferMinutesFromPunches(times: string[]): number {
  const punches = times.filter(Boolean);
  if (punches.length < 2) return 0;

  let best = 0;

  for (let i = 0; i < punches.length; i += 1) {
    for (let j = 0; j < punches.length; j += 1) {
      if (i === j) continue;
      const diff = forwardPairMinutes(punches[i], punches[j]);
      if (diff > best && diff <= MAX_SHIFT_MINUTES) {
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
      regularHours: 0,
      overtimeHours: 0,
      totalHours: 0,
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
    const dailyMinutes = calculateDailyWorkMinutes(row);
    const strictMinutes = dailyMinutes.totalMinutes;
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
    const totalHours = Math.round((minutes / 60) * 100) / 100;

    return {
      ...row,
      regularHours: Math.round((dailyMinutes.regularMinutes / 60) * 100) / 100,
      overtimeHours:
        Math.round((dailyMinutes.overtimeMinutes / 60) * 100) / 100,
      totalHours,
      hours: totalHours,
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
    if (filters.siteFilter !== "ALL" && record.site !== filters.siteFilter) {
      return false;
    }
    if (dateFilter && record.date !== dateFilter) return false;
    if (nameFilter && !matchesSearchText(record.employee, nameFilter)) {
      return false;
    }
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
    if (filters.siteFilter !== "ALL" && row.site !== filters.siteFilter) {
      return false;
    }
    if (dateFilter && row.date !== dateFilter) return false;
    if (nameFilter && !matchesSearchText(row.employee, nameFilter)) {
      return false;
    }
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

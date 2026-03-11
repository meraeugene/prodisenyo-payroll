import { extractSiteFromFilename, parseWorkerLabel } from "@/app/lib/workers";
import type { AttendanceRecord, Employee, LogSource, WorkerRole } from "@/types";

export interface ParseResult {
  employees: Employee[];
  records: AttendanceRecord[];
  period: string;
  site: string;
  rawRows: number;
  removedEntries: number;
}

export async function parseAttendanceFile(file: File): Promise<ParseResult> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    throw new Error(
      "PDF parsing requires server-side processing. Please export as XLS/XLSX/CSV.",
    );
  }

  if (ext === "xls" || ext === "xlsx" || ext === "csv") {
    return parseSpreadsheet(file);
  }

  throw new Error(`Unsupported file type: .${ext}`);
}

export async function parseAttendanceFiles(files: File[]): Promise<ParseResult> {
  if (files.length === 0) {
    throw new Error("No files selected.");
  }

  if (files.length === 1) {
    return parseAttendanceFile(files[0]);
  }

  const parsed: ParseResult[] = [];
  for (const file of files) {
    parsed.push(await parseAttendanceFile(file));
  }

  return mergeParseResults(parsed);
}

interface DateRange {
  start: Date;
  end: Date;
}

interface EmployeeAccumulator {
  name: string;
  role: WorkerRole;
  roleLabel: string;
  label: string;
  mergeKey: string;
  site: string;
  regularMinutes: number;
  overtimeMinutes: number;
  activeDays: Set<string>;
}

interface TimeCell {
  time: string;
  minutes: number;
  nextDay: boolean;
}

interface DetailParseResult {
  records: AttendanceRecord[];
  accumulators: Map<string, EmployeeAccumulator>;
  removedEntries: number;
  periodRange: DateRange | null;
}

async function parseSpreadsheet(file: File): Promise<ParseResult> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const site = extractSiteFromFilename(file.name);

  let rawRows = 0;
  let period = "Current Period";
  let removedEntries = 0;
  const records: AttendanceRecord[] = [];
  const stats = new Map<string, EmployeeAccumulator>();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    }) as unknown[][];

    rawRows += rows.length;
    const detectedPeriod = detectPeriodRange(rows);
    if (period === "Current Period" && detectedPeriod) {
      period = formatPeriodLabel(detectedPeriod);
    }

    if (!isDetailedAttendanceSheet(rows)) {
      continue;
    }

    const detail = extractAttendanceRecords(rows, site, detectedPeriod);
    records.push(...detail.records);
    removedEntries += detail.removedEntries;
    mergeAccumulators(stats, detail.accumulators);

    if (period === "Current Period" && detail.periodRange) {
      period = formatPeriodLabel(detail.periodRange);
    }
  }

  if (records.length > 0) {
    records.sort(compareRecords);

    return {
      employees: buildEmployeesFromAccumulators(stats),
      records,
      period,
      site,
      rawRows,
      removedEntries,
    };
  }

  const fallbackSheet =
    workbook.SheetNames.find(
      (name) =>
        name.toLowerCase().includes("summary") ||
        name.toLowerCase().includes("attend"),
    ) ?? workbook.SheetNames[0];

  const fallbackRows: unknown[][] = XLSX.utils.sheet_to_json(
    workbook.Sheets[fallbackSheet],
    { header: 1, defval: "" },
  ) as unknown[][];

  const fallback = extractEmployeesFromRows(fallbackRows, site);

  return {
    ...fallback,
    records: [],
    site,
    rawRows: rawRows || fallback.rawRows,
    removedEntries,
  };
}

function extractEmployeesFromRows(
  rows: unknown[][],
  site: string,
): Omit<ParseResult, "records" | "site" | "removedEntries"> {
  const employees: Employee[] = [];
  let period = "Current Period";
  const detectedPeriod = detectPeriodRange(rows);
  if (detectedPeriod) {
    period = formatPeriodLabel(detectedPeriod);
  }

  let nameColIdx = 0;
  let headerRowIdx = -1;

  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 20); rowIndex += 1) {
    const row = rows[rowIndex] as string[];
    const nameIdx = row.findIndex((cell) =>
      String(cell).toLowerCase().includes("name"),
    );
    if (nameIdx >= 0) {
      headerRowIdx = rowIndex;
      nameColIdx = nameIdx;
      break;
    }
  }

  const dataStart = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
  const seenMergeKeys = new Set<string>();

  rows.slice(dataStart).forEach((row, index) => {
    const nameRaw = String((row as string[])[nameColIdx] ?? "").trim();
    if (!nameRaw || nameRaw.length < 2) return;
    if (/^\d+$/.test(nameRaw)) return;
    if (/^total$/i.test(nameRaw)) return;

    const worker = parseWorkerLabel(nameRaw, site);
    if (seenMergeKeys.has(worker.mergeKey)) return;
    seenMergeKeys.add(worker.mergeKey);

    const nums = (row as unknown[])
      .slice(nameColIdx + 1)
      .map((cell) => parseFloat(String(cell)))
      .filter((num) => !Number.isNaN(num) && num >= 0);

    const days = nums[0] ?? 0;
    const regularHours = nums[1] ?? 0;
    const overtimeHours = nums[2] ?? 0;

    employees.push({
      id: index + 1,
      name: worker.name,
      role: worker.role,
      roleLabel: worker.roleLabel,
      label: worker.label,
      mergeKey: worker.mergeKey,
      site,
      days: Math.min(Math.round(days), 31),
      regularHours: Math.min(roundTo(regularHours, 2), 300),
      overtimeHours: Math.min(roundTo(overtimeHours, 2), 50),
      otHours: Math.min(roundTo(overtimeHours, 2), 50),
      customRateDay: null,
      customRateHour: null,
    });
  });

  return {
    employees: employees.slice(0, 400),
    period,
    rawRows: rows.length,
  };
}

function isDetailedAttendanceSheet(rows: unknown[][]): boolean {
  return rows.slice(0, 20).some((row) => {
    const text = row
      .map((cell) => String(cell).toLowerCase().replace(/\s+/g, " ").trim())
      .join(" ")
      .replace(/\s+/g, " ");

    const hasDateColumn = /date\s*\/\s*week(day)?/.test(text);
    const hasLegacyTimeBlocks =
      text.includes("time1") && (text.includes("time2") || text.includes("ot"));
    const hasAltTimeBlocks =
      text.includes("before noon") &&
      (text.includes("after noon") || text.includes("overtime"));

    return hasDateColumn && (hasLegacyTimeBlocks || hasAltTimeBlocks);
  });
}

function detectPeriodRange(rows: unknown[][]): DateRange | null {
  for (const row of rows.slice(0, 30)) {
    const joined = row.map((cell) => String(cell)).join(" ");

    const isoMatch = joined.match(
      /(\d{4}-\d{2}-\d{2})\s*[-~]\s*(\d{4}-\d{2}-\d{2})/,
    );
    if (isoMatch) {
      const start = parseDate(isoMatch[1]);
      const end = parseDate(isoMatch[2]);
      if (start && end) return normalizeDateRange(start, end);
    }

    const textMatch = joined.match(
      /([A-Za-z]+ \d{1,2},\s*\d{4})\s*[-~]\s*([A-Za-z]+ \d{1,2},\s*\d{4})/,
    );
    if (textMatch) {
      const start = parseDate(textMatch[1]);
      const end = parseDate(textMatch[2]);
      if (start && end) return normalizeDateRange(start, end);
    }
  }
  return null;
}

function extractAttendanceRecords(
  rows: unknown[][],
  site: string,
  fallbackPeriodRange: DateRange | null,
): DetailParseResult {
  const periodRange = detectPeriodRange(rows) ?? fallbackPeriodRange;
  const records: AttendanceRecord[] = [];
  const accumulators = new Map<string, EmployeeAccumulator>();
  let removedEntries = 0;

  const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0);

  for (let start = 0; start < maxCols; start += 15) {
    const employeeLabel = findEmployeeName(rows, start);
    if (!employeeLabel) continue;
    const worker = parseWorkerLabel(employeeLabel, site);

    for (const row of rows) {
      const dateValue = row[start];
      const isoDate = parseRowDate(dateValue, periodRange);
      if (!isoDate) continue;

      removedEntries += processSlot(
        row,
        start + 1,
        start + 3,
        "Time1",
        isoDate,
        worker,
        site,
        records,
        accumulators,
      );

      removedEntries += processSlot(
        row,
        start + 6,
        start + 8,
        "Time2",
        isoDate,
        worker,
        site,
        records,
        accumulators,
      );

      removedEntries += processSlot(
        row,
        start + 10,
        start + 12,
        "OT",
        isoDate,
        worker,
        site,
        records,
        accumulators,
      );
    }
  }

  return {
    records,
    accumulators,
    removedEntries,
    periodRange,
  };
}

function findEmployeeName(rows: unknown[][], start: number): string | null {
  for (let rowIndex = 0; rowIndex < Math.min(8, rows.length); rowIndex += 1) {
    const row = rows[rowIndex];
    for (
      let col = start;
      col < Math.min(start + 14, row.length - 1);
      col += 1
    ) {
      if (String(row[col]).trim().toLowerCase() === "name") {
        const value = String(row[col + 1] ?? "").trim();
        if (value && !/^name$/i.test(value)) return value;
      }
    }
  }
  return null;
}

function processSlot(
  row: unknown[],
  inCol: number,
  outCol: number,
  source: LogSource,
  date: string,
  worker: ReturnType<typeof parseWorkerLabel>,
  site: string,
  records: AttendanceRecord[],
  accumulators: Map<string, EmployeeAccumulator>,
): number {
  const rawIn = row[inCol];
  const rawOut = row[outCol];
  const inCell = parseTimeCell(rawIn);
  const outCell = parseTimeCell(rawOut);

  let removed = 0;
  if (!inCell && shouldCountAsRemoved(rawIn)) removed += 1;
  if (!outCell && shouldCountAsRemoved(rawOut)) removed += 1;

  if (!inCell && !outCell) {
    return removed;
  }

  const acc = getAccumulator(accumulators, worker, site);
  acc.activeDays.add(date);

  if (inCell) {
    records.push({
      date,
      employee: worker.label,
      workerName: worker.name,
      role: worker.role,
      roleLabel: worker.roleLabel,
      mergeKey: worker.mergeKey,
      isShortName: worker.isShortName,
      logTime: inCell.time,
      type: "IN",
      site,
      source,
    });
  }

  if (outCell) {
    const shouldMoveToNextDay =
      outCell.nextDay || (inCell ? outCell.minutes < inCell.minutes : false);
    const outDate = shouldMoveToNextDay ? addDays(date, 1) : date;
    records.push({
      date: outDate,
      employee: worker.label,
      workerName: worker.name,
      role: worker.role,
      roleLabel: worker.roleLabel,
      mergeKey: worker.mergeKey,
      isShortName: worker.isShortName,
      logTime: outCell.time,
      type: "OUT",
      site,
      source,
    });
  }

  if (inCell && outCell) {
    let minutes = outCell.minutes - inCell.minutes;
    if (outCell.nextDay || minutes < 0) minutes += 24 * 60;
    if (minutes > 0) {
      if (source === "OT") acc.overtimeMinutes += minutes;
      else acc.regularMinutes += minutes;
    }
  }

  return removed;
}

function getAccumulator(
  map: Map<string, EmployeeAccumulator>,
  worker: ReturnType<typeof parseWorkerLabel>,
  site: string,
): EmployeeAccumulator {
  const found = map.get(worker.mergeKey);
  if (found) return found;

  const created: EmployeeAccumulator = {
    name: worker.name,
    role: worker.role,
    roleLabel: worker.roleLabel,
    label: worker.label,
    mergeKey: worker.mergeKey,
    site,
    regularMinutes: 0,
    overtimeMinutes: 0,
    activeDays: new Set<string>(),
  };
  map.set(worker.mergeKey, created);
  return created;
}

function mergeAccumulators(
  target: Map<string, EmployeeAccumulator>,
  source: Map<string, EmployeeAccumulator>,
): void {
  source.forEach((value, key) => {
    const existing = target.get(key);
    if (!existing) {
      target.set(key, {
        ...value,
        activeDays: new Set(value.activeDays),
      });
      return;
    }

    existing.regularMinutes += value.regularMinutes;
    existing.overtimeMinutes += value.overtimeMinutes;
    value.activeDays.forEach((day) => existing.activeDays.add(day));
  });
}

function buildEmployeesFromAccumulators(
  map: Map<string, EmployeeAccumulator>,
): Employee[] {
  const sorted = Array.from(map.values()).sort((a, b) => {
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    if (a.role !== b.role) return a.role.localeCompare(b.role);
    return a.site.localeCompare(b.site);
  });

  return sorted.map((acc, index) => ({
    id: index + 1,
    name: acc.name,
    role: acc.role,
    roleLabel: acc.roleLabel,
    label: acc.label,
    mergeKey: acc.mergeKey,
    site: acc.site,
    days: acc.activeDays.size,
    regularHours: roundTo(acc.regularMinutes / 60, 2),
    overtimeHours: roundTo(acc.overtimeMinutes / 60, 2),
    otHours: roundTo(acc.overtimeMinutes / 60, 2),
    customRateDay: null,
    customRateHour: null,
  }));
}

function mergeParseResults(results: ParseResult[]): ParseResult {
  const allRecords = dedupeRecords(results.flatMap((result) => result.records));
  allRecords.sort(compareRecords);

  const allEmployees = mergeEmployees(results.flatMap((result) => result.employees));

  const sites = Array.from(
    new Set(
      results
        .map((result) => result.site.trim())
        .filter((site) => site.length > 0),
    ),
  );

  return {
    employees: allEmployees,
    records: allRecords,
    period: resolveMergedPeriod(results, allRecords),
    site:
      sites.length === 0
        ? "Unknown Site"
        : sites.length === 1
          ? sites[0]
          : `Multiple Sites (${sites.length})`,
    rawRows: results.reduce((sum, result) => sum + result.rawRows, 0),
    removedEntries: results.reduce((sum, result) => sum + result.removedEntries, 0),
  };
}

function dedupeRecords(records: AttendanceRecord[]): AttendanceRecord[] {
  const map = new Map<string, AttendanceRecord>();

  for (const record of records) {
    const key = [
      record.date,
      record.site.toLowerCase(),
      record.mergeKey,
      record.logTime,
      record.type,
      record.source,
    ].join("|||");
    if (!map.has(key)) {
      map.set(key, record);
    }
  }

  return Array.from(map.values());
}

function mergeEmployees(employees: Employee[]): Employee[] {
  const map = new Map<string, Employee>();

  for (const employee of employees) {
    const existing = map.get(employee.mergeKey);
    if (!existing) {
      map.set(employee.mergeKey, { ...employee });
      continue;
    }

    existing.days += employee.days;
    existing.regularHours = roundTo(existing.regularHours + employee.regularHours, 2);
    existing.overtimeHours = roundTo(
      existing.overtimeHours + employee.overtimeHours,
      2,
    );
    existing.otHours = roundTo(existing.otHours + employee.otHours, 2);
  }

  return Array.from(map.values())
    .sort((a, b) => {
      if (a.name !== b.name) return a.name.localeCompare(b.name);
      if (a.role !== b.role) return a.role.localeCompare(b.role);
      return a.mergeKey.localeCompare(b.mergeKey);
    })
    .map((employee, index) => ({
      ...employee,
      id: index + 1,
    }));
}

function resolveMergedPeriod(
  results: ParseResult[],
  records: AttendanceRecord[],
): string {
  if (records.length > 0) {
    const parsedDates = records
      .map((record) => parseDate(record.date))
      .filter((date): date is Date => Boolean(date));

    if (parsedDates.length > 0) {
      let minDate = parsedDates[0];
      let maxDate = parsedDates[0];
      for (const date of parsedDates.slice(1)) {
        if (date < minDate) minDate = date;
        if (date > maxDate) maxDate = date;
      }
      return formatPeriodLabel({ start: minDate, end: maxDate });
    }
  }

  const parsedRanges = results
    .map((result) => parsePeriodLabelRange(result.period))
    .filter((range): range is DateRange => Boolean(range));

  if (parsedRanges.length > 0) {
    let start = parsedRanges[0].start;
    let end = parsedRanges[0].end;
    for (const range of parsedRanges.slice(1)) {
      if (range.start < start) start = range.start;
      if (range.end > end) end = range.end;
    }
    return formatPeriodLabel({ start, end });
  }

  const labels = Array.from(
    new Set(
      results
        .map((result) => result.period.trim())
        .filter((label) => label.length > 0 && label !== "Current Period"),
    ),
  );

  if (labels.length === 0) return "Current Period";
  if (labels.length === 1) return labels[0];
  return `Multiple Periods (${labels.length})`;
}

function parsePeriodLabelRange(label: string): DateRange | null {
  const match = label.match(/(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;

  const start = parseDate(match[1]);
  const end = parseDate(match[2]);
  if (!start || !end) return null;
  return normalizeDateRange(start, end);
}

function shouldCountAsRemoved(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  if (!text) return false;
  return /^missed$/i.test(text) || !parseTimeCell(value);
}

function parseTimeCell(value: unknown): TimeCell | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    const minutes = value.getHours() * 60 + value.getMinutes();
    if (minutes === 0) return null;
    return { time: minutesToTime(minutes), minutes, nextDay: false };
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    let fraction = value % 1;
    if (fraction < 0) fraction += 1;
    let minutes = Math.round(fraction * 24 * 60);
    if (minutes === 24 * 60) minutes = 0;
    if (minutes === 0) return null;
    return { time: minutesToTime(minutes), minutes, nextDay: false };
  }

  const text = String(value).trim();
  if (!text) return null;
  if (/^missed$/i.test(text)) return null;

  const nextDay = /\+$/.test(text);
  const cleaned = text.replace(/\+/g, "").trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(mins)) return null;
  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) return null;

  const minutes = hours * 60 + mins;
  if (minutes === 0) return null;
  return { time: minutesToTime(minutes), minutes, nextDay };
}

function parseRowDate(value: unknown, range: DateRange | null): string | null {
  if (value instanceof Date) {
    return formatDate(value);
  }

  const text = String(value ?? "").trim();
  if (!text) return null;

  const dayWeek = text.match(/^(\d{1,2})\s*(?:\/|\s+)[A-Za-z]{2,}\.?$/);
  if (dayWeek) {
    const day = Number(dayWeek[1]);
    return resolveDateByDay(day, range);
  }

  if (/^\d{1,2}$/.test(text)) {
    return resolveDateByDay(Number(text), range);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const parsed = parseDate(text);
  return parsed ? formatDate(parsed) : null;
}

function resolveDateByDay(day: number, range: DateRange | null): string {
  if (range) {
    const cursor = new Date(
      range.start.getFullYear(),
      range.start.getMonth(),
      range.start.getDate(),
    );

    const end = new Date(
      range.end.getFullYear(),
      range.end.getMonth(),
      range.end.getDate(),
    );

    while (cursor <= end) {
      if (cursor.getDate() === day) return formatDate(cursor);
      cursor.setDate(cursor.getDate() + 1);
    }

    const candidate = new Date(
      range.start.getFullYear(),
      range.start.getMonth(),
      day,
    );
    if (candidate < range.start) candidate.setMonth(candidate.getMonth() + 1);
    return formatDate(candidate);
  }

  const now = new Date();
  return formatDate(new Date(now.getFullYear(), now.getMonth(), day));
}

function normalizeDateRange(start: Date, end: Date): DateRange {
  if (start <= end) return { start, end };
  return { start: end, end: start };
}

function formatPeriodLabel(range: DateRange): string {
  return `${formatDate(range.start)} to ${formatDate(range.end)}`;
}

function addDays(isoDate: string, days: number): string {
  const parsed = parseDate(isoDate);
  if (!parsed) return isoDate;
  parsed.setDate(parsed.getDate() + days);
  return formatDate(parsed);
}

function parseDate(value: string): Date | null {
  const cleaned = value.replace(/\s+/g, " ").replace(/,\s*/g, ", ").trim();
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function compareRecords(a: AttendanceRecord, b: AttendanceRecord): number {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  if (a.workerName !== b.workerName) return a.workerName.localeCompare(b.workerName);
  if (a.site !== b.site) return a.site.localeCompare(b.site);
  if (a.logTime !== b.logTime) return a.logTime.localeCompare(b.logTime);
  if (a.type !== b.type) return a.type.localeCompare(b.type);
  return a.source.localeCompare(b.source);
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function roundTo(value: number, decimals: number): number {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

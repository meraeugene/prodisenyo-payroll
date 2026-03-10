import type { AttendanceRecord, Employee, LogSource } from "@/app/types";

export interface ParseResult {
  employees: Employee[];
  records: AttendanceRecord[];
  period: string;
  site: string;
  rawRows: number;
  removedEntries: number;
}

/**
 * Parses an attendance file (XLS/XLSX/CSV) using SheetJS.
 */
export async function parseAttendanceFile(file: File): Promise<ParseResult> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    return parsePDF(file);
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

async function parseSpreadsheet(file: File): Promise<ParseResult> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const site = getFileBaseName(file.name);

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
    records.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.employee !== b.employee) return a.employee.localeCompare(b.employee);
      if (a.logTime !== b.logTime) return a.logTime.localeCompare(b.logTime);
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.source.localeCompare(b.source);
    });

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
      (n) =>
        n.toLowerCase().includes("summary") ||
        n.toLowerCase().includes("attend"),
    ) ?? workbook.SheetNames[0];

  const fallbackRows: unknown[][] = XLSX.utils.sheet_to_json(
    workbook.Sheets[fallbackSheet],
    { header: 1, defval: "" },
  ) as unknown[][];

  const fallback = extractEmployeesFromRows(fallbackRows);

  return {
    ...fallback,
    records: [],
    site,
    rawRows: rawRows || fallback.rawRows,
    removedEntries,
  };
}

async function parsePDF(_file: File): Promise<ParseResult> {
  throw new Error(
    "PDF parsing requires server-side processing. Please export your attendance report as XLS or CSV from your biometric system.",
  );
}

function getFileBaseName(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  return base.trim() || "Unknown Site";
}

interface DateRange {
  start: Date;
  end: Date;
}

interface EmployeeAccumulator {
  displayName: string;
  regularMinutes: number;
  otMinutes: number;
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

function extractEmployeesFromRows(
  rows: unknown[][],
): Omit<ParseResult, "records" | "site" | "removedEntries"> {
  const employees: Employee[] = [];
  let period = "Current Period";

  const detected = detectPeriodRange(rows);
  if (detected) {
    period = formatPeriodLabel(detected);
  }

  let nameColIdx = 0;
  let headerRowIdx = -1;

  for (let r = 0; r < Math.min(20, rows.length); r++) {
    const row = rows[r] as string[];
    const nameIdx = row.findIndex((c) =>
      String(c).toLowerCase().includes("name"),
    );
    if (nameIdx >= 0) {
      headerRowIdx = r;
      nameColIdx = nameIdx;
      break;
    }
  }

  const dataStart = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
  const seenNames = new Set<string>();

  rows.slice(dataStart).forEach((row, i) => {
    const nameRaw = String((row as string[])[nameColIdx] ?? "").trim();
    if (!nameRaw || nameRaw.length < 2) return;
    if (/^\d+$/.test(nameRaw)) return;
    if (/^total$/i.test(nameRaw)) return;
    if (seenNames.has(nameRaw.toLowerCase())) return;
    seenNames.add(nameRaw.toLowerCase());

    const nums = (row as unknown[])
      .slice(nameColIdx + 1)
      .map((c) => parseFloat(String(c)))
      .filter((n) => !isNaN(n) && n > 0);

    const days = nums[0] ?? 0;
    const regularHours = nums[1] ?? 0;
    const otHours = nums[2] ?? 0;

    employees.push({
      id: i + 1,
      name: nameRaw,
      days: Math.min(Math.round(days), 31),
      regularHours: Math.min(roundTo(regularHours, 2), 300),
      otHours: Math.min(roundTo(otHours, 2), 50),
      customRateDay: null,
      customRateHour: null,
    });
  });

  return {
    employees: employees.slice(0, 200),
    period,
    rawRows: rows.length,
  };
}

function isDetailedAttendanceSheet(rows: unknown[][]): boolean {
  return rows.slice(0, 20).some((row) => {
    const text = row
      .map((c) => String(c).toLowerCase().replace(/\s+/g, " ").trim())
      .join(" ")
      .replace(/\s+/g, " ");
    const hasDateColumn = /date\s*\/\s*week(day)?/.test(text);
    const hasLegacyTimeBlocks =
      text.includes("time1") && (text.includes("time2") || text.includes("ot"));
    const hasAltTimeBlocks =
      text.includes("before noon") &&
      (text.includes("after noon") || text.includes("overtime"));

    return (
      hasDateColumn &&
      (hasLegacyTimeBlocks || hasAltTimeBlocks)
    );
  });
}

function detectPeriodRange(rows: unknown[][]): DateRange | null {
  for (const row of rows.slice(0, 30)) {
    const joined = row.map((c) => String(c)).join(" ");

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

function normalizeDateRange(start: Date, end: Date): DateRange {
  if (start <= end) return { start, end };
  return { start: end, end: start };
}

function formatPeriodLabel(range: DateRange): string {
  return `${formatDate(range.start)} to ${formatDate(range.end)}`;
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
    const employee = findEmployeeName(rows, start);
    if (!employee) continue;

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
        employee,
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
        employee,
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
        employee,
        site,
        records,
        accumulators,
      );
    }
  }

  return { records, accumulators, removedEntries, periodRange };
}

function findEmployeeName(rows: unknown[][], start: number): string | null {
  for (let r = 0; r < Math.min(8, rows.length); r++) {
    const row = rows[r];
    for (let c = start; c < Math.min(start + 14, row.length - 1); c++) {
      if (String(row[c]).trim().toLowerCase() === "name") {
        const value = String(row[c + 1] ?? "").trim();
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
  employee: string,
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

  const acc = getAccumulator(accumulators, employee);
  acc.activeDays.add(date);

  if (inCell) {
    records.push({
      date,
      employee,
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
      employee,
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
      if (source === "OT") acc.otMinutes += minutes;
      else acc.regularMinutes += minutes;
    }
  }

  return removed;
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

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${pad2(h)}:${pad2(m)}`;
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

function addDays(isoDate: string, days: number): string {
  const parsed = parseDate(isoDate);
  if (!parsed) return isoDate;
  parsed.setDate(parsed.getDate() + days);
  return formatDate(parsed);
}

function getAccumulator(
  map: Map<string, EmployeeAccumulator>,
  name: string,
): EmployeeAccumulator {
  const key = name.trim().toLowerCase();
  const found = map.get(key);
  if (found) return found;

  const created: EmployeeAccumulator = {
    displayName: name.trim(),
    regularMinutes: 0,
    otMinutes: 0,
    activeDays: new Set<string>(),
  };
  map.set(key, created);
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
        displayName: value.displayName,
        regularMinutes: value.regularMinutes,
        otMinutes: value.otMinutes,
        activeDays: new Set(value.activeDays),
      });
      return;
    }

    existing.regularMinutes += value.regularMinutes;
    existing.otMinutes += value.otMinutes;
    value.activeDays.forEach((day) => {
      existing.activeDays.add(day);
    });
  });
}

function buildEmployeesFromAccumulators(
  map: Map<string, EmployeeAccumulator>,
): Employee[] {
  const sorted = Array.from(map.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );

  return sorted.map((acc, idx) => ({
    id: idx + 1,
    name: acc.displayName,
    days: acc.activeDays.size,
    regularHours: roundTo(acc.regularMinutes / 60, 2),
    otHours: roundTo(acc.otMinutes / 60, 2),
    customRateDay: null,
    customRateHour: null,
  }));
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

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function roundTo(value: number, decimals: number): number {
  const m = 10 ** decimals;
  return Math.round(value * m) / m;
}

function mergeParseResults(results: ParseResult[]): ParseResult {
  const allRecords = dedupeRecords(results.flatMap((result) => result.records));
  allRecords.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.employee !== b.employee) return a.employee.localeCompare(b.employee);
    if (a.logTime !== b.logTime) return a.logTime.localeCompare(b.logTime);
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.source.localeCompare(b.source);
  });

  const allEmployees = mergeEmployees(results.flatMap((result) => result.employees));
  const uniqueSites = Array.from(
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
      uniqueSites.length === 0
        ? "Unknown Site"
        : uniqueSites.length === 1
          ? uniqueSites[0]
          : `Multiple Sites (${uniqueSites.length})`,
    rawRows: results.reduce((sum, result) => sum + result.rawRows, 0),
    removedEntries: results.reduce(
      (sum, result) => sum + result.removedEntries,
      0,
    ),
  };
}

function dedupeRecords(records: AttendanceRecord[]): AttendanceRecord[] {
  const map = new Map<string, AttendanceRecord>();
  for (const record of records) {
    const key = [
      record.date,
      record.employee.trim().toLowerCase(),
      record.logTime,
      record.type,
      record.source,
      record.site.trim().toLowerCase(),
    ].join("|||");
    if (!map.has(key)) map.set(key, record);
  }
  return Array.from(map.values());
}

function mergeEmployees(employees: Employee[]): Employee[] {
  const map = new Map<
    string,
    { name: string; days: number; regularHours: number; otHours: number }
  >();

  for (const employee of employees) {
    const normalizedName = employee.name.trim();
    if (!normalizedName) continue;

    const key = normalizedName.toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        name: normalizedName,
        days: employee.days,
        regularHours: employee.regularHours,
        otHours: employee.otHours,
      });
      continue;
    }

    existing.days += employee.days;
    existing.regularHours += employee.regularHours;
    existing.otHours += employee.otHours;
  }

  return Array.from(map.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((employee, idx) => ({
      id: idx + 1,
      name: employee.name,
      days: employee.days,
      regularHours: roundTo(employee.regularHours, 2),
      otHours: roundTo(employee.otHours, 2),
      customRateDay: null,
      customRateHour: null,
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
  const match = label.match(
    /(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/,
  );
  if (!match) return null;

  const start = parseDate(match[1]);
  const end = parseDate(match[2]);
  if (!start || !end) return null;
  return normalizeDateRange(start, end);
}

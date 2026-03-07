import type {
  Employee,
  EmployeeCalcDetails,
  EmployeeDailyLog,
} from "@/app/types";

export interface ParseResult {
  employees: Employee[];
  period: string;
  rawRows: number;
}

/**
 * Parses an attendance file (XLS/XLSX/CSV) using SheetJS.
 * Falls back to demo data extraction if structure is unrecognised.
 */
export async function parseAttendanceFile(file: File): Promise<ParseResult> {
  const branch = file.name
    .replace(/\.[^/.]+$/, "") // remove extension
    .replace(/\s*\d{4}T[O0]?\d{4}.*/i, "") // remove weekly date
    .trim();

  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    return parsePDF(file);
  }

  if (ext === "xls" || ext === "xlsx" || ext === "csv") {
    return parseSpreadsheet(file, branch);
  }

  throw new Error(`Unsupported file type: .${ext}`);
}

async function parseSpreadsheet(
  file: File,
  branch: string,
): Promise<ParseResult> {
  // Dynamically import SheetJS only on client
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  // Prefer sheets named like "1,2,3" or "10,11,12", then fall back.
  const numberedSheets = workbook.SheetNames.filter((name) =>
    /^\s*\d+(?:\s*,\s*\d+)*\s*$/.test(name),
  );

  const targetSheets =
    numberedSheets.length > 0
      ? numberedSheets
      : [
          workbook.SheetNames.find(
            (n) =>
              n.toLowerCase().includes("summary") ||
              n.toLowerCase().includes("attend"),
          ) ?? workbook.SheetNames[0],
        ];

  const allEmployees: Employee[] = [];
  let rawRows = 0;
  let period = "Current Period";

  targetSheets.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    }) as unknown[][];
    rawRows += rows.length;

    if (period === "Current Period") {
      period = detectPeriod(rows) ?? period;
    }

    const extracted = extractEmployeesFromBlockLayout(rows, sheetName);

    extracted.forEach((e) => {
      e.branch = branch;
    });

    allEmployees.push(...extracted);
  });

  const sortedEmployees = [...allEmployees].sort((a, b) => a.id - b.id);

  return {
    employees: sortedEmployees.slice(0, 500),
    period,
    rawRows,
  };
}

async function parsePDF(_file: File): Promise<ParseResult> {
  // PDF parsing requires pdf.js worker — for now return structured demo
  // In production: use pdfjs-dist to extract text and parse employee rows
  throw new Error(
    "PDF parsing requires server-side processing. Please export your attendance report as XLS or CSV from your biometric system.",
  );
}

function extractEmployeesFromBlockLayout(
  rows: unknown[][],
  sheetName: string,
): Employee[] {
  // This export format repeats 3 employee blocks per sheet:
  // [Dept..Name/ID..summary..All Report], then next blocks at +15 columns.
  const headerRowIdx = rows.findIndex((row) =>
    (row as unknown[]).some((cell) => normaliseCell(cell) === "dept."),
  );

  if (headerRowIdx < 0) {
    return extractEmployeesFallback(rows);
  }

  const headerRow = rows[headerRowIdx] as unknown[];
  const blockStarts: number[] = [];
  headerRow.forEach((cell, idx) => {
    if (normaliseCell(cell) === "dept.") {
      blockStarts.push(idx);
    }
  });

  if (blockStarts.length === 0) {
    return extractEmployeesFallback(rows);
  }

  const employees: Employee[] = [];
  const summaryValuesRow = (rows[headerRowIdx + 4] ?? []) as unknown[];
  const idRow = (rows[headerRowIdx + 1] ?? []) as unknown[];
  const fallbackIds = getSheetFallbackIds(sheetName);

  blockStarts.forEach((start, i) => {
    const idRaw = String(idRow[start + 9] ?? "").trim();
    const parsedId = parseInt(idRaw, 10);
    const fallbackId = fallbackIds[i];
    if (!Number.isFinite(parsedId) && !Number.isFinite(fallbackId)) return;
    const employeeId = Number.isFinite(parsedId) ? parsedId : fallbackId;
    const nameRaw = String(headerRow[start + 9] ?? "").trim();
    const employeeName = nameRaw || `Employee ${employeeId}`;

    const days = clampNumber(toNumber(summaryValuesRow[start + 4]) ?? 0, 0, 31);
    const otNormalRaw = String(summaryValuesRow[start + 5] ?? "").trim();
    const otSpecialRaw = String(summaryValuesRow[start + 7] ?? "").trim();
    const otNormal = parseDurationHours(otNormalRaw);
    const otSpecial = parseDurationHours(otSpecialRaw);
    const otHours = clampNumber(otNormal + otSpecial, 0, 50);
    const details: EmployeeCalcDetails = {
      sourceSheet: sheetName,
      absencesDay: toNumber(summaryValuesRow[start + 0]) ?? 0,
      leaveDay: toNumber(summaryValuesRow[start + 1]) ?? 0,
      businessTripDay: toNumber(summaryValuesRow[start + 2]) ?? 0,
      attendanceDay: days,
      otNormalRaw,
      otSpecialRaw,
      otNormalHours: roundTo1(otNormal),
      otSpecialHours: roundTo1(otSpecial),
      dailyLogs: extractDailyLogs(rows, headerRowIdx + 9, start),
    };

    employees.push({
      id: employeeId,
      name: employeeName,
      days: roundTo1(days),
      regularHours: roundTo1(days * 8),
      otHours: roundTo1(otHours),
      customRateDay: null,
      customRateHour: null,
      calcDetails: details,
    });
  });

  return employees;
}

function extractDailyLogs(
  rows: unknown[][],
  startRow: number,
  startCol: number,
): EmployeeDailyLog[] {
  const logs: EmployeeDailyLog[] = [];

  for (let r = startRow; r < rows.length; r++) {
    const row = (rows[r] ?? []) as unknown[];
    const dateWeek = String(row[startCol] ?? "").trim();
    if (!dateWeek) {
      if (logs.length > 0) break;
      continue;
    }

    const dateCell = normaliseCell(dateWeek);
    if (dateCell.includes("all report") || dateCell.includes("date/week")) {
      continue;
    }

    if (!/^\d{1,2}\//.test(dateWeek) && logs.length > 0) {
      break;
    }

    logs.push({
      dateWeek,
      time1In: String(row[startCol + 1] ?? "").trim(),
      time1Out: String(row[startCol + 3] ?? "").trim(),
      time2In: String(row[startCol + 6] ?? "").trim(),
      time2Out: String(row[startCol + 8] ?? "").trim(),
      otIn: String(row[startCol + 10] ?? "").trim(),
      otOut: String(row[startCol + 12] ?? "").trim(),
    });
  }

  return logs;
}

function extractEmployeesFallback(rows: unknown[][]): Employee[] {
  const employees: Employee[] = [];
  let nameColIdx = 0;
  let headerRowIdx = -1;

  for (let r = 0; r < Math.min(20, rows.length); r++) {
    const row = rows[r] as unknown[];
    const nameIdx = row.findIndex((c) => normaliseCell(c).includes("name"));
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
    if (/^\d+$/.test(nameRaw)) return; // skip numeric-only
    if (seenNames.has(nameRaw.toLowerCase())) return;
    seenNames.add(nameRaw.toLowerCase());

    const nums = (row as unknown[])
      .slice(nameColIdx + 1)
      .map((c) => toNumber(c))
      .filter((n): n is number => typeof n === "number")
      .filter((n) => !isNaN(n) && n > 0);

    const days = nums[0] ?? 0;
    const regularHours = nums[1] ?? days * 8;
    const otHours = nums[2] ?? 0;

    employees.push({
      id: i + 1,
      name: nameRaw,
      days: clampNumber(Math.round(days), 0, 31),
      regularHours: clampNumber(Math.round(regularHours), 0, 300),
      otHours: clampNumber(roundTo1(otHours), 0, 50),
      customRateDay: null,
      customRateHour: null,
    });
  });

  return employees;
}

function detectPeriod(rows: unknown[][]): string | null {
  for (const row of rows.slice(0, 10)) {
    const joined = (row as unknown[]).map((c) => String(c ?? "")).join(" ");
    const dateMatch = joined.match(
      /(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/,
    );
    if (dateMatch) {
      return `${dateMatch[1]} to ${dateMatch[2]}`;
    }
  }
  return null;
}

function getSheetFallbackIds(sheetName: string): number[] {
  return sheetName
    .split(",")
    .map((v) => parseInt(v.trim(), 10))
    .filter((n) => Number.isFinite(n));
}

function normaliseCell(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDurationHours(value: unknown): number {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;

  const hhmm = raw.match(/^(\d{1,2}):(\d{2})\+?$/);
  if (hhmm) {
    const h = parseInt(hhmm[1], 10);
    const m = parseInt(hhmm[2], 10);
    return h + m / 60;
  }

  const numeric = parseFloat(raw);
  return Number.isFinite(numeric) ? numeric : 0;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundTo1(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface ImportedProgressActivity {
  activity: string;
  weightPercent: number;
  progressPercent: number;
}

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ");
}

function parsePercent(value: unknown) {
  if (value === null || value === undefined || value === "") return Number.NaN;
  if (typeof value === "number") {
    return value > 0 && value <= 1 ? Number((value * 100).toFixed(2)) : value;
  }

  const numeric = Number(String(value).replace("%", "").trim());
  if (!Number.isFinite(numeric)) return Number.NaN;
  return numeric > 0 && numeric <= 1 ? Number((numeric * 100).toFixed(2)) : numeric;
}

function findColumnIndex(headers: unknown[], candidates: string[]) {
  return headers.findIndex((header) => {
    const normalized = normalizeHeader(header);
    return candidates.some((candidate) => normalized === candidate);
  });
}

function isSummaryActivity(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "total amount" ||
    normalized === "progress update" ||
    normalized.startsWith("total ")
  );
}

export async function parseEngineeringProgressWorkbook(
  file: File,
): Promise<ImportedProgressActivity[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const importedActivities: ImportedProgressActivity[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      blankrows: false,
      raw: true,
    });

    const headerRowIndex = rows.findIndex((row) => {
      const activityIndex = findColumnIndex(row, ["activity"]);
      const weightIndex = findColumnIndex(row, ["% wt", "wt"]);
      const progressIndex = findColumnIndex(row, ["progress"]);
      return activityIndex >= 0 && weightIndex >= 0 && progressIndex >= 0;
    });

    if (headerRowIndex < 0) return;

    const headers = rows[headerRowIndex];
    const activityIndex = findColumnIndex(headers, ["activity"]);
    const weightIndex = findColumnIndex(headers, ["% wt", "wt"]);
    const progressIndex = findColumnIndex(headers, ["progress"]);

    rows.slice(headerRowIndex + 1).forEach((row) => {
      const activity = String(row[activityIndex] ?? "").trim();
      const weightPercent = parsePercent(row[weightIndex]);
      const progressPercent = parsePercent(row[progressIndex]);

      if (
        !activity ||
        isSummaryActivity(activity) ||
        !Number.isFinite(weightPercent) ||
        !Number.isFinite(progressPercent)
      ) {
        return;
      }

      importedActivities.push({
        activity,
        weightPercent,
        progressPercent,
      });
    });
  });

  return importedActivities;
}

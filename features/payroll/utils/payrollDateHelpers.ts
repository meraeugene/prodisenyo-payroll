function parseIsoDate(isoDate: string): Date | null {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function expandIsoRange(startText: string, endText: string): string[] {
  const startDate = parseIsoDate(startText);
  const endDate = parseIsoDate(endText);
  if (!startDate || !endDate) return [];

  const orderedStart =
    startDate.getTime() <= endDate.getTime() ? startDate : endDate;
  const orderedEnd =
    startDate.getTime() <= endDate.getTime() ? endDate : startDate;

  const dates: string[] = [];
  const cursor = new Date(orderedStart.getTime());
  let guard = 0;

  while (cursor.getTime() <= orderedEnd.getTime() && guard < 370) {
    dates.push(formatIsoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    guard += 1;
  }

  return dates;
}

export function normalizePeriodLabel(label: string): string | null {
  const match = label.match(/(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/i);
  if (!match) return null;

  const dates = expandIsoRange(match[1], match[2]);
  if (dates.length === 0) return null;

  return `${dates[0]} to ${dates[dates.length - 1]}`;
}

export function expandDateSummary(
  dateSummary: string,
  fallbackDates: string[],
  payrollPeriodLabel?: string,
): string[] {
  const periodMatch = payrollPeriodLabel?.match(
    /(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/i,
  );

  if (periodMatch) {
    const periodDates = expandIsoRange(periodMatch[1], periodMatch[2]);
    if (periodDates.length > 0) return periodDates;
  }

  const trimmed = dateSummary.trim();
  const [startText, endText] = trimmed
    .split(" to ")
    .map((value) => value.trim());

  const summaryDates = expandIsoRange(
    startText || "",
    endText || startText || "",
  );

  if (summaryDates.length > 0) return summaryDates;

  const validFallback = fallbackDates
    .map((dateText) => dateText.trim())
    .filter((dateText) => parseIsoDate(dateText))
    .sort((a, b) => a.localeCompare(b));

  return Array.from(new Set(validFallback));
}


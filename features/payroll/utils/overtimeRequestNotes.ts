import type { DailyLogRow } from "@/types";

const SNAPSHOT_START = "[[LOG_SNAPSHOT]]";
const SNAPSHOT_END = "[[/LOG_SNAPSHOT]]";
const REJECTION_START = "[[REJECTION_REASON]]";
const REJECTION_END = "[[/REJECTION_REASON]]";

function normalizeLogRow(log: DailyLogRow): DailyLogRow {
  return {
    date: String(log.date ?? ""),
    employee: String(log.employee ?? ""),
    time1In: String(log.time1In ?? ""),
    time1Out: String(log.time1Out ?? ""),
    time2In: String(log.time2In ?? ""),
    time2Out: String(log.time2Out ?? ""),
    otIn: String(log.otIn ?? ""),
    otOut: String(log.otOut ?? ""),
    regularHours: Number.isFinite(log.regularHours)
      ? Math.round(log.regularHours * 100) / 100
      : 0,
    overtimeHours: Number.isFinite(log.overtimeHours)
      ? Math.round(log.overtimeHours * 100) / 100
      : 0,
    totalHours: Number.isFinite(log.totalHours)
      ? Math.round(log.totalHours * 100) / 100
      : Number.isFinite(log.hours)
        ? Math.round(log.hours * 100) / 100
        : 0,
    hours: Number.isFinite(log.hours) ? Math.round(log.hours * 100) / 100 : 0,
    site: String(log.site ?? ""),
  };
}

export function parseOvertimeRequestNotes(notes: string | null | undefined): {
  displayNotes: string;
  editedLogs: DailyLogRow[];
  rejectionReason: string | null;
} {
  const source = String(notes ?? "");
  const rejectionStartIndex = source.indexOf(REJECTION_START);
  const rejectionEndIndex = source.indexOf(REJECTION_END);
  const startIndex = source.indexOf(SNAPSHOT_START);
  const endIndex = source.indexOf(SNAPSHOT_END);
  const withoutRejection =
    rejectionStartIndex >= 0 && rejectionEndIndex > rejectionStartIndex
      ? `${source.slice(0, rejectionStartIndex)}${source.slice(
          rejectionEndIndex + REJECTION_END.length,
        )}`
      : source;
  const rejectionReason =
    rejectionStartIndex >= 0 && rejectionEndIndex > rejectionStartIndex
      ? source
          .slice(rejectionStartIndex + REJECTION_START.length, rejectionEndIndex)
          .trim() || null
      : null;

  if (startIndex < 0 || endIndex < startIndex) {
    return {
      displayNotes: withoutRejection.trim(),
      editedLogs: [],
      rejectionReason,
    };
  }

  const displayNotes = `${withoutRejection.slice(0, startIndex)}${withoutRejection.slice(
    endIndex + SNAPSHOT_END.length,
  )}`.trim();
  const snapshotStartInCleanSource = withoutRejection.indexOf(SNAPSHOT_START);
  const snapshotEndInCleanSource = withoutRejection.indexOf(SNAPSHOT_END);
  const snapshotRaw = withoutRejection
    .slice(snapshotStartInCleanSource + SNAPSHOT_START.length, snapshotEndInCleanSource)
    .trim();

  try {
    const parsed = JSON.parse(snapshotRaw);
    const editedLogs = Array.isArray(parsed)
      ? parsed.map((item) => normalizeLogRow(item as DailyLogRow))
      : [];

    return {
      displayNotes,
      editedLogs,
      rejectionReason,
    };
  } catch {
    return {
      displayNotes,
      editedLogs: [],
      rejectionReason,
    };
  }
}

export function buildOvertimeRequestNotes(
  notes: string,
  editedLogs: DailyLogRow[],
): string {
  const { displayNotes } = parseOvertimeRequestNotes(notes);
  const safeNotes = displayNotes.trim();
  const snapshot = JSON.stringify(editedLogs.map((log) => normalizeLogRow(log)));

  return `${safeNotes || "Overtime request"}\n${SNAPSHOT_START}\n${snapshot}\n${SNAPSHOT_END}`;
}

export function attachOvertimeRejectionReason(
  notes: string | null | undefined,
  rejectionReason: string | null | undefined,
): string {
  const parsed = parseOvertimeRequestNotes(notes);
  const rebuiltNotes = buildOvertimeRequestNotes(parsed.displayNotes, parsed.editedLogs);
  const nextRejectionReason = rejectionReason?.trim() || "";

  if (!nextRejectionReason) {
    return rebuiltNotes;
  }

  return `${rebuiltNotes}\n${REJECTION_START}\n${nextRejectionReason}\n${REJECTION_END}`;
}

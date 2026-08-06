import type {
  CreateProjectProgressUpdateInput,
  ProjectProgressUpdateRecord,
} from "../progressUpdateTypes";

export function normalizeProgressUpdateInput(input: CreateProjectProgressUpdateInput) {
  const projectId = input.projectId.trim();
  const overallPercent = Math.round(Number(input.overallPercent) * 100) / 100;
  const completedWorkSummary = input.completedWorkSummary.trim();
  const remarks = input.remarks?.trim() || null;

  if (!projectId) throw new Error("Project is required.");
  if (!Number.isFinite(overallPercent) || overallPercent < 0 || overallPercent > 100) {
    throw new Error("Overall progress must be between 0 and 100.");
  }
  if (!completedWorkSummary || completedWorkSummary.length > 1000) {
    throw new Error("Completed work summary is required and must be 1000 characters or fewer.");
  }
  if (remarks && remarks.length > 600) {
    throw new Error("Remarks must be 600 characters or fewer.");
  }

  return { projectId, overallPercent, completedWorkSummary, remarks };
}

export function selectLatestProgressUpdate(
  updates: ProjectProgressUpdateRecord[],
) {
  return [...updates]
    .filter((update) => Number.isFinite(Date.parse(update.created_at)))
    .sort(
      (left, right) =>
        Date.parse(right.created_at) - Date.parse(left.created_at),
    )[0] ?? null;
}

export function getLatestProgressUpdatePercentage(
  updates: ProjectProgressUpdateRecord[],
) {
  const latest = selectLatestProgressUpdate(updates);
  if (!latest) return null;
  return Math.max(0, Math.min(100, Math.round(Number(latest.overall_percent))));
}
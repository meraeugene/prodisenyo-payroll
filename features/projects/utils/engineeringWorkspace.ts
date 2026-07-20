import type { TaskPriority, TaskRecord, TaskStatus } from "@/features/my-tasks/types";
import type { ProgressReportRecord } from "@/features/progress-reports/types";

export interface EngineeringProgressActivityRecord {
  id: string;
  projectName: string;
  activity: string;
  weightPercent: number;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface EngineeringProgressSummary {
  totalWeight: number;
  remainingWeight: number;
  overallProgress: number;
  activityCount: number;
  weightStatus: "under" | "complete" | "over";
}

export function computeActivityContribution(
  activity: Pick<
    EngineeringProgressActivityRecord,
    "weightPercent" | "progressPercent"
  >,
) {
  return Number(
    ((activity.weightPercent * activity.progressPercent) / 100).toFixed(2),
  );
}

export function sortProgressActivities(
  activities: EngineeringProgressActivityRecord[] | null | undefined,
) {
  return [...(Array.isArray(activities) ? activities : [])].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function buildProgressSummary(
  activities: EngineeringProgressActivityRecord[] | null | undefined,
): EngineeringProgressSummary {
  const activityRows = Array.isArray(activities) ? activities : [];
  const totalWeight = Number(
    activityRows
      .reduce((sum, activity) => sum + activity.weightPercent, 0)
      .toFixed(2),
  );
  const overallProgress = Number(
    activityRows
      .reduce((sum, activity) => sum + computeActivityContribution(activity), 0)
      .toFixed(2),
  );

  return {
    totalWeight,
    remainingWeight: Number((100 - totalWeight).toFixed(2)),
    overallProgress,
    activityCount: activityRows.length,
    weightStatus:
      totalWeight === 100 ? "complete" : totalWeight > 100 ? "over" : "under",
  };
}

export type TaskStatusFilter = "all" | TaskStatus;
export type TaskPriorityFilter = "all" | TaskPriority;
export type TaskDueSort = "soonest" | "latest";

export function isTaskOverdue(task: TaskRecord, now = new Date()) {
  if (task.status === "completed") return false;
  const due = new Date(`${task.dueDate}T23:59:59`);
  return !Number.isNaN(due.getTime()) && due.getTime() < now.getTime();
}

export function buildTaskSummary(tasks: TaskRecord[], now = new Date()) {
  return {
    total: tasks.length,
    completed: tasks.filter((task) => task.status === "completed").length,
    inProgress: tasks.filter((task) => task.status === "in_progress").length,
    needsAttention: tasks.filter(
      (task) => task.status === "delayed" || isTaskOverdue(task, now),
    ).length,
  };
}

export function filterAndSortTasks(
  tasks: TaskRecord[],
  search: string,
  status: TaskStatusFilter,
  priority: TaskPriorityFilter,
  dueSort: TaskDueSort,
) {
  const query = search.trim().toLowerCase();
  return tasks
    .filter((task) => {
      const matchesQuery =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.id.toLowerCase().includes(query);
      return (
        matchesQuery &&
        (status === "all" || task.status === status) &&
        (priority === "all" || task.priority === priority)
      );
    })
    .sort((a, b) => {
      const difference =
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      return dueSort === "soonest" ? difference : -difference;
    });
}

export interface ReportTimelineItem {
  report: ProgressReportRecord;
  progressDelta: number | null;
}

export function buildReportTimeline(
  reports: ProgressReportRecord[],
): ReportTimelineItem[] {
  const chronological = [...reports].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const deltas = new Map<string, number | null>();
  chronological.forEach((report, index) => {
    const previous = chronological[index - 1];
    deltas.set(
      report.id,
      previous
        ? report.completionPercentage - previous.completionPercentage
        : null,
    );
  });
  return chronological
    .reverse()
    .map((report) => ({ report, progressDelta: deltas.get(report.id) ?? null }));
}

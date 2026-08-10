import type {
  EngineerActivity,
  EngineerProject,
  EngineerReport,
  EngineerTask,
  EngineerTaskStatus,
} from "@/features/engineer/types";

export const MANILA_TIME_ZONE = "Asia/Manila";

export function manilaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatEngineerDate(value: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "Not scheduled";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00+08:00`) : new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(date);
}

export function formatEngineerTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function humanizeEngineerStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function isTaskOpen(status: EngineerTaskStatus) {
  return status !== "completed";
}

export function isPastDate(value: string | null, today = manilaDateKey()) {
  return Boolean(value && value < today);
}

export function isDateToday(value: string | null, today = manilaDateKey()) {
  return value === today;
}

export function daysFromToday(value: string | null, today = manilaDateKey()) {
  if (!value) return Number.POSITIVE_INFINITY;
  const start = new Date(`${today}T00:00:00+08:00`).getTime();
  const end = new Date(`${value}T00:00:00+08:00`).getTime();
  return Math.round((end - start) / 86_400_000);
}

export function buildEngineerMetrics(input: {
  projects: EngineerProject[];
  tasks: EngineerTask[];
  reports: EngineerReport[];
  materialRequestCount: number;
  activities: EngineerActivity[];
  today?: string;
}) {
  const today = input.today ?? manilaDateKey();
  const activeProjects = input.projects.filter((project) => project.status !== "completed");
  const overallProgress = activeProjects.length
    ? Math.round(activeProjects.reduce((total, project) => total + project.reported_progress, 0) / activeProjects.length)
    : 0;
  const dueTasks = input.tasks.filter((task) => isTaskOpen(task.status) && task.due_date && task.due_date <= today);
  const dueReports = input.reports.filter((report) => report.status !== "accepted" && report.due_date && report.due_date <= today);
  const todayUpdates = input.activities.filter((activity) => manilaDateKey(new Date(activity.created_at)) === today);

  return {
    overallProgress,
    activeProjects: activeProjects.length,
    tasksDueToday: dueTasks.length,
    overdueTasks: dueTasks.filter((task) => isPastDate(task.due_date, today)).length,
    reportsDue: dueReports.length,
    overdueReports: dueReports.filter((report) => isPastDate(report.due_date, today)).length,
    materialRequests: input.materialRequestCount,
    siteUpdates: todayUpdates.length,
  };
}

export function rankProjectsForAttention(projects: EngineerProject[], materialRequestCounts: Map<string, number>) {
  return [...projects]
    .filter((project) => project.status !== "completed")
    .sort((left, right) => {
      const score = (project: EngineerProject) =>
        (project.schedule_status === "delayed" ? 100 : project.schedule_status === "at_risk" ? 50 : 0) +
        Math.max(0, project.planned_progress - project.reported_progress) * 2 +
        (materialRequestCounts.get(project.id) ?? 0) * 5 +
        (project.tasks.some((task) => task.status === "blocked") ? 25 : 0) -
        Math.min(30, daysFromToday(project.target_date));
      return score(right) - score(left);
    });
}

export function getNextProjectActivity(project: EngineerProject) {
  const nextTask = project.tasks
    .filter((task) => task.status !== "completed")
    .sort((left, right) => (left.due_date ?? "9999-12-31").localeCompare(right.due_date ?? "9999-12-31"))[0];
  return nextTask ?? null;
}

export function getProjectDelayDays(project: EngineerProject) {
  if (project.schedule_status !== "delayed") return 0;
  return Math.max(1, project.planned_progress - project.reported_progress);
}

import type { MaterialRequest, OperationsProject, ProjectHealth, ProjectPortfolioRow } from "@/features/operations/types";

export function formatOperationsDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function taskCompletion(tasks: Array<{ status: string }> = []) {
  if (!tasks.length) return { completed: 0, total: 0, percent: 0 };
  const completed = tasks.filter(task => task.status === "completed").length;
  return { completed, total: tasks.length, percent: Math.round((completed / tasks.length) * 100) };
}

export function isOverdue(value: string | null, done = false) {
  return Boolean(value && !done && new Date(`${value}T23:59:59`) < new Date());
}

export function buildProjectPortfolioRow(project: OperationsProject): ProjectPortfolioRow {
  const latestUpdate = [...(project.updates ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  const tasks = taskCompletion(project.tasks);
  const completedMilestones = project.milestones?.filter((milestone) => milestone.is_completed).length ?? 0;
  const totalMilestones = project.milestones?.length ?? 0;

  return {
    project,
    health: getProjectHealth(project, latestUpdate?.blockers ?? null),
    latestUpdate,
    completedTasks: tasks.completed,
    totalTasks: tasks.total,
    completedMilestones,
    totalMilestones,
  };
}

export function getProjectHealth(project: OperationsProject, latestBlocker?: string | null): ProjectHealth {
  if (project.status === "completed") return "completed";
  if (project.status === "on_hold" || project.tasks?.some((task) => task.status === "blocked")) return "blocked";
  if (isOverdue(project.target_date)) return "overdue";

  const hasOverdueTask = project.tasks?.some((task) => isOverdue(task.due_date, task.status === "completed"));
  const hasFlaggedUpdate = project.updates?.some((update) => update.is_flagged);
  if (latestBlocker || hasOverdueTask || hasFlaggedUpdate) return "at_risk";
  return "on_track";
}

export function formatProjectHealth(health: ProjectHealth) {
  return health === "on_track" ? "On Track" : health === "at_risk" ? "At Risk" : health.charAt(0).toUpperCase() + health.slice(1);
}

export function projectHealthClasses(health: ProjectHealth) {
  if (health === "overdue" || health === "blocked") return "bg-[#fde9ea] text-[#c72f3b]";
  if (health === "at_risk") return "bg-[#fff3dc] text-[#b56d00]";
  if (health === "completed") return "bg-slate-100 text-slate-600";
  return "bg-[#e4f3e8] text-[#176a39]";
}

function parseDate(value: string) {
  return new Date(`${value.slice(0, 10)}T23:59:59`);
}

export function daysUntil(value: string) {
  const now = new Date();
  const end = parseDate(value);
  return Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
}

export function formatDueDistance(value: string) {
  const days = daysUntil(value);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

export function formatRequestAge(value: string) {
  const created = new Date(value);
  const days = Math.max(0, Math.floor((Date.now() - created.getTime()) / 86_400_000));
  if (days === 0) return "Requested today";
  return `Requested ${days} day${days === 1 ? "" : "s"} ago`;
}

export function getApprovalTone(request: MaterialRequest) {
  if (daysUntil(request.needed_by) < 0) return { label: "Overdue", tone: "danger" as const };
  if (request.priority === "urgent" || daysUntil(request.needed_by) <= 1) return { label: "At Risk", tone: "warning" as const };
  return { label: request.priority === "high" ? "High" : "Pending", tone: "neutral" as const };
}

export function isPurchaseException(request: MaterialRequest) {
  if (request.status === "partially_delivered") return true;
  return ["assigned", "ordered"].includes(request.status) && (daysUntil(request.needed_by) <= 1 || request.priority === "urgent");
}

export function getPurchaseExceptionTone(request: MaterialRequest) {
  if (request.status === "partially_delivered") return { label: "Short delivery", tone: "danger" as const };
  if (request.status === "assigned") return { label: "Unordered", tone: "warning" as const };
  return { label: "Delivery risk", tone: "warning" as const };
}

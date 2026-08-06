import type {
  EngineerDashboardAlert,
  EngineerDashboardEstimate,
  EngineerDashboardMaterialRequest,
  EngineerDashboardProject,
} from "@/features/engineer-dashboard/types";

export function calculateWeightedProgress(
  activities: Array<{ weight_percent: number; progress_percent: number }>,
) {
  const totalWeight = activities.reduce(
    (sum, activity) => sum + Number(activity.weight_percent || 0),
    0,
  );
  if (totalWeight <= 0) return 0;
  const weightedProgress = activities.reduce(
    (sum, activity) =>
      sum +
      Number(activity.weight_percent || 0) *
        Number(activity.progress_percent || 0),
    0,
  );
  return Math.max(0, Math.min(100, Math.round(weightedProgress / totalWeight)));
}

export function calculateActualSpending(
  budgets: Array<{ budget_items?: Array<{ actual_spent: number }> }> | null,
) {
  return (budgets ?? [])
    .flatMap((budget) => budget.budget_items ?? [])
    .reduce((sum, item) => sum + Number(item.actual_spent || 0), 0);
}

export function buildEngineerDashboardAlerts(params: {
  projects: EngineerDashboardProject[];
  requests: EngineerDashboardMaterialRequest[];
  estimates: EngineerDashboardEstimate[];
  today?: Date;
}): EngineerDashboardAlert[] {
  const now = params.today ?? new Date();
  const estimateAlerts = params.estimates
    .filter((estimate) => estimate.status === "rejected")
    .map((estimate) => ({
      id: `estimate-${estimate.id}`,
      projectId: estimate.projectId,
      title: "Estimate returned for revision",
      detail: estimate.rejectionReason || `${estimate.projectName} needs an updated estimate.`,
      kind: "estimate" as const,
      createdAt: estimate.updatedAt,
      href: "/cost-estimator",
    }));
  const materialAlerts = params.requests
    .filter((request) => request.status === "rejected")
    .map((request) => ({
      id: `material-${request.id}`,
      projectId: request.projectId,
      title: "Material request needs attention",
      detail: `${request.materialName} for ${request.projectName} was rejected.`,
      kind: "material" as const,
      createdAt: request.createdAt,
      href: "/request-material",
    }));
  const scheduleAlerts = params.projects
    .filter(
      (project) =>
        project.status !== "completed" &&
        project.progress < 100 &&
        new Date(`${project.endDate}T23:59:59`).getTime() < now.getTime(),
    )
    .map((project) => ({
      id: `schedule-${project.id}`,
      projectId: project.id,
      title: "Project is beyond its target date",
      detail: `${project.name} is ${project.progress}% complete.`,
      kind: "schedule" as const,
      createdAt: project.endDate,
      href: `/projects/${project.id}`,
    }));
  return [...estimateAlerts, ...materialAlerts, ...scheduleAlerts].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function formatDashboardCurrency(value: number, currency = "PHP") {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDashboardDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

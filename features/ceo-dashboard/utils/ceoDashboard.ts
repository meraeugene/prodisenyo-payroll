import type {
  CeoActivityItem,
  CeoApprovalSummary,
  CeoAttentionItem,
  CeoDashboardData,
  CeoDashboardProject,
} from "@/features/ceo-dashboard/types";

export function getCeoDashboardTotals(data: CeoDashboardData) {
  const totalBudget = data.projects.reduce((sum, project) => sum + project.budget, 0);
  const estimatedCost = data.projects.reduce(
    (sum, project) => sum + project.estimatedCost,
    0,
  );
  const totalSpent = data.projects.reduce((sum, project) => sum + project.spent, 0);
  const materialApprovalCount = data.materialRequests.filter(
    (request) => request.status === "submitted",
  ).length;
  const estimateApprovalCount = data.estimates.filter(
    (estimate) => estimate.status === "submitted",
  ).length;

  return {
    activeProjects: data.projects.filter((project) => project.status === "active").length,
    completedProjects: data.projects.filter((project) => project.status === "completed").length,
    totalBudget,
    estimatedCost,
    totalSpent,
    remainingBudget: totalBudget - totalSpent,
    materialApprovalCount,
    estimateApprovalCount,
    pendingApprovals:
      materialApprovalCount +
      estimateApprovalCount +
      data.payrollApprovalCount +
      data.overtimeApprovalCount,
  };
}

export function buildCeoApprovalQueue(data: CeoDashboardData): CeoApprovalSummary[] {
  const totals = getCeoDashboardTotals(data);
  return [
    {
      label: "Material Requests",
      detail: "Submitted requests awaiting CEO review",
      count: totals.materialApprovalCount,
      href: "/material-approvals",
      tone: "emerald",
    },
    {
      label: "Project Estimates",
      detail: "Submitted estimates awaiting a decision",
      count: totals.estimateApprovalCount,
      href: "/estimate-approvals",
      tone: "amber",
    },
    {
      label: "Payroll Reports",
      detail: "Submitted payroll periods",
      count: data.payrollApprovalCount,
      href: "/payroll-approvals",
      tone: "sky",
    },
    {
      label: "Overtime Requests",
      detail: "Pending overtime requests",
      count: data.overtimeApprovalCount,
      href: "/overtime-approvals",
      tone: "rose",
    },
  ];
}

export function getCeoReviewApprovalsHref(items: CeoApprovalSummary[]) {
  const pendingItems = items.filter((item) => item.count > 0);

  return pendingItems.length === 1 ? pendingItems[0].href : "#approval-queue";
}

export function buildCeoAttentionItems(
  projects: CeoDashboardProject[],
  now = new Date(),
): CeoAttentionItem[] {
  return projects.flatMap((project) => {
    const items: CeoAttentionItem[] = [];
    const endTime = Date.parse(project.endDate + "T23:59:59");
    if (
      project.status !== "completed" &&
      project.progress < 100 &&
      Number.isFinite(endTime) &&
      endTime < now.getTime()
    ) {
      items.push({
        id: "schedule-" + project.id,
        label: "Target date passed",
        detail: project.name + " is " + project.progress + "% complete.",
        href: "/projects/" + project.id,
        tone: "rose",
      });
    }
    if (project.budget > 0 && project.spent > project.budget) {
      items.push({
        id: "budget-" + project.id,
        label: "Budget ceiling exceeded",
        detail: project.name,
        href: "/projects/" + project.id,
        tone: "amber",
      });
    }
    return items;
  });
}

export function buildCeoRecentActivity(data: CeoDashboardData): CeoActivityItem[] {
  return [
    ...data.progressUpdates.map((update) => ({
      id: "progress-" + update.id,
      type: "progress" as const,
      title: update.projectName + " progress updated to " + update.overallPercent + "%",
      detail: update.summary,
      actor: update.engineer,
      createdAt: update.createdAt,
      href: "/projects/" + update.projectId,
    })),
    ...data.materialRequests.map((request) => ({
      id: "material-" + request.id,
      type: "material" as const,
      title: request.materialName + " request",
      detail: request.projectName + " · " + request.status.replaceAll("_", " "),
      actor: "Material workflow",
      createdAt: request.updatedAt || request.createdAt,
      href: "/projects/" + request.projectId,
    })),
    ...data.estimates.map((estimate) => ({
      id: "estimate-" + estimate.id,
      type: "estimate" as const,
      title: estimate.projectName + " estimate " + estimate.status,
      detail: "Project estimate workflow",
      actor: "Estimate workflow",
      createdAt: estimate.updatedAt,
      href: estimate.projectId ? "/projects/" + estimate.projectId : "/estimate-approvals",
    })),
    ...data.documents.map((document) => ({
      id: "document-" + document.id,
      type: "document" as const,
      title: document.fileName + " uploaded",
      detail: document.projectName,
      actor: document.uploader,
      createdAt: document.createdAt,
      href: "/projects/" + document.projectId,
    })),
  ]
    .filter((item) => Number.isFinite(Date.parse(item.createdAt)))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export function formatCeoCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCeoDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

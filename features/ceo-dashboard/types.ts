import type { ProjectRecord } from "@/features/projects/types";

export type CeoApprovalSummary = {
  label: string;
  detail: string;
  count: number;
  href: string;
  tone: "emerald" | "amber" | "sky" | "rose";
};

export type CeoDashboardData = {
  projects: ProjectRecord[];
  activeProjects: number;
  completedProjects: number;
  pendingApprovals: number;
  totalBudget: number;
  totalSpent: number;
  approvalQueue: CeoApprovalSummary[];
};

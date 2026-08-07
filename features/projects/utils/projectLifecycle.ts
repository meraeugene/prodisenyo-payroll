import type { ProjectStatus } from "@/features/projects/types";

export type ProjectLifecycleRole = "ceo" | "engineer";

export function getProjectEntryHref(params: {
  role: ProjectLifecycleRole;
  projectId: string;
  status: ProjectStatus;
}) {
  if (params.role === "engineer" && params.status === "planning") {
    return `/cost-estimator?projectId=${params.projectId}`;
  }
  return `/projects/${params.projectId}`;
}

export function getProjectEntryLabel(
  role: ProjectLifecycleRole,
  status: ProjectStatus,
) {
  if (status !== "planning") return "View Details";
  return role === "engineer" ? "Cost Estimate" : "Review Estimate";
}

export function canUseOperationalMutations(status: ProjectStatus) {
  return status === "active" || status === "on_hold";
}

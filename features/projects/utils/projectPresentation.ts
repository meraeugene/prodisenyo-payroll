import type { ProjectRecord } from "@/features/projects/types";

export type ProjectStatusTone = "emerald" | "amber" | "rose" | "slate";

export function formatProjectCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getProjectStatusPresentation(project: ProjectRecord): {
  label: string;
  tone: ProjectStatusTone;
} {
  if (project.status === "completed") {
    return { label: "Completed", tone: "emerald" };
  }
  if (project.status === "on_hold") {
    return { label: "On Hold", tone: "rose" };
  }
  if (project.status === "planning") {
    return { label: "Planning", tone: "amber" };
  }
  if (project.spent > project.budget) {
    return { label: "Over Budget", tone: "rose" };
  }
  return { label: "On Track", tone: "emerald" };
}

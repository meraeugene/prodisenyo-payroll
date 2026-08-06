export interface ProjectScheduleSummary {
  state: "completed" | "overdue" | "remaining" | "unavailable";
  label: string;
  helper: string;
}

export function buildProjectScheduleSummary(params: {
  status: string;
  progress: number;
  endDate: string;
  now?: Date;
}): ProjectScheduleSummary {
  const endDate = new Date(`${params.endDate}T23:59:59`);
  if (Number.isNaN(endDate.getTime())) {
    return { state: "unavailable", label: "Not available", helper: "No valid target date" };
  }
  if (params.status === "completed" || params.progress >= 100) {
    return { state: "completed", label: "Completed", helper: `Target: ${params.endDate}` };
  }
  const now = params.now ?? new Date();
  const days = Math.ceil((endDate.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) {
    const overdueDays = Math.abs(days);
    return {
      state: "overdue",
      label: `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`,
      helper: `Target: ${params.endDate}`,
    };
  }
  return {
    state: "remaining",
    label: `${days} day${days === 1 ? "" : "s"} remaining`,
    helper: `Target: ${params.endDate}`,
  };
}

export type ProjectWorkflowActivity = {
  id: string;
  type: "progress" | "material";
  title: string;
  detail: string;
  createdAt: string;
};

export function buildProjectWorkflowActivity(params: {
  submissions: Array<{ id: string; activity_count: number; submitted_at: string }>;
  requests: Array<{ id: string; material_name: string; status: string; created_at: string }>;
}): ProjectWorkflowActivity[] {
  return [
    ...params.submissions.map((submission) => ({
      id: `progress-${submission.id}`,
      type: "progress" as const,
      title: "Current progress submitted",
      detail: `${submission.activity_count} weighted activit${submission.activity_count === 1 ? "y" : "ies"} included.`,
      createdAt: submission.submitted_at,
    })),
    ...params.requests.map((request) => ({
      id: `material-${request.id}`,
      type: "material" as const,
      title: `Material request ${request.status}`,
      detail: request.material_name,
      createdAt: request.created_at,
    })),
  ]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 6);
}

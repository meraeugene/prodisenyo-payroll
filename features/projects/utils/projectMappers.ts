import type { ProjectRecord } from "../types";

type ProjectRow = {
  id: string; name: string; location: string; client_name: string | null;
  subject: string | null; lead: string | null; assigned_engineer_id: string | null;
  assigned_estimate_engineer_id: string | null;
  status: "planning" | "active" | "on_hold" | "completed" | "archived";
  budget_ceiling: number; start_date: string; end_date: string; description: string | null;
  image_url: string | null; engineer?: { full_name: string | null; username: string } | null;
  estimate_engineer?: { full_name: string | null; username: string } | null;
  progress?: Array<{ weight_percent: number; progress_percent: number }>;
  budget?: Array<{ budget_items?: Array<{ actual_spent: number }> }>;
};

export function mapProjectRow(row: ProjectRow): ProjectRecord {
  const activities = row.progress ?? [];
  const totalWeight = activities.reduce((sum, item) => sum + Number(item.weight_percent), 0);
  const weighted = activities.reduce((sum, item) => sum + Number(item.weight_percent) * Number(item.progress_percent), 0);
  const progress = totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;
  const spent = (row.budget ?? []).flatMap((item) => item.budget_items ?? []).reduce((sum, item) => sum + Number(item.actual_spent), 0);
  const engineer = row.engineer?.full_name || row.engineer?.username || "Unassigned";
  const estimateEngineer = row.estimate_engineer?.full_name || row.estimate_engineer?.username || engineer;
  return {
    id: row.id, name: row.name, location: row.location, client: row.client_name ?? "",
    subject: row.subject ?? "", lead: row.lead ?? "", status: row.status === "archived" ? "on_hold" : row.status,
    budget: Number(row.budget_ceiling), spent, progress, startDate: row.start_date, endDate: row.end_date,
    manager: engineer, engineer, assignedEngineerId: row.assigned_engineer_id,
    estimateEngineer, assignedEstimateEngineerId: row.assigned_estimate_engineer_id, imageUrl: row.image_url,
    tasksCount: activities.length, completedTasksCount: activities.filter((item) => Number(item.progress_percent) >= 100).length,
    materialsCount: 0, description: row.description ?? "",
  };
}

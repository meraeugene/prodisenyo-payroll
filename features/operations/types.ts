export type OperationsProject = {
  id: string; name: string; site: string; description: string | null;
  status: "planning" | "active" | "on_hold" | "completed"; reported_progress: number;
  start_date: string | null; target_date: string | null; lead_engineer_id: string | null;
  lead_engineer?: { full_name: string | null; username: string } | null;
  tasks?: Array<{ id: string; title: string; status: string; due_date: string | null; assignee_id: string | null }>;
  milestones?: Array<{ id: string; title: string; due_date: string | null; is_completed: boolean }>;
  updates?: ProgressUpdate[];
};

export type ProgressUpdate = {
  id: string; project_id: string; progress_percent: number; completed_work: string;
  next_steps: string; blockers: string | null; photo_paths: string[]; is_flagged: boolean;
  created_at: string; author?: { full_name: string | null; username: string } | null;
  comments?: Array<{ id: string; body: string; created_at: string; author?: { full_name: string | null; username: string } | null }>;
};

export type MaterialRequest = {
  id: string; project_id: string | null; task_id: string | null; requested_by: string;
  material_name: string; quantity: number; unit: string; needed_by: string; site: string | null;
  priority: "low" | "medium" | "high" | "urgent"; notes: string | null; status: string;
  assigned_purchaser_id: string | null; supplier: string | null; actual_cost: number | null;
  order_date: string | null; delivery_date: string | null; delivered_quantity: number | null;
  receipt_path: string | null; purchase_notes: string | null; rejection_reason: string | null; created_at: string;
  requester?: { full_name: string | null; username: string } | null;
  purchaser?: { full_name: string | null; username: string } | null;
  project?: { name: string; site: string } | null;
};

export type ProfileOption = { id: string; full_name: string | null; username: string };

export type ProjectHealth = "on_track" | "at_risk" | "overdue" | "blocked" | "completed";

export type ProjectPortfolioRow = {
  project: OperationsProject;
  health: ProjectHealth;
  latestUpdate: ProgressUpdate | null;
  completedTasks: number;
  totalTasks: number;
  completedMilestones: number;
  totalMilestones: number;
};

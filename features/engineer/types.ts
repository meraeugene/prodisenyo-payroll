export const ENGINEER_PROJECT_PHASES = [
  "planning",
  "foundation",
  "structural",
  "finishing",
  "completed",
] as const;

export const ENGINEER_TASK_STATUSES = [
  "todo",
  "in_progress",
  "waiting_approval",
  "blocked",
  "completed",
] as const;

export type EngineerProjectPhase = (typeof ENGINEER_PROJECT_PHASES)[number];
export type EngineerTaskStatus = (typeof ENGINEER_TASK_STATUSES)[number];
export type EngineerTaskPriority = "low" | "medium" | "high" | "urgent";
export type EngineerScheduleStatus = "on_track" | "at_risk" | "delayed";
export type EngineerReportType = "daily" | "weekly" | "accomplishment";
export type EngineerReportStatus = "draft" | "submitted" | "revision_requested" | "accepted";

export type EngineerProfile = {
  id: string;
  full_name: string | null;
  username: string;
};

export type EngineerTask = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: EngineerTaskStatus;
  priority: EngineerTaskPriority;
  progress_percent: number;
  due_date: string | null;
  assignee_id: string | null;
  created_by: string;
  completed_at: string | null;
  attachment_paths: string[];
  created_at: string;
  project?: { id: string; name: string; site: string } | null;
  assigned_by?: EngineerProfile | null;
};

export type EngineerProgressUpdate = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  progress_percent: number;
  report_date: string;
  completed_work: string;
  next_steps: string;
  next_activity: string | null;
  blockers: string | null;
  risks: string | null;
  photo_paths: string[];
  document_paths: string[];
  created_at: string;
  author?: EngineerProfile | null;
};

export type EngineerProject = {
  id: string;
  name: string;
  site: string;
  description: string | null;
  status: "planning" | "active" | "on_hold" | "completed";
  current_phase: EngineerProjectPhase;
  schedule_status: EngineerScheduleStatus;
  reported_progress: number;
  planned_progress: number;
  start_date: string | null;
  target_date: string | null;
  lead_engineer_id: string | null;
  project_code: string | null;
  tasks: EngineerTask[];
  updates: EngineerProgressUpdate[];
  milestones: Array<{ id: string; title: string; due_date: string | null; is_completed: boolean }>;
  image_url: string | null;
};

export type EngineerMaterialRequest = {
  id: string;
  project_id: string | null;
  material_name: string;
  quantity: number;
  unit: string;
  estimated_cost: number | null;
  supplier: string | null;
  reason: string | null;
  priority: EngineerTaskPriority;
  needed_by: string;
  status: string;
  attachment_path: string | null;
  created_at: string;
  project?: { id: string; name: string; site: string } | null;
};

export type EngineerReport = {
  id: string;
  project_id: string;
  author_id: string;
  report_type: EngineerReportType;
  title: string;
  content_json: Record<string, unknown>;
  progress_percent: number;
  issues: string | null;
  recommendations: string | null;
  next_schedule: string | null;
  due_date: string | null;
  status: EngineerReportStatus;
  revision_note: string | null;
  attachment_paths: string[];
  submitted_at: string | null;
  created_at: string;
  project?: { id: string; name: string; site: string } | null;
};

export type EngineerNotification = {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type EngineerActivity = {
  id: string;
  project_id: string;
  event_type: string;
  title: string;
  body: string | null;
  photo_paths: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  project?: { id: string; name: string; site: string } | null;
  actor?: EngineerProfile | null;
};

export type EngineerWorkspaceData = {
  dataSource: "database" | "mock";
  profile: EngineerProfile;
  projects: EngineerProject[];
  tasks: EngineerTask[];
  materialRequests: EngineerMaterialRequest[];
  reports: EngineerReport[];
  notifications: EngineerNotification[];
  activities: EngineerActivity[];
};

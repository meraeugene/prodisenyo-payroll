import type {
  EngineerActivity,
  EngineerMaterialRequest,
  EngineerNotification,
  EngineerProfile,
  EngineerProject,
  EngineerReport,
  EngineerTask,
  EngineerWorkspaceData,
} from "@/features/engineer/types";
import { manilaDateKey } from "@/features/engineer/utils/engineerDashboard";

const CEO: EngineerProfile = { id: "mock-ceo", full_name: "CEO Maria Santos", username: "ceo" };
const FALLBACK_IMAGE = "/engineer-project-fallback.png";

export function shouldUseEngineerMockFallback(environment = process.env.NODE_ENV) {
  return environment === "development";
}

function dateOffset(anchor: string, days: number) {
  const date = new Date(`${anchor}T12:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function timestamp(anchor: string, hour: number, minute: number, dayOffset = 0) {
  const date = dateOffset(anchor, dayOffset);
  return new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+08:00`).toISOString();
}

function task(input: {
  id: string; projectId: string; projectName: string; site: string; title: string;
  status: EngineerTask["status"]; priority: EngineerTask["priority"]; dueDate: string;
  assigneeId: string; progress?: number; description?: string;
}): EngineerTask {
  return {
    id: input.id,
    project_id: input.projectId,
    title: input.title,
    description: input.description ?? "Follow the approved method statement, document findings, and attach site evidence.",
    status: input.status,
    priority: input.priority,
    progress_percent: input.progress ?? 0,
    due_date: input.dueDate,
    assignee_id: input.assigneeId,
    created_by: CEO.id,
    completed_at: input.status === "completed" ? new Date().toISOString() : null,
    attachment_paths: input.priority === "high" ? ["mock-instructions.pdf"] : [],
    created_at: new Date().toISOString(),
    project: { id: input.projectId, name: input.projectName, site: input.site },
    assigned_by: CEO,
  };
}

export function getEngineerMockWorkspaceData(profile: EngineerProfile, anchorDate = new Date()): EngineerWorkspaceData {
  const today = manilaDateKey(anchorDate);
  const plazaId = "mock-project-plaza-verde";
  const schoolId = "mock-project-sta-teresa";
  const clinicId = "mock-project-northpoint";

  const tasks: EngineerTask[] = [
    task({ id: "mock-task-recovery", projectId: plazaId, projectName: "Plaza Verde Residences", site: "Taguig City, Metro Manila", title: "Submit recovery plan for structural delay", status: "blocked", priority: "urgent", dueDate: dateOffset(today, -2), assigneeId: profile.id, progress: 35 }),
    task({ id: "mock-task-rebar", projectId: plazaId, projectName: "Plaza Verde Residences", site: "Taguig City, Metro Manila", title: "Approve rebar change — Tower 1", status: "waiting_approval", priority: "high", dueDate: dateOffset(today, -1), assigneeId: profile.id, progress: 100 }),
    task({ id: "mock-task-columns", projectId: plazaId, projectName: "Plaza Verde Residences", site: "Taguig City, Metro Manila", title: "Measure structural columns — Level 7", status: "in_progress", priority: "high", dueDate: dateOffset(today, -1), assigneeId: profile.id, progress: 60 }),
    task({ id: "mock-task-rfi", projectId: schoolId, projectName: "Sta. Teresa Elementary School — Phase 2", site: "Dasmariñas, Cavite", title: "Resolve classroom ceiling RFI", status: "blocked", priority: "high", dueDate: dateOffset(today, -3), assigneeId: profile.id, progress: 20 }),
    task({ id: "mock-task-report", projectId: plazaId, projectName: "Plaza Verde Residences", site: "Taguig City, Metro Manila", title: "Submit daily progress report", status: "todo", priority: "high", dueDate: today, assigneeId: profile.id }),
    task({ id: "mock-task-delivery", projectId: plazaId, projectName: "Plaza Verde Residences", site: "Taguig City, Metro Manila", title: "Verify concrete delivery", status: "in_progress", priority: "high", dueDate: today, assigneeId: profile.id, progress: 45 }),
    task({ id: "mock-task-inspection", projectId: schoolId, projectName: "Sta. Teresa Elementary School — Phase 2", site: "Dasmariñas, Cavite", title: "Inspect painting works — Building B", status: "todo", priority: "medium", dueDate: today, assigneeId: profile.id }),
    task({ id: "mock-task-validation", projectId: clinicId, projectName: "Northpoint Medical Clinic", site: "Bacolod City, Negros Occidental", title: "Validate MEP shop drawings", status: "waiting_approval", priority: "medium", dueDate: today, assigneeId: profile.id, progress: 100 }),
    task({ id: "mock-task-supplier", projectId: schoolId, projectName: "Sta. Teresa Elementary School — Phase 2", site: "Dasmariñas, Cavite", title: "Coordinate finishing materials with supplier", status: "todo", priority: "medium", dueDate: dateOffset(today, 1), assigneeId: profile.id }),
    task({ id: "mock-task-hvac", projectId: clinicId, projectName: "Northpoint Medical Clinic", site: "Bacolod City, Negros Occidental", title: "Inspect HVAC ducting — Level 2", status: "in_progress", priority: "medium", dueDate: dateOffset(today, 2), assigneeId: profile.id, progress: 55 }),
    task({ id: "mock-task-electrical", projectId: clinicId, projectName: "Northpoint Medical Clinic", site: "Bacolod City, Negros Occidental", title: "Electrical rough-in inspection", status: "completed", priority: "medium", dueDate: dateOffset(today, -1), assigneeId: profile.id, progress: 100 }),
    task({ id: "mock-task-safety", projectId: schoolId, projectName: "Sta. Teresa Elementary School — Phase 2", site: "Dasmariñas, Cavite", title: "Conduct weekly safety walk", status: "completed", priority: "low", dueDate: dateOffset(today, 2), assigneeId: profile.id, progress: 100 }),
  ];

  tasks.forEach((item, index) => {
    item.created_at = timestamp(today, 9, index, -7);
    item.completed_at = item.status === "completed" ? timestamp(today, 16, index, -1) : null;
  });
  const projectTasks = (projectId: string) => tasks.filter((item) => item.project_id === projectId);
  const projects: EngineerProject[] = [
    { id: plazaId, name: "Plaza Verde Residences", site: "Taguig City, Metro Manila", description: "Two-tower residential development with shared podium facilities.", status: "active", current_phase: "structural", schedule_status: "delayed", reported_progress: 56, planned_progress: 64, start_date: dateOffset(today, -210), target_date: dateOffset(today, 151), lead_engineer_id: profile.id, project_code: "PRO-2025-018", tasks: projectTasks(plazaId), milestones: [{ id: "mock-milestone-plaza", title: "Tower 1 structural frame", due_date: dateOffset(today, 18), is_completed: false }], updates: [{ id: "mock-update-plaza", project_id: plazaId, title: "Tower 1 column works completed", description: "Structural accomplishment update", progress_percent: 56, report_date: today, completed_work: "5F slab formwork and Level 7 column casting completed.", next_steps: "Proceed with beam and slab preparation.", next_activity: "High-rise Tower 1 5F slab concrete pour", blockers: "Two rain interruptions affected the planned cycle.", risks: "Rebar delivery lead time remains tight.", photo_paths: [], document_paths: [], created_at: timestamp(today, 7, 21), author: profile }], image_url: FALLBACK_IMAGE },
    { id: schoolId, name: "Sta. Teresa Elementary School — Phase 2", site: "Dasmariñas, Cavite", description: "New classroom building and campus finishing works.", status: "active", current_phase: "finishing", schedule_status: "at_risk", reported_progress: 38, planned_progress: 41, start_date: dateOffset(today, -130), target_date: dateOffset(today, 136), lead_engineer_id: profile.id, project_code: "PRO-2025-027", tasks: projectTasks(schoolId), milestones: [{ id: "mock-milestone-school", title: "Building B interior finishes", due_date: dateOffset(today, 28), is_completed: false }], updates: [{ id: "mock-update-school", project_id: schoolId, title: "Building B second coat ongoing", description: null, progress_percent: 38, report_date: today, completed_work: "Painting works progressed through the east classrooms.", next_steps: "Complete snagging and ceiling coordination.", next_activity: "Painting — Building B second coat", blockers: null, risks: "Ceiling RFI may affect turnover.", photo_paths: [], document_paths: [], created_at: timestamp(today, 6, 43), author: profile }], image_url: FALLBACK_IMAGE },
    { id: clinicId, name: "Northpoint Medical Clinic", site: "Bacolod City, Negros Occidental", description: "Medical clinic fit-out and MEP installation package.", status: "active", current_phase: "structural", schedule_status: "on_track", reported_progress: 32, planned_progress: 30, start_date: dateOffset(today, -90), target_date: dateOffset(today, 60), lead_engineer_id: profile.id, project_code: "PRO-2025-033", tasks: projectTasks(clinicId), milestones: [{ id: "mock-milestone-clinic", title: "MEP rough-in completion", due_date: dateOffset(today, 20), is_completed: false }], updates: [{ id: "mock-update-clinic", project_id: clinicId, title: "HVAC ducting installation progressing", description: null, progress_percent: 32, report_date: today, completed_work: "Level 2 main duct runs installed and inspected.", next_steps: "Install branch duct connections.", next_activity: "HVAC ducting — Level 2 installation", blockers: null, risks: null, photo_paths: [], document_paths: [], created_at: timestamp(today, 7, 52), author: profile }], image_url: FALLBACK_IMAGE },
  ];

  const projectRef = (id: string) => { const project = projects.find((item) => item.id === id)!; return { id, name: project.name, site: project.site }; };
  const requestSpecs = [
    ["rebar", plazaId, "16mm Reinforcing Bars", 22, "tons", 1245600, "pending"],
    ["formworks", plazaId, "Phenolic Formwork Panels", 180, "sheets", 238750, "approved"],
    ["paint", schoolId, "Low-VOC Interior Paint", 120, "pails", 384000, "pending"],
    ["ceiling", schoolId, "Acoustic Ceiling Boards", 260, "pcs", 182000, "assigned"],
    ["duct", clinicId, "Pre-insulated HVAC Duct", 420, "sq.m", 665000, "ordered"],
    ["sprinkler", clinicId, "Fire Sprinkler Heads", 96, "pcs", 148000, "delivered"],
  ] as const;
  const materialRequests: EngineerMaterialRequest[] = requestSpecs.map(([suffix, projectId, material, quantity, unit, cost, status], index) => ({ id: `mock-request-${suffix}`, project_id: projectId, material_name: material, quantity, unit, estimated_cost: cost, supplier: index % 2 ? "BuildSource Trading" : null, reason: "Required for the next scheduled site activity.", priority: index < 2 ? "urgent" : index < 4 ? "high" : "medium", needed_by: dateOffset(today, index - 1), status, attachment_path: null, created_at: timestamp(today, 10, index * 4, -index), project: projectRef(projectId) }));

  const reports: EngineerReport[] = [
    { id: "mock-report-daily", project_id: plazaId, author_id: profile.id, report_type: "daily", title: "Daily Progress Report — Plaza Verde", content_json: { type: "doc", content: [] }, progress_percent: 56, issues: "Rain interruption", recommendations: "Add a recovery shift", next_schedule: "Slab pour preparation", due_date: dateOffset(today, -1), status: "revision_requested", revision_note: "Add the updated manpower count.", attachment_paths: [], submitted_at: timestamp(today, 16, 0, -1), created_at: timestamp(today, 14, 0, -1), project: projectRef(plazaId) },
    { id: "mock-report-weekly", project_id: schoolId, author_id: profile.id, report_type: "weekly", title: "Weekly Safety Report — Sta. Teresa", content_json: { type: "doc", content: [] }, progress_percent: 38, issues: null, recommendations: "Continue daily toolbox meetings", next_schedule: "Building B safety inspection", due_date: today, status: "draft", revision_note: null, attachment_paths: [], submitted_at: null, created_at: timestamp(today, 9, 0), project: projectRef(schoolId) },
    { id: "mock-report-material", project_id: clinicId, author_id: profile.id, report_type: "accomplishment", title: "Site Accomplishment Report — Northpoint", content_json: { type: "doc", content: [] }, progress_percent: 32, issues: null, recommendations: "Confirm next delivery batch", next_schedule: "HVAC branch connections", due_date: today, status: "draft", revision_note: null, attachment_paths: [], submitted_at: null, created_at: timestamp(today, 8, 30), project: projectRef(clinicId) },
  ];

  const activities: EngineerActivity[] = [
    { id: "mock-activity-hvac", project_id: clinicId, event_type: "progress_update", title: "HVAC ducting — Level 2 installation in progress", body: "Main duct runs inspected.", photo_paths: [], created_at: timestamp(today, 7, 52), project: projectRef(clinicId), actor: profile },
    { id: "mock-activity-columns", project_id: plazaId, event_type: "task_completed", title: "Tower 1 — 5F slab formwork completed", body: null, photo_paths: [], created_at: timestamp(today, 7, 21), project: projectRef(plazaId), actor: { id: "mock-foreman", full_name: "Luis A. (Foreman)", username: "foreman" } },
    { id: "mock-activity-paint", project_id: schoolId, event_type: "progress_update", title: "Painting — Building B second coat ongoing", body: null, photo_paths: [], created_at: timestamp(today, 6, 43), project: projectRef(schoolId), actor: profile },
    { id: "mock-activity-delivery", project_id: plazaId, event_type: "delivery_received", title: "Rebar delivery received at site", body: null, photo_paths: [], created_at: timestamp(today, 6, 10), project: projectRef(plazaId), actor: { id: "mock-materials", full_name: "Materials Team", username: "materials" } },
    { id: "mock-activity-inspection", project_id: clinicId, event_type: "task_completed", title: "Electrical rough-in inspection passed", body: null, photo_paths: [], created_at: timestamp(today, 5, 35), project: projectRef(clinicId), actor: profile },
  ];

  const notifications: EngineerNotification[] = [
    { id: "mock-notification-task", recipient_id: profile.id, type: "task_assigned", title: "New CEO task assigned", body: "Verify concrete delivery for Plaza Verde before the morning pour.", href: "/engineer/tasks", entity_type: "task", entity_id: "mock-task-delivery", read_at: null, created_at: timestamp(today, 8, 5) },
    { id: "mock-notification-approved", recipient_id: profile.id, type: "material_approved", title: "Formwork request approved", body: "Purchasing has been assigned to process the request.", href: "/engineer/material-requests", entity_type: "material_request", entity_id: "mock-request-formworks", read_at: null, created_at: timestamp(today, 7, 40) },
    { id: "mock-notification-report", recipient_id: profile.id, type: "report_revision", title: "Daily report requires revision", body: "Add the updated manpower count.", href: "/engineer/reports", entity_type: "report", entity_id: "mock-report-daily", read_at: null, created_at: timestamp(today, 7, 15) },
    { id: "mock-notification-overdue", recipient_id: profile.id, type: "task_overdue", title: "Recovery plan is overdue", body: "Plaza Verde Residences", href: "/engineer/tasks", entity_type: "task", entity_id: "mock-task-recovery", read_at: null, created_at: timestamp(today, 6, 30) },
    { id: "mock-notification-report-due", recipient_id: profile.id, type: "report_deadline", title: "Weekly safety report due today", body: "Sta. Teresa Elementary School", href: "/engineer/reports", entity_type: "report", entity_id: "mock-report-weekly", read_at: null, created_at: timestamp(today, 6, 0) },
    { id: "mock-notification-material", recipient_id: profile.id, type: "material_deadline", title: "Paint request awaiting approval", body: "Required before finishing works continue.", href: "/engineer/material-requests", entity_type: "material_request", entity_id: "mock-request-paint", read_at: null, created_at: timestamp(today, 5, 30) },
    { id: "mock-notification-read", recipient_id: profile.id, type: "task_assigned", title: "Site inspection scheduled", body: "Northpoint Medical Clinic", href: "/engineer/tasks", entity_type: "task", entity_id: "mock-task-hvac", read_at: timestamp(today, 5, 15), created_at: timestamp(today, 5, 0) },
  ];

  return { dataSource: "mock", profile, projects, tasks, materialRequests, reports, notifications, activities };
}

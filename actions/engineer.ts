"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { ENGINEER_TASK_STATUSES, type EngineerTaskStatus } from "@/features/engineer/types";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const EVIDENCE_BUCKET = "operations-evidence";
const database = () => createSupabaseAdminClient() as any;
const clean = (value: FormDataEntryValue | string | null | undefined) => String(value ?? "").trim();
const optional = (value: FormDataEntryValue | string | null | undefined) => clean(value) || null;
const dateValue = (value: FormDataEntryValue | null) => /^\d{4}-\d{2}-\d{2}$/.test(clean(value)) ? clean(value) : null;

function refreshEngineer(projectId?: string) {
  ["/engineer", "/engineer/projects", "/engineer/tasks", "/engineer/material-requests", "/engineer/reports", "/engineer/notifications"].forEach((path) => revalidatePath(path));
  if (projectId) revalidatePath(`/engineer/projects/${projectId}`);
}

async function requireAssignedProject(userId: string, projectId: string) {
  const db = database();
  const [{ data: project }, { data: member }] = await Promise.all([
    db.from("operations_projects").select("id,name,site,current_phase,lead_engineer_id").eq("id", projectId).maybeSingle(),
    db.from("operations_project_members").select("project_id").eq("project_id", projectId).eq("profile_id", userId).maybeSingle(),
  ]);
  if (!project || (project.lead_engineer_id !== userId && !member)) throw new Error("You are not assigned to this project.");
  return project;
}

async function uploadFiles(input: { files: FormDataEntryValue[]; folder: string; accept: (type: string) => boolean }) {
  const db = database();
  const uploaded: string[] = [];
  try {
    for (const entry of input.files) {
      if (!(entry instanceof File) || entry.size === 0) continue;
      if (entry.size > MAX_FILE_BYTES || !input.accept(entry.type)) throw new Error("Attachments must be an accepted file type and 10 MB or less.");
      const safeName = entry.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${input.folder}/${randomUUID()}-${safeName}`;
      const { error } = await db.storage.from(EVIDENCE_BUCKET).upload(path, entry, { contentType: entry.type });
      if (error) throw new Error(error.message);
      uploaded.push(path);
    }
    return uploaded;
  } catch (error) {
    if (uploaded.length) await db.storage.from(EVIDENCE_BUCKET).remove(uploaded);
    throw error;
  }
}

async function removeUploaded(paths: string[]) {
  if (paths.length) await database().storage.from(EVIDENCE_BUCKET).remove(paths);
}

async function addActivity(input: { projectId: string; actorId: string; eventType: string; title: string; body?: string | null; photoPaths?: string[]; metadata?: Record<string, unknown> }) {
  await database().from("operations_activity_events").insert({
    project_id: input.projectId,
    actor_id: input.actorId,
    event_type: input.eventType,
    title: input.title,
    body: input.body ?? null,
    photo_paths: input.photoPaths ?? [],
    metadata: input.metadata ?? {},
  });
}

export async function updateEngineerTaskAction(input: { taskId: string; status: EngineerTaskStatus; progressPercent?: number }) {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  if (!ENGINEER_TASK_STATUSES.includes(input.status)) throw new Error("Select a valid task status.");
  const progress = Math.round(Number(input.progressPercent ?? (input.status === "completed" ? 100 : 0)));
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) throw new Error("Task progress must be between 0 and 100.");
  const db = database();
  const { data: task } = await db.from("operations_tasks").select("id,title,project_id,assignee_id,status").eq("id", input.taskId).maybeSingle();
  if (!task || task.assignee_id !== user.id) throw new Error("You can only update tasks assigned to you.");
  await requireAssignedProject(user.id, task.project_id);
  const { error } = await db.from("operations_tasks").update({
    status: input.status,
    progress_percent: progress,
    completed_at: input.status === "completed" ? new Date().toISOString() : null,
  }).eq("id", task.id);
  if (error) throw new Error(error.message);
  await addActivity({ projectId: task.project_id, actorId: user.id, eventType: input.status === "completed" ? "task_completed" : "task_updated", title: input.status === "completed" ? `${task.title} completed` : `${task.title} updated`, body: `${progress}% complete` });
  refreshEngineer(task.project_id);
}

export async function addEngineerTaskCommentAction(formData: FormData) {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const taskId = clean(formData.get("taskId"));
  const body = clean(formData.get("body"));
  if (!taskId || !body) throw new Error("A comment is required.");
  const db = database();
  const { data: task } = await db.from("operations_tasks").select("project_id,assignee_id").eq("id", taskId).maybeSingle();
  if (!task || task.assignee_id !== user.id) throw new Error("You can only comment on assigned tasks.");
  const paths = await uploadFiles({ files: formData.getAll("attachments"), folder: `tasks/${taskId}`, accept: (type) => type.startsWith("image/") || type === "application/pdf" });
  const { error } = await db.from("operations_task_comments").insert({ task_id: taskId, author_id: user.id, body, attachment_paths: paths });
  if (error) { await removeUploaded(paths); throw new Error(error.message); }
  refreshEngineer(task.project_id);
}

export async function submitEngineerProgressUpdateAction(formData: FormData) {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const projectId = clean(formData.get("projectId"));
  const title = clean(formData.get("title"));
  const description = optional(formData.get("description"));
  const completedWork = clean(formData.get("completedWork"));
  const nextSteps = clean(formData.get("nextSteps"));
  const reportDate = dateValue(formData.get("reportDate"));
  const currentPhase = clean(formData.get("currentPhase"));
  const progress = Math.round(Number(formData.get("progressPercent")));
  if (!projectId || !title || !completedWork || !nextSteps || !reportDate || !["planning","foundation","structural","finishing","completed"].includes(currentPhase) || !Number.isFinite(progress) || progress < 0 || progress > 100) throw new Error("Complete all required progress fields.");
  const project = await requireAssignedProject(user.id, projectId);
  const photos = await uploadFiles({ files: formData.getAll("photos"), folder: `progress/${projectId}`, accept: (type) => type.startsWith("image/") });
  const documents = await uploadFiles({ files: formData.getAll("documents"), folder: `progress/${projectId}/documents`, accept: (type) => type === "application/pdf" || type.startsWith("image/") });
  const db = database();
  const { data, error } = await db.from("progress_updates").insert({
    project_id: projectId, author_id: user.id, title, description, report_date: reportDate,
    progress_percent: progress, completed_work: completedWork, next_steps: nextSteps,
    next_activity: optional(formData.get("nextActivity")), blockers: optional(formData.get("issues")),
    risks: optional(formData.get("risks")), photo_paths: photos, document_paths: documents,
  }).select("id").single();
  if (error) { await removeUploaded([...photos, ...documents]); throw new Error(error.message); }
  const { error: projectError } = await db.from("operations_projects").update({ reported_progress: progress, current_phase: currentPhase }).eq("id", projectId);
  if (projectError) {
    await db.from("progress_updates").delete().eq("id", data.id);
    await removeUploaded([...photos, ...documents]);
    throw new Error(projectError.message);
  }
  if (project.current_phase !== currentPhase) {
    await db.from("operations_phase_history").insert({ project_id: projectId, phase: currentPhase, started_at: reportDate, created_by: user.id });
  }
  await addActivity({ projectId, actorId: user.id, eventType: "progress_update", title, body: completedWork, photoPaths: photos, metadata: { progress_update_id: data.id } });
  refreshEngineer(projectId);
  return data;
}

export async function createEngineerMaterialRequestAction(formData: FormData) {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const projectId = clean(formData.get("projectId"));
  const materialName = clean(formData.get("materialName"));
  const quantity = Number(formData.get("quantity"));
  const unit = clean(formData.get("unit"));
  const estimatedCost = Number(formData.get("estimatedCost") || 0);
  const priority = clean(formData.get("priority"));
  const neededBy = dateValue(formData.get("neededBy"));
  const reason = clean(formData.get("reason"));
  if (!projectId || !materialName || !unit || !neededBy || !reason || !["low","medium","high","urgent"].includes(priority) || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(estimatedCost) || estimatedCost < 0) throw new Error("Complete all required material request fields.");
  const project = await requireAssignedProject(user.id, projectId);
  const files = await uploadFiles({ files: [formData.get("attachment")].filter(Boolean) as FormDataEntryValue[], folder: `material-requests/${projectId}`, accept: (type) => type === "application/pdf" || type.startsWith("image/") });
  const db = database();
  const { data, error } = await db.from("material_requests").insert({
    project_id: projectId, requested_by: user.id, material_name: materialName, quantity, unit,
    estimated_cost: estimatedCost || null, supplier: optional(formData.get("supplier")), reason,
    priority, needed_by: neededBy, site: project.site, notes: reason, attachment_path: files[0] ?? null,
  }).select("id").single();
  if (error) { await removeUploaded(files); throw new Error(error.message); }
  await db.from("material_request_history").insert({ request_id: data.id, actor_id: user.id, status: "pending", notes: reason });
  await addActivity({ projectId, actorId: user.id, eventType: "material_request", title: "Material request submitted", body: `${quantity} ${unit} ${materialName}` });
  refreshEngineer(projectId);
  return data;
}

export async function markMaterialReceivedAction(requestId: string) {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const db = database();
  const { data: request } = await db.from("material_requests").select("id,project_id,status,material_name").eq("id", requestId).maybeSingle();
  if (!request?.project_id || request.status !== "delivered") throw new Error("Only delivered materials can be received on site.");
  await requireAssignedProject(user.id, request.project_id);
  const { error } = await db.from("material_requests").update({ status: "received", received_by: user.id, received_at: new Date().toISOString() }).eq("id", requestId);
  if (error) throw new Error(error.message);
  await db.from("material_request_history").insert({ request_id: requestId, actor_id: user.id, status: "received", notes: "Received on site" });
  await addActivity({ projectId: request.project_id, actorId: user.id, eventType: "delivery_received", title: `${request.material_name} received on site` });
  refreshEngineer(request.project_id);
}

export async function saveEngineerReportAction(formData: FormData) {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const reportId = optional(formData.get("reportId"));
  const projectId = clean(formData.get("projectId"));
  const reportType = clean(formData.get("reportType"));
  const title = clean(formData.get("title"));
  const status = clean(formData.get("intent")) === "submit" ? "submitted" : "draft";
  const progress = Math.round(Number(formData.get("progressPercent")));
  let contentJson: Record<string, unknown>;
  try { contentJson = JSON.parse(clean(formData.get("contentJson")) || '{"type":"doc","content":[]}'); } catch { throw new Error("Report content is invalid."); }
  if (!projectId || !title || !["daily","weekly","accomplishment"].includes(reportType) || !Number.isFinite(progress) || progress < 0 || progress > 100) throw new Error("Complete all required report fields.");
  await requireAssignedProject(user.id, projectId);
  const paths = await uploadFiles({ files: formData.getAll("attachments"), folder: `reports/${projectId}`, accept: (type) => type === "application/pdf" || type.startsWith("image/") });
  const payload = {
    project_id: projectId, author_id: user.id, report_type: reportType, title, content_json: contentJson,
    progress_percent: progress, issues: optional(formData.get("issues")), recommendations: optional(formData.get("recommendations")),
    next_schedule: optional(formData.get("nextSchedule")), due_date: dateValue(formData.get("dueDate")), status,
    attachment_paths: paths, submitted_at: status === "submitted" ? new Date().toISOString() : null,
  };
  const db = database();
  const query = reportId
    ? db.from("operations_reports").update(payload).eq("id", reportId).eq("author_id", user.id)
    : db.from("operations_reports").insert(payload);
  const { data, error } = await query.select("id").single();
  if (error) { await removeUploaded(paths); throw new Error(error.message); }
  if (status === "submitted") await addActivity({ projectId, actorId: user.id, eventType: "report_submitted", title: `${title} submitted` });
  refreshEngineer(projectId);
  return data;
}

export async function markEngineerNotificationReadAction(notificationId: string) {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const { error } = await database().from("operations_notifications").update({ read_at: new Date().toISOString() }).eq("id", notificationId).eq("recipient_id", user.id);
  if (error) throw new Error(error.message);
  refreshEngineer();
}

export async function markAllEngineerNotificationsReadAction() {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const { error } = await database().from("operations_notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", user.id).is("read_at", null);
  if (error) throw new Error(error.message);
  refreshEngineer();
}

export async function reviewEngineerReportAction(input: { reportId: string; decision: "accepted" | "revision_requested"; note?: string }) {
  const { user } = await requireRole(APP_ROLES.CEO);
  const note = clean(input.note);
  if (input.decision === "revision_requested" && !note) throw new Error("A revision note is required.");
  const db = database();
  const { data: report } = await db.from("operations_reports").select("id,title,author_id,project_id").eq("id", input.reportId).maybeSingle();
  if (!report) throw new Error("Report not found.");
  const { error } = await db.from("operations_reports").update({ status: input.decision, revision_note: note || null, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", report.id);
  if (error) throw new Error(error.message);
  await db.from("operations_notifications").insert({ recipient_id: report.author_id, actor_id: user.id, type: input.decision === "accepted" ? "report_accepted" : "report_revision", title: input.decision === "accepted" ? `${report.title} accepted` : `${report.title} requires revision`, body: note || null, href: "/engineer/reports", entity_type: "report", entity_id: report.id, dedupe_key: `report-review-${report.id}-${input.decision}-${Date.now()}` });
  refreshEngineer(report.project_id);
}

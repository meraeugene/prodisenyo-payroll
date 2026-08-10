"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const db = () => createSupabaseAdminClient() as any;
const text = (value: unknown) => String(value ?? "").trim();
const nullable = (value: unknown) => text(value) || null;
const dateOrNull = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(text(value)) ? text(value) : null;

function refreshOperations() {
  ["/operations", "/material-approvals", "/purchasing", "/request-material", "/home", "/engineer", "/engineer/projects", "/engineer/tasks", "/engineer/material-requests", "/engineer/notifications"].forEach(path => revalidatePath(path));
}

export async function createOperationsProjectAction(input: {
  name: string; site: string; description?: string; startDate?: string; targetDate?: string;
  leadEngineerId: string; collaboratorIds?: string[];
}) {
  const { user } = await requireRole(APP_ROLES.CEO);
  const name = text(input.name); const site = text(input.site); const leadEngineerId = text(input.leadEngineerId);
  if (!name || !site || !leadEngineerId) throw new Error("Project name, site, and lead engineer are required.");
  const database = db();
  const { data: lead } = await database.from("profiles").select("id, role").eq("id", leadEngineerId).single();
  if (lead?.role !== APP_ROLES.ENGINEER) throw new Error("Lead must be an engineer.");
  const { data, error } = await database.from("operations_projects").insert({
    name, site, description: nullable(input.description), start_date: dateOrNull(input.startDate),
    target_date: dateOrNull(input.targetDate), lead_engineer_id: leadEngineerId, status: "active", created_by: user.id,
  }).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create project.");
  const memberIds = Array.from(new Set([leadEngineerId, ...(input.collaboratorIds ?? [])].filter(Boolean)));
  if (memberIds.length) await database.from("operations_project_members").insert(memberIds.map(profile_id => ({ project_id: data.id, profile_id })));
  refreshOperations(); return data;
}

export async function createMilestoneAction(input: { projectId: string; title: string; dueDate?: string }) {
  const { user } = await requireRole(APP_ROLES.CEO); const title = text(input.title);
  if (!text(input.projectId) || !title) throw new Error("Project and milestone title are required.");
  const { data, error } = await db().from("operations_milestones").insert({ project_id: input.projectId, title, due_date: dateOrNull(input.dueDate), created_by: user.id }).select("*").single();
  if (error) throw new Error(error.message); refreshOperations(); return data;
}

export async function createOperationsTaskAction(input: { projectId: string; title: string; description?: string; assigneeId?: string; milestoneId?: string; dueDate?: string }) {
  const { user } = await requireRole(APP_ROLES.CEO); const title = text(input.title);
  if (!text(input.projectId) || !title) throw new Error("Project and task title are required.");
  const { data, error } = await db().from("operations_tasks").insert({ project_id: input.projectId, title, description: nullable(input.description), assignee_id: nullable(input.assigneeId), milestone_id: nullable(input.milestoneId), due_date: dateOrNull(input.dueDate), created_by: user.id }).select("*").single();
  if (error) throw new Error(error.message);
  if (data?.assignee_id) {
    await db().from("operations_notifications").insert({ recipient_id: data.assignee_id, actor_id: user.id, type: "task_assigned", title: `New task: ${title}`, body: nullable(input.description), href: "/engineer/tasks", entity_type: "task", entity_id: data.id, dedupe_key: `task-assigned-${data.id}` });
  }
  refreshOperations(); return data;
}

export async function updateOperationsTaskStatusAction(taskId: string, status: string) {
  const { user, profile } = await requireRole([APP_ROLES.CEO, APP_ROLES.ENGINEER]);
  if (!["todo","in_progress","waiting_approval","blocked","completed"].includes(status)) throw new Error("Invalid task status.");
  const database = db();
  const { data: task } = await database.from("operations_tasks").select("assignee_id, project_id").eq("id", taskId).single();
  if (profile.role === APP_ROLES.ENGINEER && task?.assignee_id !== user.id) throw new Error("You can only update tasks assigned to you.");
  const { error } = await database.from("operations_tasks").update({ status }).eq("id", taskId);
  if (error) throw new Error(error.message); refreshOperations();
}

export async function submitProgressUpdateAction(formData: FormData) {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const projectId = text(formData.get("projectId")); const progress = Number(formData.get("progressPercent"));
  const completedWork = text(formData.get("completedWork")); const nextSteps = text(formData.get("nextSteps"));
  if (!projectId || !Number.isInteger(progress) || progress < 0 || progress > 100 || !completedWork || !nextSteps) throw new Error("Project, progress, completed work, and next steps are required.");
  const database = db();
  const { data: membership } = await database.from("operations_project_members").select("project_id").eq("project_id", projectId).eq("profile_id", user.id).maybeSingle();
  const { data: project } = await database.from("operations_projects").select("lead_engineer_id").eq("id", projectId).single();
  if (!membership && project?.lead_engineer_id !== user.id) throw new Error("You are not assigned to this project.");
  const paths: string[] = [];
  for (const file of formData.getAll("photos")) {
    if (!(file instanceof File) || file.size === 0) continue;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) throw new Error("Photos must be images up to 10 MB.");
    const path = `progress/${projectId}/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const { error } = await database.storage.from("operations-evidence").upload(path, file, { contentType: file.type });
    if (error) throw new Error(error.message); paths.push(path);
  }
  const { data, error } = await database.from("progress_updates").insert({ project_id: projectId, author_id: user.id, progress_percent: progress, completed_work: completedWork, next_steps: nextSteps, blockers: nullable(formData.get("blockers")), photo_paths: paths }).select("*").single();
  if (error) throw new Error(error.message);
  await database.from("operations_projects").update({ reported_progress: progress }).eq("id", projectId);
  refreshOperations(); return data;
}

export async function commentOnProgressAction(updateId: string, body: string) {
  const { user } = await requireRole(APP_ROLES.CEO); if (!text(body)) throw new Error("Comment is required.");
  const { error } = await db().from("progress_update_comments").insert({ update_id: updateId, author_id: user.id, body: text(body) });
  if (error) throw new Error(error.message); refreshOperations();
}

export async function flagProgressUpdateAction(updateId: string, flagged: boolean) {
  const { user } = await requireRole(APP_ROLES.CEO);
  const { error } = await db().from("progress_updates").update({ is_flagged: flagged, flagged_by: flagged ? user.id : null, flagged_at: flagged ? new Date().toISOString() : null }).eq("id", updateId);
  if (error) throw new Error(error.message); refreshOperations();
}

export async function decideMaterialRequestAction(input: { requestId: string; decision: "approved" | "rejected"; purchaserId?: string; reason?: string }) {
  const { user } = await requireRole(APP_ROLES.CEO); const database = db();
  if (input.decision === "approved" && !text(input.purchaserId)) throw new Error("Assign a purchaser.");
  if (input.decision === "rejected" && !text(input.reason)) throw new Error("Rejection reason is required.");
  const status = input.decision === "approved" ? "assigned" : "rejected";
  const { data: request } = await database.from("material_requests").select("requested_by,material_name").eq("id", input.requestId).maybeSingle();
  const { error } = await database.from("material_requests").update({ status, assigned_purchaser_id: input.decision === "approved" ? input.purchaserId : null, decision_by: user.id, decision_at: new Date().toISOString(), rejection_reason: input.decision === "rejected" ? text(input.reason) : null }).eq("id", input.requestId).eq("status", "pending");
  if (error) throw new Error(error.message);
  await database.from("material_request_history").insert({ request_id: input.requestId, actor_id: user.id, status, notes: nullable(input.reason) });
  if (request?.requested_by) await database.from("operations_notifications").insert({ recipient_id: request.requested_by, actor_id: user.id, type: input.decision === "approved" ? "material_approved" : "material_rejected", title: `${request.material_name} ${input.decision}`, body: nullable(input.reason), href: "/engineer/material-requests", entity_type: "material_request", entity_id: input.requestId, dedupe_key: `material-${input.requestId}-${input.decision}` });
  refreshOperations();
}

export async function updatePurchaseAction(formData: FormData) {
  const { user } = await requireRole(APP_ROLES.PURCHASER); const requestId = text(formData.get("requestId")); const status = text(formData.get("status"));
  if (!["ordered","partially_delivered","delivered"].includes(status)) throw new Error("Invalid purchasing status.");
  const supplier = text(formData.get("supplier")); const actualCost = Number(formData.get("actualCost"));
  if (!supplier || !Number.isFinite(actualCost) || actualCost < 0) throw new Error("Supplier and actual cost are required.");
  const database = db(); let receiptPath: string | undefined;
  const receipt = formData.get("receipt");
  if (receipt instanceof File && receipt.size > 0) {
    if (receipt.size > 10 * 1024 * 1024) throw new Error("Receipt must be 10 MB or less.");
    receiptPath = `receipts/${requestId}/${randomUUID()}-${receipt.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const { error } = await database.storage.from("operations-evidence").upload(receiptPath, receipt, { contentType: receipt.type }); if (error) throw new Error(error.message);
  }
  const updates: Record<string, unknown> = { status, supplier, actual_cost: actualCost, order_date: dateOrNull(formData.get("orderDate")), delivery_date: dateOrNull(formData.get("deliveryDate")), delivered_quantity: Number(formData.get("deliveredQuantity") || 0), purchase_notes: nullable(formData.get("notes")) };
  if (receiptPath) updates.receipt_path = receiptPath;
  const { error } = await database.from("material_requests").update(updates).eq("id", requestId).eq("assigned_purchaser_id", user.id); if (error) throw new Error(error.message);
  await database.from("material_request_history").insert({ request_id: requestId, actor_id: user.id, status, notes: nullable(formData.get("notes")) }); refreshOperations();
}

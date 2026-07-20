"use server";

import { revalidatePath } from "next/cache";
import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/features/projects/types";

export interface ProjectInput {
  name: string; location: string; subject?: string; lead?: string; client?: string;
  engineerId?: string | null; budget: number; startDate: string; endDate: string;
  description?: string; imageUrl?: string;
}

function validate(input: ProjectInput) {
  const name = input.name.trim(); const location = input.location.trim();
  const budget = Math.round(Number(input.budget) * 100) / 100;
  if (!name || !location) throw new Error("Project name and location are required.");
  if (!Number.isFinite(budget) || budget <= 0) throw new Error("Budget must be greater than zero.");
  if (!input.startDate || !input.endDate || input.endDate < input.startDate) throw new Error("Enter a valid project date range.");
  return { name, location, budget };
}

export async function createProjectAction(input: ProjectInput) {
  const { user } = await requireRole(APP_ROLES.CEO);
  const normalized = validate(input); const database = createSupabaseAdminClient() as any;
  const { data, error } = await database.rpc("create_project_with_budget", {
    p_actor: user.id, p_name: normalized.name, p_location: normalized.location,
    p_subject: input.subject?.trim() || null, p_lead: input.lead?.trim() || null,
    p_engineer: input.engineerId || null, p_budget: normalized.budget,
    p_start: input.startDate, p_end: input.endDate, p_client: input.client?.trim() || null,
    p_description: input.description?.trim() || null, p_image_url: input.imageUrl?.trim() || null,
  });
  if (error) throw new Error(`Failed to create project. ${error.message}`);
  revalidatePath("/projects"); return data;
}

export async function updateProjectAction(id: string, input: ProjectInput & { status?: ProjectStatus }) {
  const { user } = await requireRole(APP_ROLES.CEO); const normalized = validate(input);
  const database = createSupabaseAdminClient() as any;
  const payload = { name: normalized.name, location: normalized.location, client_name: input.client?.trim() || null,
    subject: input.subject?.trim() || null, lead: input.lead?.trim() || null, assigned_engineer_id: input.engineerId || null,
    budget_ceiling: normalized.budget, start_date: input.startDate, end_date: input.endDate,
    description: input.description?.trim() || null, image_url: input.imageUrl?.trim() || null, status: input.status ?? "active", updated_by: user.id };
  const { error } = await database.from("projects").update(payload).eq("id", id);
  if (error) throw new Error(`Failed to update project. ${error.message}`);
  const { error: budgetError } = await database.from("budget_projects").update({ name: normalized.name, starting_budget: normalized.budget, updated_by: user.id }).eq("project_id", id);
  if (budgetError) throw new Error(`Project updated but budget sync failed. ${budgetError.message}`);
  revalidatePath("/projects"); revalidatePath(`/projects/${id}`);
}

export async function archiveProjectAction(id: string) {
  const { user } = await requireRole(APP_ROLES.CEO); const database = createSupabaseAdminClient() as any;
  const { error } = await database.from("projects").update({ status: "archived", updated_by: user.id }).eq("id", id);
  if (error) throw new Error(`Failed to archive project. ${error.message}`);
  await database.from("budget_projects").update({ is_archived: true, updated_by: user.id }).eq("project_id", id);
  revalidatePath("/projects");
}

export async function saveProgressActivityAction(input: { id?: string; projectId: string; activity: string; weightPercent: number; progressPercent: number }) {
  const { user } = await requireRole(APP_ROLES.ENGINEER); const database = createSupabaseAdminClient() as any;
  const activity = input.activity.trim(); if (!activity) throw new Error("Activity is required.");
  const payload = { project_id: input.projectId, activity, weight_percent: input.weightPercent, progress_percent: input.progressPercent, updated_by: user.id };
  const query = input.id ? database.from("project_progress_activities").update(payload).eq("id", input.id).eq("project_id", input.projectId) : database.from("project_progress_activities").insert({ ...payload, created_by: user.id });
  const { error } = await query; if (error) throw new Error(`Failed to save progress. ${error.message}`);
  revalidatePath(`/projects/${input.projectId}`); revalidatePath("/projects");
}

export async function deleteProgressActivityAction(id: string, projectId: string) {
  await requireRole(APP_ROLES.ENGINEER); const database = createSupabaseAdminClient() as any;
  const { error } = await database.from("project_progress_activities").delete().eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(`Failed to delete progress. ${error.message}`); revalidatePath(`/projects/${projectId}`);
}

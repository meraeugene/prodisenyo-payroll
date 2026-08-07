"use server";

import { revalidatePath } from "next/cache";
import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/features/projects/types";
import { normalizeProgressUpdateInput } from "@/features/projects/utils/progressUpdates";
import { mapProjectDocumentRow } from "@/features/project-documents/utils/documentMappers";

export interface ProjectInput {
  name: string; location: string; subject?: string; lead?: string; client?: string;
  engineerId?: string | null; estimateEngineerId?: string | null; budget: number; startDate: string; endDate: string;
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
  if (!input.estimateEngineerId) throw new Error("Select a cost estimate engineer.");
  const { data, error } = await database.rpc("create_project_with_budget", {
    p_actor: user.id, p_name: normalized.name, p_location: normalized.location,
    p_subject: input.subject?.trim() || null, p_lead: input.lead?.trim() || null,
    p_engineer: null, p_estimate_engineer: input.estimateEngineerId, p_budget: normalized.budget,
    p_start: input.startDate, p_end: input.endDate, p_client: input.client?.trim() || null,
    p_description: input.description?.trim() || null, p_image_url: input.imageUrl?.trim() || null,
  });
  if (error) throw new Error(`Failed to create project. ${error.message}`);
  const createdProjectId = data?.id;
  if (!createdProjectId) throw new Error("Project was created without a valid identifier.");
  const { error: stageError } = await database
    .from("projects")
    .update({
      status: "planning",
      assigned_engineer_id: null,
      assigned_estimate_engineer_id: input.estimateEngineerId,
      updated_by: user.id,
    })
    .eq("id", createdProjectId);
  if (stageError) {
    throw new Error(`Project created, but its cost-estimate stage could not be set. ${stageError.message}`);
  }
  revalidatePath("/projects"); return data;
}

export async function updateProjectAction(id: string, input: ProjectInput & { status?: ProjectStatus }) {
  const { user } = await requireRole(APP_ROLES.CEO); const normalized = validate(input);
  const database = createSupabaseAdminClient() as any;
  const { data: currentProject, error: currentError } = await database
    .from("projects")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (currentError || !currentProject) throw new Error("Project not found.");
  if (
    currentProject.status === "planning" &&
    input.status &&
    input.status !== "planning"
  ) {
    throw new Error("Approve the estimate and use Activate Project to start operations.");
  }
  const payload = { name: normalized.name, location: normalized.location, client_name: input.client?.trim() || null,
    subject: input.subject?.trim() || null, lead: input.lead?.trim() || null, assigned_engineer_id: currentProject.status === "planning" ? null : input.engineerId || null,
    assigned_estimate_engineer_id: input.estimateEngineerId || input.engineerId || null,
    budget_ceiling: normalized.budget, start_date: input.startDate, end_date: input.endDate,
    description: input.description?.trim() || null, image_url: input.imageUrl?.trim() || null, status: input.status ?? currentProject.status, updated_by: user.id };
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
  const { data: project } = await database.from("projects").select("id").eq("id", input.projectId).eq("assigned_engineer_id", user.id).in("status", ["active", "on_hold"]).maybeSingle();
  if (!project) throw new Error("Project progress is available only after CEO activation.");
  const activity = input.activity.trim(); if (!activity) throw new Error("Activity is required.");
  const payload = { project_id: input.projectId, activity, weight_percent: input.weightPercent, progress_percent: input.progressPercent, updated_by: user.id };
  const query = input.id ? database.from("project_progress_activities").update(payload).eq("id", input.id).eq("project_id", input.projectId) : database.from("project_progress_activities").insert({ ...payload, created_by: user.id });
  const { error } = await query; if (error) throw new Error(`Failed to save progress. ${error.message}`);
  revalidatePath(`/projects/${input.projectId}`); revalidatePath("/projects");
}

export async function deleteProgressActivityAction(id: string, projectId: string) {
  const { user } = await requireRole(APP_ROLES.ENGINEER); const database = createSupabaseAdminClient() as any;
  const { data: project } = await database.from("projects").select("id").eq("id", projectId).eq("assigned_engineer_id", user.id).in("status", ["active", "on_hold"]).maybeSingle();
  if (!project) throw new Error("Project progress is available only after CEO activation.");
  const { error } = await database.from("project_progress_activities").delete().eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(`Failed to delete progress. ${error.message}`); revalidatePath(`/projects/${projectId}`);
}

export async function getProjectWorkspaceDataAction(projectId: string) {
  const { user, profile } = await requireRole([APP_ROLES.CEO, APP_ROLES.ENGINEER]);
  const database = createSupabaseAdminClient() as any;
  const normalizedProjectId = projectId.trim();
  if (!normalizedProjectId) throw new Error("Project is required.");

  let projectQuery = database
    .from("projects")
    .select("id,status,assigned_engineer_id,assigned_estimate_engineer_id")
    .eq("id", normalizedProjectId)
    .neq("status", "archived");

  if (profile.role === APP_ROLES.ENGINEER) {
    projectQuery = projectQuery.or(
      `assigned_engineer_id.eq.${user.id},assigned_estimate_engineer_id.eq.${user.id}`,
    );
  }

  const { data: project, error: projectError } = await projectQuery.maybeSingle();
  if (projectError || !project) throw new Error("Project workspace not found.");
  if (
    profile.role === APP_ROLES.ENGINEER &&
    (project.status === "planning" || project.assigned_engineer_id !== user.id)
  ) {
    throw new Error("The operational project workspace is not available to you.");
  }

  const [{ data: activities }, { data: estimates }, { data: budgets }, { data: progressSubmissions }, { data: materialRequests }, { data: progressUpdates }, { data: documents }, { data: projectExpenses }, { data: purchaseOrders }, { data: materialReceipts }] =
    await Promise.all([
      database
        .from("project_progress_activities")
        .select("id,activity,weight_percent,progress_percent,sort_order,created_at,updated_at")
        .eq("project_id", normalizedProjectId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      database
        .from("project_estimates")
        .select("*, requester_profile:profiles!project_estimates_requested_by_fkey(full_name,username)")
        .eq("project_id", normalizedProjectId)
        .order("updated_at", { ascending: false }),
      database
        .from("budget_projects")
        .select("id,budget_items(id,name,category,estimated_cost,actual_spent,status)")
        .eq("project_id", normalizedProjectId),
      database
        .from("project_progress_submissions")
        .select("id,activity_count,submitted_at")
        .eq("project_id", normalizedProjectId)
        .order("submitted_at", { ascending: false })
        .limit(8),
      database
        .from("material_requests")
        .select("id,estimate_item_id,material_name,quantity,unit,needed_by,priority,notes,status,created_at,updated_at")
        .eq("project_id", normalizedProjectId)
        .order("created_at", { ascending: false })
        .limit(100),
      database
        .from("project_progress_updates")
        .select("id,project_id,submitted_by,overall_percent,completed_work_summary,remarks,created_at")
        .eq("project_id", normalizedProjectId)
        .order("created_at", { ascending: false })
        .limit(20),
      database
        .from("project_documents")
        .select("*, uploader:profiles!project_documents_uploaded_by_fkey(full_name,username)")
        .eq("project_id", normalizedProjectId)
        .order("created_at", { ascending: false })
        .limit(100),
      database
        .from("project_expenses")
        .select("id,purchase_order_id,category,description,amount,expense_date,status")
        .eq("project_id", normalizedProjectId)
        .order("expense_date", { ascending: false }),
      database
        .from("purchase_orders")
        .select("id,material_request_id,item_name,quantity,unit,estimated_unit_cost,actual_unit_cost,status,delivery_status,ordered_at,received_at,notes,created_at,updated_at")
        .eq("project_id", normalizedProjectId)
        .order("updated_at", { ascending: false }),
      database
        .from("project_material_receipts")
        .select("id,purchase_order_id,item_name,quantity,unit,total_cost,accepted_at")
        .eq("project_id", normalizedProjectId)
        .order("accepted_at", { ascending: false }),
    ]);
  const estimateIds = (estimates ?? []).map((estimate: any) => estimate.id);
  const { data: estimateItems } = estimateIds.length
    ? await database
        .from("project_estimate_items")
        .select("*")
        .in("estimate_id", estimateIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  return {
    activities: activities ?? [],
    estimates: estimates ?? [],
    estimateItems: estimateItems ?? [],
    budgetItems: (budgets ?? []).flatMap((budget: any) => budget.budget_items ?? []),
    progressSubmissions: progressSubmissions ?? [],
    materialRequests: materialRequests ?? [],
    progressUpdates: progressUpdates ?? [],
    documents: (documents ?? []).map(mapProjectDocumentRow),
    projectExpenses: projectExpenses ?? [],
    purchaseOrders: purchaseOrders ?? [],
    materialReceipts: materialReceipts ?? [],
  };
}

export async function submitProjectProgressAction(input: {
  projectId: string;
  activities: Array<{
    id?: string;
    activity: string;
    weightPercent: number;
    progressPercent: number;
  }>;
}) {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const database = createSupabaseAdminClient() as any;
  const projectId = input.projectId.trim();

  if (!projectId) throw new Error("Project is required.");

  const { data: project } = await database
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("assigned_engineer_id", user.id)
    .in("status", ["active", "on_hold"])
    .maybeSingle();

  if (!project) throw new Error("Only the assigned site engineer can submit progress.");

  const activities = input.activities.map((entry, index) => {
    const activity = entry.activity.trim();
    const weightPercent = Math.round(Number(entry.weightPercent) * 100) / 100;
    const progressPercent = Math.round(Number(entry.progressPercent) * 100) / 100;

    if (!activity) throw new Error("Every progress activity needs a name.");
    if (!Number.isFinite(weightPercent) || weightPercent <= 0 || weightPercent > 100) {
      throw new Error("Activity weights must be greater than 0 and no more than 100.");
    }
    if (!Number.isFinite(progressPercent) || progressPercent < 0 || progressPercent > 100) {
      throw new Error("Progress must be between 0 and 100.");
    }

    return {
      project_id: projectId,
      activity,
      weight_percent: weightPercent,
      progress_percent: progressPercent,
      sort_order: index,
      created_by: user.id,
      updated_by: user.id,
    };
  });

  const { error: deleteError } = await database
    .from("project_progress_activities")
    .delete()
    .eq("project_id", projectId);

  if (deleteError) throw new Error(`Failed to prepare progress update. ${deleteError.message}`);

  if (activities.length > 0) {
    const { error: insertError } = await database
      .from("project_progress_activities")
      .insert(activities);

    if (insertError) throw new Error(`Failed to submit progress. ${insertError.message}`);
  }

  await database.from("project_progress_submissions").insert({
    project_id: projectId,
    submitted_by: user.id,
    activity_count: activities.length,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}
export async function createProjectProgressUpdateAction(input: {
  projectId: string;
  overallPercent: number;
  completedWorkSummary: string;
  remarks?: string;
}) {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const database = createSupabaseAdminClient() as any;
  const { projectId, overallPercent, completedWorkSummary, remarks } =
    normalizeProgressUpdateInput(input);

  const { data: project } = await database
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("assigned_engineer_id", user.id)
    .in("status", ["active", "on_hold"])
    .maybeSingle();
  if (!project) throw new Error("Only the assigned site engineer can submit a progress update.");

  const { data, error } = await database
    .from("project_progress_updates")
    .insert({
      project_id: projectId,
      submitted_by: user.id,
      overall_percent: overallPercent,
      completed_work_summary: completedWorkSummary,
      remarks,
    })
    .select("id,project_id,submitted_by,overall_percent,completed_work_summary,remarks,created_at")
    .single();
  if (error) throw new Error(`Failed to submit progress update. ${error.message}`);
  revalidatePath(`/projects/${projectId}`);
  return data;
}

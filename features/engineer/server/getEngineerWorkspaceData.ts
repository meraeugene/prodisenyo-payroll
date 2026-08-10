import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  EngineerActivity,
  EngineerMaterialRequest,
  EngineerNotification,
  EngineerProject,
  EngineerReport,
  EngineerTask,
  EngineerWorkspaceData,
} from "@/features/engineer/types";
import { manilaDateKey } from "@/features/engineer/utils/engineerDashboard";

async function signedEvidenceUrl(database: any, path: string | null | undefined) {
  if (!path) return null;
  const { data } = await database.storage.from("operations-evidence").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function getEngineerWorkspaceData(input: {
  userId: string;
  profile: { id: string; full_name: string | null; username: string };
}): Promise<EngineerWorkspaceData> {
  const database = createSupabaseAdminClient() as any;

  const { data: memberships, error: membershipError } = await database
    .from("operations_project_members")
    .select("project_id")
    .eq("profile_id", input.userId);
  if (membershipError) throw new Error("Could not load assigned projects.");

  const memberProjectIds = (memberships ?? []).map((membership: { project_id: string }) => membership.project_id);
  const projectFilter = memberProjectIds.length
    ? `lead_engineer_id.eq.${input.userId},id.in.(${memberProjectIds.join(",")})`
    : `lead_engineer_id.eq.${input.userId}`;

  const projectsResult = await database
    .from("operations_projects")
    .select("*, tasks:operations_tasks(*, assigned_by:profiles!operations_tasks_created_by_fkey(id,full_name,username)), milestones:operations_milestones(*), updates:progress_updates(*, author:profiles!progress_updates_author_id_fkey(id,full_name,username))")
    .or(projectFilter)
    .order("updated_at", { ascending: false });
  if (projectsResult.error) throw new Error(`Could not load the Engineer workspace. ${projectsResult.error.message}`);

  const projects = (projectsResult.data ?? []) as EngineerProject[];
  const projectIds = projects.map((project) => project.id);
  const empty = { data: [], error: null };

  const [requestsResult, reportsResult, notificationsResult, activitiesResult] = await Promise.all([
    projectIds.length
      ? database.from("material_requests").select("*, project:operations_projects(id,name,site)").eq("requested_by", input.userId).order("created_at", { ascending: false })
      : Promise.resolve(empty),
    projectIds.length
      ? database.from("operations_reports").select("*, project:operations_projects(id,name,site)").eq("author_id", input.userId).order("created_at", { ascending: false })
      : Promise.resolve(empty),
    database.from("operations_notifications").select("*").eq("recipient_id", input.userId).order("created_at", { ascending: false }).limit(100),
    projectIds.length
      ? database.from("operations_activity_events").select("*, project:operations_projects(id,name,site), actor:profiles!operations_activity_events_actor_id_fkey(id,full_name,username)").in("project_id", projectIds).order("created_at", { ascending: false }).limit(100)
      : Promise.resolve(empty),
  ]);

  const relatedError = requestsResult.error ?? reportsResult.error ?? notificationsResult.error ?? activitiesResult.error;
  if (relatedError) throw new Error(`Could not load Engineer workflow data. ${relatedError.message}`);

  await Promise.all(projects.map(async (project) => {
    const latestPhoto = project.updates
      ?.flatMap((update) => update.photo_paths ?? [])
      .find(Boolean);
    project.image_url = await signedEvidenceUrl(database, latestPhoto);
    project.current_phase ??= "planning";
    project.schedule_status ??= "on_track";
    project.planned_progress ??= project.reported_progress;
    project.project_code ??= null;
    project.tasks ??= [];
    project.updates ??= [];
    project.milestones ??= [];
  }));

  const tasks = projects.flatMap((project) => project.tasks.map((task) => ({ ...task, project: { id: project.id, name: project.name, site: project.site } }))) as EngineerTask[];
  const reports = (reportsResult.data ?? []) as EngineerReport[];
  const today = manilaDateKey();
  const deadlineNotifications = [
    ...tasks.filter((task) => task.status !== "completed" && task.due_date && task.due_date <= today).map((task) => ({
      recipient_id: input.userId,
      type: task.due_date! < today ? "task_overdue" : "task_deadline",
      title: task.due_date! < today ? `Overdue task: ${task.title}` : `Task due today: ${task.title}`,
      body: task.project?.name ?? null,
      href: "/engineer/tasks",
      entity_type: "task",
      entity_id: task.id,
      dedupe_key: `task-deadline-${task.id}-${today}`,
    })),
    ...reports.filter((report) => report.status !== "accepted" && report.due_date && report.due_date <= today).map((report) => ({
      recipient_id: input.userId,
      type: report.due_date! < today ? "report_overdue" : "report_deadline",
      title: report.due_date! < today ? `Overdue report: ${report.title}` : `Report due today: ${report.title}`,
      body: report.project?.name ?? null,
      href: "/engineer/reports",
      entity_type: "report",
      entity_id: report.id,
      dedupe_key: `report-deadline-${report.id}-${today}`,
    })),
  ];
  let notifications = (notificationsResult.data ?? []) as EngineerNotification[];
  if (deadlineNotifications.length) {
    await database.from("operations_notifications").upsert(deadlineNotifications, { onConflict: "recipient_id,dedupe_key", ignoreDuplicates: true });
    const { data: refreshed } = await database.from("operations_notifications").select("*").eq("recipient_id", input.userId).order("created_at", { ascending: false }).limit(100);
    notifications = (refreshed ?? notifications) as EngineerNotification[];
  }
  const persistedActivities = (activitiesResult.data ?? []) as EngineerActivity[];
  const persistedProgressIds = new Set(persistedActivities.filter((activity) => activity.event_type === "progress_update").map((activity) => activity.metadata?.progress_update_id).filter(Boolean));
  const derivedActivities = projects.flatMap((project) => project.updates
    .filter((update) => !persistedProgressIds.has(update.id))
    .map((update) => ({
      id: `progress-${update.id}`,
      project_id: project.id,
      event_type: "progress_update",
      title: update.title || "Site progress updated",
      body: update.completed_work,
      photo_paths: update.photo_paths ?? [],
      created_at: update.created_at,
      project: { id: project.id, name: project.name, site: project.site },
      actor: update.author ?? null,
    } as EngineerActivity)));
  const activities = [...persistedActivities, ...derivedActivities]
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, 100);

  return {
    dataSource: "database",
    profile: input.profile,
    projects,
    tasks,
    materialRequests: (requestsResult.data ?? []) as EngineerMaterialRequest[],
    reports,
    notifications,
    activities,
  };
}

import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import ProjectsPageClient from "@/features/projects/components/ProjectsPageClient";
import { mapProjectRow } from "@/features/projects/utils/projectMappers";

export default async function Page() {
  const { user, profile } = await requireRole([
    APP_ROLES.CEO,
    APP_ROLES.ENGINEER,
  ]);
  const database = createSupabaseAdminClient() as any;
  let query = database
    .from("projects")
    .select(
      "*, engineer:profiles!projects_assigned_engineer_id_fkey(full_name,username), estimate_engineer:profiles!projects_assigned_estimate_engineer_id_fkey(full_name,username), progress:project_progress_activities(weight_percent,progress_percent), budget:budget_projects(budget_items(actual_spent))",
    )
    .neq("status", "archived")
    .order("created_at", { ascending: false });
  if (profile.role === APP_ROLES.ENGINEER)
    query = query.or(`assigned_engineer_id.eq.${user.id},assigned_estimate_engineer_id.eq.${user.id}`);
  const [{ data, error }, { data: engineerRows }] = await Promise.all([
    query,
    database
      .from("profiles")
      .select("id,full_name,username")
      .eq("role", "engineer")
      .eq("is_active", true)
      .order("full_name"),
  ]);
  if (error) throw new Error(`Failed to load projects. ${error.message}`);
  const visibleRows =
    profile.role === APP_ROLES.ENGINEER
      ? (data ?? []).filter((project: any) =>
          project.status === "planning"
            ? project.assigned_estimate_engineer_id === user.id
            : project.assigned_engineer_id === user.id,
        )
      : data ?? [];
  const engineers = (engineerRows ?? []).map((row: any) => ({
    id: row.id,
    name: row.full_name || row.username,
  }));
  return (
    <ProjectsPageClient
      role={profile.role as "ceo" | "engineer"}
      fullName={profile.full_name}
      projects={visibleRows.map(mapProjectRow)}
      engineers={engineers}
    />
  );
}

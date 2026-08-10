import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function getOperationsPageData() {
  const database = createSupabaseAdminClient() as any;
  const [projectsResult, engineersResult, requestsResult] = await Promise.all([
    database.from("operations_projects").select("*, lead_engineer:profiles!operations_projects_lead_engineer_id_fkey(full_name,username), tasks:operations_tasks(*), milestones:operations_milestones(*), updates:progress_updates(*, author:profiles!progress_updates_author_id_fkey(full_name,username), comments:progress_update_comments(*, author:profiles!progress_update_comments_author_id_fkey(full_name,username)))").order("updated_at", { ascending: false }),
    database.from("profiles").select("id,full_name,username").eq("role", "engineer").eq("is_active", true).order("full_name"),
    database.from("material_requests").select("*, requester:profiles!material_requests_requested_by_fkey(full_name,username), purchaser:profiles!material_requests_assigned_purchaser_id_fkey(full_name,username), project:operations_projects(name,site)").order("created_at", { ascending: false }),
  ]);

  const queryError = projectsResult.error ?? engineersResult.error ?? requestsResult.error;
  if (queryError) {
    console.error("Operations dashboard query failed", queryError);
    throw new Error("The operations dashboard could not be loaded. Please try again.");
  }

  return {
    projects: projectsResult.data ?? [],
    engineers: engineersResult.data ?? [],
    requests: requestsResult.data ?? [],
  };
}

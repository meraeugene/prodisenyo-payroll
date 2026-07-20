import { notFound } from "next/navigation";
import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { mapProjectRow } from "@/features/projects/utils/projectMappers";
import ProjectWorkspaceClient from "@/features/projects/components/ProjectWorkspaceClient";

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params; const { user, profile } = await requireRole([APP_ROLES.CEO, APP_ROLES.ENGINEER]); const db = createSupabaseAdminClient() as any;
  let query = db.from("projects").select("*, engineer:profiles!projects_assigned_engineer_id_fkey(full_name,username), progress:project_progress_activities(id,activity,weight_percent,progress_percent,sort_order), budget:budget_projects(id,budget_items(id,name,category,estimated_cost,actual_spent,status))").eq("id", projectId).neq("status", "archived");
  if (profile.role === APP_ROLES.ENGINEER) query = query.eq("assigned_engineer_id", user.id);
  const { data, error } = await query.maybeSingle(); if (error || !data) notFound();
  const { data: estimates } = await db.from("project_estimates").select("id,status,estimate_total,updated_at").eq("project_id", projectId).order("updated_at", { ascending: false });
  const activities = (data.progress ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order); const budgetItems = (data.budget ?? []).flatMap((item: any) => item.budget_items ?? []);
  return <ProjectWorkspaceClient project={mapProjectRow(data)} role={profile.role as "ceo" | "engineer"} activities={activities} estimates={estimates ?? []} budgetItems={budgetItems}/>;
}

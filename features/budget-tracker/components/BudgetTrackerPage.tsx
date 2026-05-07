import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  BudgetItemRow,
  BudgetProjectRow,
} from "@/features/budget-tracker/types";
import BudgetTrackerPageClient from "@/features/budget-tracker/components/BudgetTrackerPageClient";

export default async function BudgetTrackerPage() {
  const { profile } = await requireRole([
    APP_ROLES.CEO,
    APP_ROLES.PAYROLL_MANAGER,
    APP_ROLES.ENGINEER,
  ]);
  const canManageProjects = profile.role !== APP_ROLES.PAYROLL_MANAGER;

  const supabase = createSupabaseAdminClient() as any;
  let projects: BudgetProjectRow[] = [];
  let items: BudgetItemRow[] = [];
  let schemaReady = true;
  let loadError: string | null = null;

  const { data: projectData, error: projectError } = await supabase
    .from("budget_projects")
    .select("*")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  if (projectError) {
    schemaReady = false;
    loadError = projectError.message;
  } else {
    projects = (projectData ?? []) as BudgetProjectRow[];

    if (projects.length > 0) {
      const projectIds = projects.map((project) => project.id);
      const { data: itemData, error: itemError } = await supabase
        .from("budget_items")
        .select("*")
        .in("project_id", projectIds)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (itemError) {
        schemaReady = false;
        loadError = itemError.message;
      } else {
        items = (itemData ?? []) as BudgetItemRow[];
      }
    }
  }

  return (
    <BudgetTrackerPageClient
      projects={projects}
      items={items}
      schemaReady={schemaReady}
      loadError={loadError}
      canManageProjects={canManageProjects}
    />
  );
}

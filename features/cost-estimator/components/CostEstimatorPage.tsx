import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CostCatalogItemRow,
  AssignedEstimateProject,
  ProjectEstimateItemRow,
  ProjectEstimateRow,
} from "@/features/cost-estimator/types";
import CostEstimatorPageClient from "@/features/cost-estimator/components/CostEstimatorPageClient";

export default async function CostEstimatorPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string }>;
}) {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const supabase = await createSupabaseServerClient();
  const initialProjectId = (await searchParams)?.projectId ?? "";

  const [{ data: estimateData }, { data: catalogData }, { data: projectData }] = await Promise.all([
    supabase
      .from("project_estimates")
      .select("*")
      .eq("requested_by", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("cost_catalog_items")
      .select("*")
      .order("name", { ascending: true }),
    supabase
      .from("projects")
      .select("id,name,location,client_name,subject,lead,budget_ceiling")
      .eq("assigned_estimate_engineer_id", user.id)
      .eq("status", "planning")
      .order("created_at", { ascending: false }),
  ]);

  const estimates = (estimateData ?? []) as ProjectEstimateRow[];
  const estimateIds = estimates.map((estimate) => estimate.id);

  let items: ProjectEstimateItemRow[] = [];
  if (estimateIds.length > 0) {
    const { data: itemData } = await supabase
      .from("project_estimate_items")
      .select("*")
      .in("estimate_id", estimateIds)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    items = (itemData ?? []) as ProjectEstimateItemRow[];
  }

  return (
    <CostEstimatorPageClient
      estimates={estimates}
      items={items}
      catalogItems={(catalogData ?? []) as CostCatalogItemRow[]}
      initialProjectId={initialProjectId}
      assignedProjects={(projectData ?? []).map((project: any) => ({
        id: project.id,
        name: project.name,
        location: project.location,
        clientName: project.client_name,
        subject: project.subject,
        lead: project.lead,
        budgetCeiling: Number(project.budget_ceiling ?? 0),
      })) as AssignedEstimateProject[]}
    />
  );
}

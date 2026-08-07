import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import MaterialRequestPageClient from "@/features/material-requests/components/MaterialRequestPageClient";
import { mapMaterialRequestRow } from "@/features/material-requests/utils/materialRequestMappers";
import {
  buildPlannedMaterialRows,
  type PlannedMaterialRow,
} from "@/features/material-requests/utils/plannedMaterials";
import type { MaterialRequestRecord } from "@/features/material-requests/types";

export default async function MaterialRequestPage({
  defaultProjectId,
  defaultEstimateItemId,
}: {
  defaultProjectId?: string;
  defaultEstimateItemId?: string;
}) {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const database = createSupabaseAdminClient() as any;

  const [{ data: requestRows, error: requestError }, { data: projects }] =
    await Promise.all([
      database
        .from("material_requests")
        .select(
          "id, project_id, estimate_item_id, project:projects(name), material_name, quantity, unit, needed_by, site, priority, notes, status, created_at",
        )
        .eq("requested_by", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      database
        .from("projects")
        .select("id,name,active_approved_estimate_id")
        .eq("assigned_engineer_id", user.id)
        .in("status", ["active", "on_hold"])
        .order("name"),
    ]);

  if (requestError) {
    throw new Error("Failed to load material requests. " + requestError.message);
  }

  const initialRequests = ((requestRows ?? []) as any[]).map(
    mapMaterialRequestRow,
  ) as MaterialRequestRecord[];

  let plannedMaterial: PlannedMaterialRow | null = null;
  const selectedProject = (projects ?? []).find(
    (project: any) => project.id === defaultProjectId,
  );

  if (
    selectedProject &&
    defaultEstimateItemId &&
    selectedProject.active_approved_estimate_id
  ) {
    const { data: item } = await database
      .from("project_estimate_items")
      .select("*")
      .eq("id", defaultEstimateItemId)
      .eq("estimate_id", selectedProject.active_approved_estimate_id)
      .maybeSingle();

    if (item) {
      plannedMaterial =
        buildPlannedMaterialRows(
          selectedProject.active_approved_estimate_id,
          [item],
          initialRequests.map((request) => ({
            estimate_item_id: request.estimateItemId,
            quantity: request.quantity,
            status: request.status,
          })),
        )[0] ?? null;
    }
  }

  return (
    <MaterialRequestPageClient
      initialRequests={initialRequests}
      projects={(projects ?? []).map((project: any) => ({
        id: project.id,
        name: project.name,
      }))}
      defaultProjectId={defaultProjectId}
      plannedMaterial={plannedMaterial}
    />
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { mapMaterialRequestRow } from "@/features/material-requests/utils/materialRequestMappers";
import { validatePlannedRequestQuantity } from "@/features/material-requests/utils/plannedMaterials";
import type {
  CreateMaterialRequestInput,
  MaterialRequestPriority,
  MaterialRequestRecord,
} from "@/features/material-requests/types";

function normalizeText(value: string | undefined) {
  return (value ?? "").trim();
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeQuantity(value: number | undefined) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(parsed * 100) / 100;
}

function isPriority(value: string): value is MaterialRequestPriority {
  return ["low", "medium", "high", "urgent"].includes(value);
}

export async function createMaterialRequestAction(
  input: CreateMaterialRequestInput,
): Promise<MaterialRequestRecord> {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const projectId = normalizeText(input.projectId);
  const estimateItemId = normalizeText(input.estimateItemId);
  let materialName = normalizeText(input.materialName);
  let unit = normalizeText(input.unit);
  const neededBy = normalizeText(input.neededBy);
  const quantity = normalizeQuantity(input.quantity);
  const priority = normalizeText(input.priority).toLowerCase();

  if (!projectId) throw new Error("Project is required.");

  const database = createSupabaseAdminClient() as any;
  const { data: project } = await database
    .from("projects")
    .select("id,name,active_approved_estimate_id")
    .eq("id", projectId)
    .eq("assigned_engineer_id", user.id)
    .in("status", ["active", "on_hold"])
    .maybeSingle();

  if (!project) throw new Error("Materials are available only after CEO project activation.");
  if (!neededBy) throw new Error("Needed-by date is required.");
  if (quantity <= 0) throw new Error("Quantity must be greater than zero.");
  if (!isPriority(priority)) throw new Error("Select a valid priority.");

  if (estimateItemId) {
    const { data: estimateItem, error: itemError } = await database
      .from("project_estimate_items")
      .select(
        "id,estimate_id,material_name_snapshot,category_snapshot,unit_label_snapshot,quantity",
      )
      .eq("id", estimateItemId)
      .single();

    if (itemError || !estimateItem) throw new Error("Planned material was not found.");
    if (
      estimateItem.estimate_id !== project.active_approved_estimate_id ||
      estimateItem.category_snapshot !== "materials"
    ) {
      throw new Error("Material is not part of this project's active approved estimate.");
    }

    const { data: linkedRequests, error: linkedError } = await database
      .from("material_requests")
      .select("quantity,status")
      .eq("estimate_item_id", estimateItemId);

    if (linkedError) {
      throw new Error("Failed to validate planned quantity. " + linkedError.message);
    }

    const alreadyRequested = (linkedRequests ?? [])
      .filter((request: any) => !["rejected", "cancelled"].includes(request.status))
      .reduce((sum: number, request: any) => sum + Number(request.quantity || 0), 0);
    const remaining = Math.max(
      0,
      Math.round((Number(estimateItem.quantity) - alreadyRequested) * 100) / 100,
    );
    const quantityError = validatePlannedRequestQuantity(quantity, remaining);
    if (quantityError) throw new Error(quantityError);

    materialName = estimateItem.material_name_snapshot;
    unit = estimateItem.unit_label_snapshot;
  }

  if (!materialName) throw new Error("Material name is required.");
  if (!unit) throw new Error("Unit is required.");

  const { data: requestRow, error: requestError } = await database
    .from("material_requests")
    .insert({
      project_id: projectId,
      requested_by: user.id,
      estimate_item_id: estimateItemId || null,
      material_name: materialName,
      quantity,
      unit,
      needed_by: neededBy,
      site: normalizeOptionalText(input.site),
      priority,
      notes: normalizeOptionalText(input.notes),
      status: "submitted",
    })
    .select(
      "id, project_id, estimate_item_id, project:projects(name), material_name, quantity, unit, needed_by, site, priority, notes, status, created_at",
    )
    .single();

  if (requestError || !requestRow) {
    throw new Error(
      "Failed to submit request. " + (requestError?.message ?? "Unknown error"),
    );
  }

  revalidatePath("/request-material");
  revalidatePath("/projects/" + projectId);
  revalidatePath("/dashboard");
  revalidatePath("/overview");
  return mapMaterialRequestRow(requestRow);
}

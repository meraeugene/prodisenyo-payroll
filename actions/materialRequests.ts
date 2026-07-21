"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  mapMaterialRequestRow,
  parseMaterialRequestPayload,
} from "@/features/material-requests/utils/materialRequestMappers";
import type {
  CreateMaterialRequestInput,
  MaterialRequestPriority,
  MaterialRequestRecord,
} from "@/features/material-requests/types";
import type { Json } from "@/types/database";

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
  return (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "urgent"
  );
}

export async function createMaterialRequestAction(
  input: CreateMaterialRequestInput,
): Promise<MaterialRequestRecord> {
  const { user } = await requireRole(APP_ROLES.ENGINEER);

  const projectName = normalizeText(input.projectName);
  const projectId = normalizeText(input.projectId);
  const materialName = normalizeText(input.materialName);
  const unit = normalizeText(input.unit);
  const neededBy = normalizeText(input.neededBy);
  const quantity = normalizeQuantity(input.quantity);
  const priority = normalizeText(input.priority).toLowerCase();

  if (!projectId) throw new Error("Project is required.");
  const database = createSupabaseAdminClient() as any;
  const { data: project } = await database.from("projects").select("id,name").eq("id", projectId).eq("assigned_engineer_id", user.id).neq("status", "archived").maybeSingle();
  if (!project) throw new Error("Project is not assigned to you.");

  if (!materialName) {
    throw new Error("Material name is required.");
  }

  if (!unit) {
    throw new Error("Unit is required.");
  }

  if (!neededBy) {
    throw new Error("Needed-by date is required.");
  }

  if (quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  if (!isPriority(priority)) {
    throw new Error("Select a valid priority.");
  }

  const payload: Json = {
    projectId,
    projectName: project.name,
    materialName,
    quantity,
    unit,
    neededBy,
    site: normalizeOptionalText(input.site),
    priority,
    notes: normalizeOptionalText(input.notes),
  };

  const { data: requestRow, error: requestError } = await database
    .from("material_requests")
    .insert({
      project_id: projectId,
      requested_by: user.id,
      material_name: materialName,
      quantity,
      unit,
      needed_by: neededBy,
      site: normalizeOptionalText(input.site),
      priority,
      notes: normalizeOptionalText(input.notes),
      status: "submitted",
    })
    .select("id, project_id, project:projects(name), material_name, quantity, unit, needed_by, site, priority, notes, status, created_at")
    .single();

  if (!requestError && requestRow) {
    revalidatePath("/request-material");
    revalidatePath(`/projects/${projectId}`);
    return mapMaterialRequestRow(requestRow);
  }

  const { data, error } = await database
    .from("audit_logs")
    .insert({
      actor_id: user.id,
      action: "material_request_created",
      entity_type: "material_request",
      entity_id: randomUUID(),
      payload,
    })
    .select("id, entity_id, payload, created_at")
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to submit request. ${error?.message ?? "Unknown error"}`,
    );
  }

  const request = parseMaterialRequestPayload({
    id: data.id,
    requestId: data.entity_id,
    payload: data.payload,
    createdAt: data.created_at,
  });

  if (!request) {
    throw new Error("Request was created but could not be loaded.");
  }

  revalidatePath("/request-material");
  return request;
}

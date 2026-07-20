import type {
  MaterialRequestPriority,
  MaterialRequestRecord,
} from "@/features/material-requests/types";

function isPriority(value: unknown): value is MaterialRequestPriority {
  return (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "urgent"
  );
}

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function parseMaterialRequestPayload(params: {
  id: string;
  requestId: string;
  payload: unknown;
  createdAt: string;
}): MaterialRequestRecord | null {
  const payload = params.payload;
  if (!payload || typeof payload !== "object") return null;

  const raw = payload as Record<string, unknown>;
  const projectName =
    typeof raw.projectName === "string" ? raw.projectName.trim() : "";
  const projectId = typeof raw.projectId === "string" ? raw.projectId.trim() : "";
  const materialName =
    typeof raw.materialName === "string" ? raw.materialName.trim() : "";
  const unit = typeof raw.unit === "string" ? raw.unit.trim() : "";
  const neededBy = typeof raw.neededBy === "string" ? raw.neededBy.trim() : "";
  const site = typeof raw.site === "string" ? raw.site.trim() : "";
  const notes = typeof raw.notes === "string" ? raw.notes.trim() : "";
  const quantity = raw.quantity;
  const priority = raw.priority;

  if (!projectId || !projectName || !materialName || !unit || !neededBy) return null;
  if (!isFinitePositiveNumber(quantity)) return null;
  if (!isPriority(priority)) return null;

  return {
    id: params.id,
    requestId: params.requestId,
    projectName,
    projectId,
    materialName,
    quantity,
    unit,
    neededBy,
    site: site || null,
    priority,
    notes: notes || null,
    status: "pending",
    createdAt: params.createdAt,
  };
}

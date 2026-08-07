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
    estimateItemId:
      typeof raw.estimateItemId === 'string' && raw.estimateItemId.trim()
        ? raw.estimateItemId.trim()
        : null,
    projectName,
    projectId,
    materialName,
    quantity,
    unit,
    neededBy,
    site: site || null,
    priority,
    notes: notes || null,
    status: "submitted",
    createdAt: params.createdAt,
  };
}

export function mapMaterialRequestRow(row: {
  id: string;
  project_id: string;
  project?: { name: string | null } | null;
  material_name: string;
  quantity: number;
  unit: string;
  needed_by: string;
  site: string | null;
  priority: MaterialRequestPriority;
  notes: string | null;
  status: MaterialRequestRecord["status"];
  created_at: string;
}): MaterialRequestRecord {
  return {
    id: row.id,
    requestId: row.id,
    estimateItemId: (row as { estimate_item_id?: string | null }).estimate_item_id ?? null,
    projectId: row.project_id,
    projectName: row.project?.name || "",
    materialName: row.material_name,
    quantity: Number(row.quantity),
    unit: row.unit,
    neededBy: row.needed_by,
    site: row.site,
    priority: row.priority,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
  };
}

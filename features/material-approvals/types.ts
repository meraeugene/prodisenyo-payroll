export type MaterialWorkflowStatus =
  | "submitted"
  | "approved"
  | "rejected"
  | "purchasing"
  | "ordered"
  | "received"
  | "cancelled";

export interface ProjectMaterialRequest {
  id: string;
  estimate_item_id: string | null;
  material_name: string;
  quantity: number;
  unit: string;
  needed_by: string;
  priority: "low" | "medium" | "high" | "urgent";
  notes: string | null;
  status: MaterialWorkflowStatus;
  created_at: string;
}

export interface MaterialRequest {
  id: string;
  projectName: string;
  materialName: string;
  quantity: number;
  unit: string;
  neededBy: string;
  priority: "low" | "medium" | "high" | "urgent";
  requestedBy: string;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  approvalNotes?: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
}

export type EditableMaterialRequest = Pick<
  MaterialRequest,
  "materialName" | "quantity" | "unit" | "neededBy" | "priority" | "notes"
>;

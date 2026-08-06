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

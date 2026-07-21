export type MaterialRequestPriority = "low" | "medium" | "high" | "urgent";

export interface MaterialRequestRecord {
  id: string;
  requestId: string;
  projectName: string;
  projectId: string;
  materialName: string;
  quantity: number;
  unit: string;
  neededBy: string;
  site: string | null;
  priority: MaterialRequestPriority;
  notes: string | null;
  status: "submitted" | "approved" | "rejected" | "purchasing" | "ordered" | "received" | "cancelled";
  createdAt: string;
}

export interface CreateMaterialRequestInput {
  projectId: string;
  projectName: string;
  materialName: string;
  quantity: number;
  unit: string;
  neededBy: string;
  site?: string;
  priority: MaterialRequestPriority;
  notes?: string;
}

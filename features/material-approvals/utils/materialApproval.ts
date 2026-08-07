import type {
  MaterialRequest,
  ProjectMaterialRequest,
} from "@/features/material-approvals/types";

export type MaterialApprovalBucket =
  | "pending"
  | "approved"
  | "rejected";

export function getMaterialApprovalBucket(
  status: ProjectMaterialRequest["status"],
): MaterialApprovalBucket {
  if (status === "submitted") return "pending";
  if (status === "rejected" || status === "cancelled") return "rejected";
  return "approved";
}

export function mapMaterialApprovalDialogRequest(params: {
  request: ProjectMaterialRequest;
  projectName: string;
  requestedBy: string;
}): MaterialRequest {
  return {
    id: params.request.id,
    projectName: params.projectName,
    materialName: params.request.material_name,
    quantity: Number(params.request.quantity),
    unit: params.request.unit,
    neededBy: params.request.needed_by,
    priority: params.request.priority,
    requestedBy: params.requestedBy,
    status: getMaterialApprovalBucket(params.request.status),
    notes: params.request.notes ?? undefined,
  };
}

export function getMaterialWorkflowLabel(
  status: ProjectMaterialRequest["status"],
) {
  const labels: Record<ProjectMaterialRequest["status"], string> = {
    submitted: "Pending CEO review",
    approved: "Approved",
    rejected: "Rejected",
    purchasing: "Sent to purchasing",
    ordered: "Ordered",
    received: "Received",
    cancelled: "Cancelled",
  };
  return labels[status];
}


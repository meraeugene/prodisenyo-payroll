export type EngineerProjectStatus = "planning" | "active" | "on_hold" | "completed";

export interface EngineerDashboardProject {
  id: string;
  name: string;
  location: string;
  status: EngineerProjectStatus;
  progress: number;
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
}

export type EngineerMaterialRequestStatus =
  | "submitted"
  | "approved"
  | "rejected"
  | "purchasing"
  | "ordered"
  | "received"
  | "cancelled";

export interface EngineerDashboardMaterialRequest {
  id: string;
  projectId: string;
  projectName: string;
  materialName: string;
  quantity: number;
  unit: string;
  status: EngineerMaterialRequestStatus;
  createdAt: string;
}

export interface EngineerDashboardEstimate {
  id: string;
  projectId: string | null;
  projectName: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  rejectionReason: string | null;
  updatedAt: string;
}

export interface EngineerDashboardAlert {
  id: string;
  projectId: string | null;
  title: string;
  detail: string;
  kind: "estimate" | "material" | "schedule";
  createdAt: string;
  href: string;
}

export interface EngineerDashboardData {
  fullName: string;
  projects: EngineerDashboardProject[];
  materialRequests: EngineerDashboardMaterialRequest[];
  estimates: EngineerDashboardEstimate[];
  alerts: EngineerDashboardAlert[];
}

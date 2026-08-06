export type CeoProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed";

export type CeoDashboardProject = {
  id: string;
  name: string;
  location: string;
  status: CeoProjectStatus;
  budget: number;
  estimatedCost: number;
  spent: number;
  progress: number;
  latestProgressAt: string | null;
  endDate: string;
  engineer: string;
  imageUrl: string | null;
};

export type CeoMaterialRequest = {
  id: string;
  projectId: string;
  projectName: string;
  materialName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type CeoEstimate = {
  id: string;
  projectId: string | null;
  projectName: string;
  status: string;
  updatedAt: string;
};

export type CeoProgressUpdate = {
  id: string;
  projectId: string;
  projectName: string;
  engineer: string;
  overallPercent: number;
  summary: string;
  createdAt: string;
};

export type CeoDocumentActivity = {
  id: string;
  projectId: string;
  projectName: string;
  fileName: string;
  uploader: string;
  createdAt: string;
};

export type CeoApprovalSummary = {
  label: string;
  detail: string;
  count: number;
  href: string;
  tone: "emerald" | "amber" | "sky" | "rose";
};

export type CeoAttentionItem = {
  id: string;
  label: string;
  detail: string;
  href: string;
  tone: "amber" | "rose";
};

export type CeoActivityItem = {
  id: string;
  type: "progress" | "material" | "estimate" | "document";
  title: string;
  detail: string;
  actor: string;
  createdAt: string;
  href: string;
};

export type CeoDashboardData = {
  projects: CeoDashboardProject[];
  materialRequests: CeoMaterialRequest[];
  estimates: CeoEstimate[];
  progressUpdates: CeoProgressUpdate[];
  documents: CeoDocumentActivity[];
  payrollApprovalCount: number;
  overtimeApprovalCount: number;
};

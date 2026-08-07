export type PurchaserPurchaseStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "ordered"
  | "received"
  | "cancelled";

export type PurchaserDeliveryStatus =
  | "pending"
  | "scheduled"
  | "in_transit"
  | "delivered";

export type PurchaserDashboardRecord = {
  id: string;
  projectId: string;
  projectName: string;
  projectImageUrl: string | null;
  materialRequestId: string | null;
  itemName: string;
  quantity: number;
  unit: string;
  supplierName: string;
  estimatedUnitCost: number;
  actualUnitCost: number;
  quotationReference: string;
  status: PurchaserPurchaseStatus;
  deliveryStatus: PurchaserDeliveryStatus;
  receiptInvoiceReference: string;
  neededBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PurchaserDashboardData = {
  records: PurchaserDashboardRecord[];
};

export type PurchaserDashboardSummary = {
  approvedRequests: number;
  needPricing: number;
  activeOrders: number;
  deliveriesAwaitingUpdate: number;
};

export type PurchaserActivityItem = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
  tone: "emerald" | "sky" | "amber" | "slate";
};

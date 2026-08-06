import type {
  PurchaserActivityItem,
  PurchaserDashboardRecord,
  PurchaserDashboardSummary,
} from "@/features/purchaser-dashboard/types";

export function buildPurchaserSummary(
  records: PurchaserDashboardRecord[],
): PurchaserDashboardSummary {
  const current = records.filter((record) => record.status !== "cancelled");
  return {
    approvedRequests: current.length,
    needPricing: current.filter(
      (record) => !record.supplierName || record.actualUnitCost <= 0,
    ).length,
    activeOrders: current.filter((record) =>
      ["draft", "submitted", "approved", "ordered"].includes(record.status),
    ).length,
    deliveriesAwaitingUpdate: current.filter(
      (record) =>
        record.status === "ordered" && record.deliveryStatus !== "delivered",
    ).length,
  };
}

export function filterPurchaserRecords(
  records: PurchaserDashboardRecord[],
  projectId: string,
) {
  if (projectId === "all") return records;
  return records.filter((record) => record.projectId === projectId);
}

export function buildPurchaserActivity(
  records: PurchaserDashboardRecord[],
): PurchaserActivityItem[] {
  return records
    .filter((record) => Number.isFinite(Date.parse(record.updatedAt)))
    .map((record) => {
      if (record.status === "received") {
        return {
          id: record.id,
          title: "Purchase received",
          detail: `${record.itemName} for ${record.projectName}`,
          createdAt: record.updatedAt,
          tone: "emerald" as const,
        };
      }
      if (record.deliveryStatus === "in_transit") {
        return {
          id: record.id,
          title: "Delivery in transit",
          detail: `${record.itemName} for ${record.projectName}`,
          createdAt: record.updatedAt,
          tone: "sky" as const,
        };
      }
      if (record.supplierName && record.actualUnitCost > 0) {
        return {
          id: record.id,
          title: "Supplier pricing recorded",
          detail: `${record.supplierName} · ${record.itemName}`,
          createdAt: record.updatedAt,
          tone: "amber" as const,
        };
      }
      return {
        id: record.id,
        title: "Approved request received",
        detail: `${record.itemName} for ${record.projectName}`,
        createdAt: record.updatedAt,
        tone: "slate" as const,
      };
    })
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export function formatPurchaserCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPurchaserDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

export function purchaseOrderCode(id: string) {
  return `PO-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

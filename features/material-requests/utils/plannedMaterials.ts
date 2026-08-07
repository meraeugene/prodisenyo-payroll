export type PlannedEstimateItem = {
  id: string;
  estimate_id: string;
  item_name_snapshot: string;
  material_name_snapshot: string;
  category_snapshot: string;
  unit_label_snapshot: string;
  unit_cost_snapshot: number;
  quantity: number;
  line_total: number;
  pricing_basis?: "catalog" | "supplier_quote";
  reference_supplier?: string | null;
  reference_quotation?: string | null;
};

export type LinkedMaterialRequest = {
  estimate_item_id?: string | null;
  quantity: number;
  status: string;
};

export type PlannedMaterialRow = {
  estimateItemId: string;
  itemName: string;
  materialName: string;
  unit: string;
  unitCost: number;
  estimatedTotal: number;
  plannedQuantity: number;
  requestedQuantity: number;
  remainingQuantity: number;
  pricingBasis: "catalog" | "supplier_quote";
  referenceSupplier: string | null;
  referenceQuotation: string | null;
};

const EXCLUDED_REQUEST_STATUSES = new Set(["rejected", "cancelled"]);

function roundQuantity(value: number) {
  return Math.round(value * 100) / 100;
}

export function buildPlannedMaterialRows(
  activeEstimateId: string | null | undefined,
  estimateItems: PlannedEstimateItem[],
  requests: LinkedMaterialRequest[],
): PlannedMaterialRow[] {
  if (!activeEstimateId) return [];

  const requestedByItem = new Map<string, number>();
  for (const request of requests) {
    if (!request.estimate_item_id || EXCLUDED_REQUEST_STATUSES.has(request.status)) continue;
    requestedByItem.set(
      request.estimate_item_id,
      roundQuantity(
        (requestedByItem.get(request.estimate_item_id) ?? 0) + Number(request.quantity || 0),
      ),
    );
  }

  return estimateItems
    .filter(
      (item) =>
        item.estimate_id === activeEstimateId &&
        item.category_snapshot === "materials" &&
        Boolean(item.material_name_snapshot?.trim()),
    )
    .map((item) => {
      const plannedQuantity = roundQuantity(Number(item.quantity || 0));
      const requestedQuantity = roundQuantity(requestedByItem.get(item.id) ?? 0);
      return {
        estimateItemId: item.id,
        itemName: item.item_name_snapshot,
        materialName: item.material_name_snapshot,
        unit: item.unit_label_snapshot,
        unitCost: Number(item.unit_cost_snapshot || 0),
        estimatedTotal: Number(item.line_total || 0),
        plannedQuantity,
        requestedQuantity,
        remainingQuantity: Math.max(0, roundQuantity(plannedQuantity - requestedQuantity)),
        pricingBasis: item.pricing_basis ?? "catalog",
        referenceSupplier: item.reference_supplier ?? null,
        referenceQuotation: item.reference_quotation ?? null,
      };
    });
}

export function validatePlannedRequestQuantity(quantity: number, remainingQuantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) return "Quantity must be greater than zero.";
  if (quantity > remainingQuantity) {
    return `Quantity exceeds the ${remainingQuantity} remaining in the approved estimate.`;
  }
  return null;
}

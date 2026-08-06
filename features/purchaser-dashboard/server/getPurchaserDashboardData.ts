import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { PurchaserDashboardData } from "@/features/purchaser-dashboard/types";

export async function getPurchaserDashboardData(
  userId: string,
): Promise<PurchaserDashboardData> {
  const database = createSupabaseAdminClient() as any;
  const { data: orders, error } = await database
    .from("purchase_orders")
    .select(
      "id,project_id,material_request_id,item_name,quantity,unit,supplier_name,estimated_unit_cost,actual_unit_cost,status,delivery_status,receipt_invoice_reference,created_at,updated_at,project:projects(name,image_url)",
    )
    .or(`assigned_to.is.null,assigned_to.eq.${userId}`)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load purchaser dashboard. ${error.message}`);
  }

  const requestIds = (orders ?? [])
    .map((order: any) => order.material_request_id)
    .filter(Boolean);
  const { data: requests } = requestIds.length
    ? await database
        .from("material_requests")
        .select("id,needed_by")
        .in("id", requestIds)
    : { data: [] };
  const neededBy = new Map(
    (requests ?? []).map((request: any) => [request.id, request.needed_by]),
  );

  return {
    records: (orders ?? []).map((order: any) => ({
      id: order.id,
      projectId: order.project_id,
      projectName: order.project?.name ?? "Unknown project",
      projectImageUrl: order.project?.image_url ?? null,
      materialRequestId: order.material_request_id,
      itemName: order.item_name,
      quantity: Number(order.quantity),
      unit: order.unit,
      supplierName: order.supplier_name ?? "",
      estimatedUnitCost: Number(order.estimated_unit_cost || 0),
      actualUnitCost: Number(order.actual_unit_cost || 0),
      status: order.status,
      deliveryStatus: order.delivery_status ?? "pending",
      receiptInvoiceReference: order.receipt_invoice_reference ?? "",
      neededBy: neededBy.get(order.material_request_id) ?? null,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    })),
  };
}

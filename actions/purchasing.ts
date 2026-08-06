"use server";

import { revalidatePath } from "next/cache";
import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type PurchaseStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "ordered"
  | "received"
  | "cancelled";

export type DeliveryStatus =
  | "pending"
  | "scheduled"
  | "in_transit"
  | "delivered";

export type PurchasingRecord = {
  id: string;
  projectName: string;
  materialRequestId: string | null;
  itemName: string;
  quantity: number;
  unit: string;
  supplierName: string;
  estimatedUnitCost: number;
  actualUnitCost: number;
  status: PurchaseStatus;
  deliveryStatus: DeliveryStatus;
  receiptInvoiceReference: string;
  notes: string;
  updatedAt: string;
};

export type UpdatePurchaseInput = {
  id: string;
  supplierName: string;
  actualUnitCost: number;
  status: PurchaseStatus;
  deliveryStatus: DeliveryStatus;
  receiptInvoiceReference: string;
  notes: string;
};

const PURCHASE_STATUSES = new Set<PurchaseStatus>([
  "draft", "submitted", "approved", "ordered", "received", "cancelled",
]);
const DELIVERY_STATUSES = new Set<DeliveryStatus>([
  "pending", "scheduled", "in_transit", "delivered",
]);

function clean(value: string) {
  return value.trim();
}

function mapRow(row: any): PurchasingRecord {
  return {
    id: row.id,
    projectName: row.project?.name ?? "Unknown project",
    materialRequestId: row.material_request_id,
    itemName: row.item_name,
    quantity: Number(row.quantity),
    unit: row.unit,
    supplierName: row.supplier_name ?? "",
    estimatedUnitCost: Number(row.estimated_unit_cost),
    actualUnitCost: Number(row.actual_unit_cost),
    status: row.status,
    deliveryStatus: row.delivery_status ?? "pending",
    receiptInvoiceReference: row.receipt_invoice_reference ?? "",
    notes: row.notes ?? "",
    updatedAt: row.updated_at,
  };
}

export async function getPurchasingRecordsAction(): Promise<PurchasingRecord[]> {
  const { user, profile } = await requireRole([
    APP_ROLES.CEO,
    APP_ROLES.PURCHASER,
  ]);
  const database = createSupabaseAdminClient() as any;
  let query = database
    .from("purchase_orders")
    .select("*, project:projects(name)")
    .order("updated_at", { ascending: false });

  if (profile.role === APP_ROLES.PURCHASER) {
    query = query.or(`assigned_to.is.null,assigned_to.eq.${user.id}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load purchasing records. ${error.message}`);
  return (data ?? []).map(mapRow);
}

export async function updatePurchaseOrderAction(
  input: UpdatePurchaseInput,
): Promise<PurchasingRecord> {
  const { user } = await requireRole(APP_ROLES.PURCHASER);
  const actualUnitCost = Number(input.actualUnitCost);

  if (!input.id) throw new Error("Purchase order is required.");
  if (!PURCHASE_STATUSES.has(input.status)) throw new Error("Invalid purchase status.");
  if (!DELIVERY_STATUSES.has(input.deliveryStatus)) throw new Error("Invalid delivery status.");
  if (!Number.isFinite(actualUnitCost) || actualUnitCost < 0) {
    throw new Error("Actual unit cost must be zero or greater.");
  }
  if (input.status !== "draft" && !clean(input.supplierName)) {
    throw new Error("Supplier is required once purchasing starts.");
  }
  if (input.status === "received" && input.deliveryStatus !== "delivered") {
    throw new Error("A received order must be marked delivered.");
  }

  const now = new Date().toISOString();
  const database = createSupabaseAdminClient() as any;
  const { data, error } = await database
    .from("purchase_orders")
    .update({
      assigned_to: user.id,
      supplier_name: clean(input.supplierName) || null,
      actual_unit_cost: actualUnitCost,
      status: input.status,
      delivery_status: input.deliveryStatus,
      receipt_invoice_reference: clean(input.receiptInvoiceReference) || null,
      notes: clean(input.notes) || null,
      ordered_at: input.status === "ordered" ? now : undefined,
      received_at: input.status === "received" ? now : undefined,
    })
    .eq("id", input.id)
    .or(`assigned_to.is.null,assigned_to.eq.${user.id}`)
    .select("*, project:projects(name)")
    .single();

  if (error || !data) {
    throw new Error(`Failed to update purchase order. ${error?.message ?? "Unknown error"}`);
  }

  revalidatePath("/purchasing-approvals");
  revalidatePath("/purchaser-dashboard");
  return mapRow(data);
}

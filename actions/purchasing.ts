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

export type DeliveryStatus = "pending" | "scheduled" | "in_transit" | "delivered";

export type PurchasingRecord = {
  id: string;
  projectId: string;
  projectName: string;
  materialRequestId: string | null;
  itemName: string;
  quantity: number;
  unit: string;
  supplierName: string;
  estimatedUnitCost: number;
  actualUnitCost: number;
  quotationReference: string;
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
  quotationReference: string;
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

function clean(value: string | undefined) {
  return (value ?? "").trim();
}

function mapRow(row: any): PurchasingRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project?.name ?? "Unknown project",
    materialRequestId: row.material_request_id,
    itemName: row.item_name,
    quantity: Number(row.quantity),
    unit: row.unit,
    supplierName: row.supplier_name ?? "",
    estimatedUnitCost: Number(row.estimated_unit_cost),
    actualUnitCost: Number(row.actual_unit_cost),
    quotationReference: row.quotation_reference ?? "",
    status: row.status,
    deliveryStatus: row.delivery_status ?? "pending",
    receiptInvoiceReference: row.receipt_invoice_reference ?? "",
    notes: row.notes ?? "",
    updatedAt: row.updated_at,
  };
}

export async function getPurchasingRecordsAction(): Promise<PurchasingRecord[]> {
  const { user, profile } = await requireRole([APP_ROLES.CEO, APP_ROLES.PURCHASER]);
  const database = createSupabaseAdminClient() as any;
  let query = database
    .from("purchase_orders")
    .select("*, project:projects(name)")
    .order("updated_at", { ascending: false });

  if (profile.role === APP_ROLES.PURCHASER) {
    query = query.or("assigned_to.is.null,assigned_to.eq." + user.id);
  }

  const { data, error } = await query;
  if (error) throw new Error("Failed to load purchasing records. " + error.message);
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
  if (input.status !== "draft" && !clean(input.quotationReference)) {
    throw new Error("Quotation reference is required once purchasing starts.");
  }
  if (
    input.status === "received" &&
    (input.deliveryStatus !== "delivered" ||
      actualUnitCost <= 0 ||
      !clean(input.receiptInvoiceReference))
  ) {
    throw new Error(
      "Received orders require delivered status, a positive price, and a receipt reference.",
    );
  }

  const database = createSupabaseAdminClient() as any;
  const { error: workflowError } = await database.rpc(
    "update_purchase_order_workflow",
    {
      p_order_id: input.id,
      p_actor: user.id,
      p_supplier_name: clean(input.supplierName),
      p_actual_unit_cost: actualUnitCost,
      p_quotation_reference: clean(input.quotationReference),
      p_status: input.status,
      p_delivery_status: input.deliveryStatus,
      p_receipt_invoice_reference: clean(input.receiptInvoiceReference),
      p_notes: clean(input.notes),
    },
  );

  if (workflowError) {
    throw new Error("Failed to update purchase order. " + workflowError.message);
  }

  const { data, error } = await database
    .from("purchase_orders")
    .select("*, project:projects(name)")
    .eq("id", input.id)
    .single();

  if (error || !data) {
    throw new Error("Purchase order updated but could not be reloaded.");
  }

  revalidatePath("/purchasing-approvals");
  revalidatePath("/purchaser-dashboard");
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath("/projects/" + data.project_id);
  return mapRow(data);
}
"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sanitizeStorageFileName } from "@/features/project-documents/utils/documentValidation";
import {
  buildPurchaseReceiptEvidenceMap,
  PURCHASE_RECEIPT_ENTITY_TYPE,
  type PurchaseReceiptEvidence,
} from "@/features/purchasing-approvals/utils/receiptEvidence";
import { validatePurchaseReceipt } from "@/features/purchasing-approvals/utils/receiptValidation";

const WORKFLOW_EVIDENCE_BUCKET = "workflow-evidence";

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
  receiptFile: PurchaseReceiptEvidence | null;
  notes: string;
  updatedAt: string;
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

function mapRow(
  row: any,
  receiptFile: PurchaseReceiptEvidence | null = null,
): PurchasingRecord {
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
    receiptFile,
    notes: row.notes ?? "",
    updatedAt: row.updated_at,
  };
}

export async function getPurchasingRecordsAction(): Promise<PurchasingRecord[]> {
  const { user } = await requireRole(APP_ROLES.PURCHASER);
  const database = createSupabaseAdminClient() as any;
  const query = database
    .from("purchase_orders")
    .select("*, project:projects(name)")
    .order("updated_at", { ascending: false })
    .or("assigned_to.is.null,assigned_to.eq." + user.id);

  const { data, error } = await query;
  if (error) throw new Error("Failed to load purchasing records. " + error.message);
  const orderIds = (data ?? []).map((order: any) => order.id);
  const { data: evidence } = orderIds.length
    ? await database
        .from("workflow_evidence")
        .select("id,entity_id,file_name,content_type,created_at")
        .eq("entity_type", PURCHASE_RECEIPT_ENTITY_TYPE)
        .in("entity_id", orderIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  const evidenceByOrderId = buildPurchaseReceiptEvidenceMap(evidence ?? []);
  return (data ?? []).map((row: any) =>
    mapRow(row, evidenceByOrderId.get(row.id) ?? null),
  );
}

export async function updatePurchaseOrderAction(
  formData: FormData,
): Promise<PurchasingRecord> {
  const { user } = await requireRole(APP_ROLES.PURCHASER);
  const input = {
    id: clean(String(formData.get("id") ?? "")),
    supplierName: String(formData.get("supplierName") ?? ""),
    actualUnitCost: Number(formData.get("actualUnitCost") ?? 0),
    quotationReference: String(formData.get("quotationReference") ?? ""),
    status: String(formData.get("status") ?? "") as PurchaseStatus,
    deliveryStatus: String(formData.get("deliveryStatus") ?? "") as DeliveryStatus,
    receiptInvoiceReference: String(formData.get("receiptInvoiceReference") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
  const receiptCandidate = formData.get("receiptFile");
  const receiptFile =
    receiptCandidate instanceof File && receiptCandidate.size > 0
      ? receiptCandidate
      : null;
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
  const database = createSupabaseAdminClient() as any;
  const { data: order } = await database
    .from("purchase_orders")
    .select("id,project_id,assigned_to")
    .eq("id", input.id)
    .or(`assigned_to.is.null,assigned_to.eq.${user.id}`)
    .maybeSingle();
  if (!order) throw new Error("This purchase order is not assigned to you.");

  const { data: existingEvidenceRows } = await database
    .from("workflow_evidence")
    .select("id,entity_id,file_name,content_type,created_at")
    .eq("entity_type", PURCHASE_RECEIPT_ENTITY_TYPE)
    .eq("entity_id", order.id)
    .order("created_at", { ascending: false })
    .limit(1);
  const existingEvidence = buildPurchaseReceiptEvidenceMap(
    existingEvidenceRows ?? [],
  ).get(order.id) ?? null;

  if (
    input.status === "received" &&
    (input.deliveryStatus !== "delivered" ||
      actualUnitCost <= 0 ||
      (!receiptFile && !existingEvidence))
  ) {
    throw new Error(
      "Received orders require delivered status, a positive price, and an uploaded receipt or invoice.",
    );
  }

  let uploadedEvidence: PurchaseReceiptEvidence | null = null;
  let uploadedStoragePath = "";
  if (receiptFile) {
    const fileName = validatePurchaseReceipt(receiptFile);
    uploadedStoragePath = `${order.project_id}/purchase-orders/${order.id}/${randomUUID()}-${sanitizeStorageFileName(fileName)}`;
    const payload = Buffer.from(await receiptFile.arrayBuffer());
    const { error: uploadError } = await database.storage
      .from(WORKFLOW_EVIDENCE_BUCKET)
      .upload(uploadedStoragePath, payload, {
        contentType: receiptFile.type,
        upsert: false,
      });
    if (uploadError) {
      throw new Error("Receipt upload failed. " + uploadError.message);
    }

    const { data: evidence, error: evidenceError } = await database
      .from("workflow_evidence")
      .insert({
        project_id: order.project_id,
        entity_type: PURCHASE_RECEIPT_ENTITY_TYPE,
        entity_id: order.id,
        storage_path: uploadedStoragePath,
        file_name: fileName,
        content_type: receiptFile.type,
        uploaded_by: user.id,
      })
      .select("id,entity_id,file_name,content_type,created_at")
      .single();
    if (evidenceError || !evidence) {
      await database.storage
        .from(WORKFLOW_EVIDENCE_BUCKET)
        .remove([uploadedStoragePath]);
      throw new Error(
        "Receipt record could not be created. " +
          (evidenceError?.message ?? "Unknown error"),
      );
    }
    uploadedEvidence = buildPurchaseReceiptEvidenceMap([evidence]).get(order.id) ?? null;
  }

  const receiptReference =
    clean(input.receiptInvoiceReference) ||
    uploadedEvidence?.fileName ||
    existingEvidence?.fileName ||
    "";
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
      p_receipt_invoice_reference: receiptReference,
      p_notes: clean(input.notes),
    },
  );

  if (workflowError) {
    if (uploadedEvidence && uploadedStoragePath) {
      await database
        .from("workflow_evidence")
        .delete()
        .eq("id", uploadedEvidence.id);
      await database.storage
        .from(WORKFLOW_EVIDENCE_BUCKET)
        .remove([uploadedStoragePath]);
    }
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
  return mapRow(data, uploadedEvidence ?? existingEvidence);
}

export async function getPurchaseReceiptDownloadUrlAction(evidenceId: string) {
  const { user, profile } = await requireRole([
    APP_ROLES.CEO,
    APP_ROLES.ENGINEER,
    APP_ROLES.PURCHASER,
  ]);
  const database = createSupabaseAdminClient() as any;
  const { data: evidence } = await database
    .from("workflow_evidence")
    .select("id,project_id,entity_id,entity_type,storage_path")
    .eq("id", evidenceId)
    .eq("entity_type", PURCHASE_RECEIPT_ENTITY_TYPE)
    .maybeSingle();
  if (!evidence) throw new Error("Receipt file not found.");

  const { data: order } = await database
    .from("purchase_orders")
    .select("id,project_id,assigned_to,project:projects(assigned_engineer_id,assigned_estimate_engineer_id)")
    .eq("id", evidence.entity_id)
    .eq("project_id", evidence.project_id)
    .maybeSingle();
  if (!order) throw new Error("Receipt file is not linked to a purchase order.");

  const canRead =
    profile.role === APP_ROLES.CEO ||
    (profile.role === APP_ROLES.PURCHASER &&
      (!order.assigned_to || order.assigned_to === user.id)) ||
    (profile.role === APP_ROLES.ENGINEER &&
      (order.project?.assigned_engineer_id === user.id ||
        order.project?.assigned_estimate_engineer_id === user.id));
  if (!canRead) throw new Error("Receipt access denied.");

  const { data, error } = await database.storage
    .from(WORKFLOW_EVIDENCE_BUCKET)
    .createSignedUrl(evidence.storage_path, 60);
  if (error || !data?.signedUrl) {
    throw new Error("Unable to prepare the receipt download.");
  }
  return data.signedUrl;
}

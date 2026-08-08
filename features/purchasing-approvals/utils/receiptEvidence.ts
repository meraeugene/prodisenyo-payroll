export const PURCHASE_RECEIPT_ENTITY_TYPE = "purchase_receipt";

export type PurchaseReceiptEvidence = {
  id: string;
  fileName: string;
  contentType: string;
  createdAt: string;
};

export function buildPurchaseReceiptEvidenceMap(rows: any[]) {
  const evidenceByOrderId = new Map<string, PurchaseReceiptEvidence>();

  for (const row of rows) {
    if (evidenceByOrderId.has(row.entity_id)) continue;
    evidenceByOrderId.set(row.entity_id, {
      id: row.id,
      fileName: row.file_name,
      contentType: row.content_type ?? "application/octet-stream",
      createdAt: row.created_at,
    });
  }

  return evidenceByOrderId;
}

export function attachPurchaseReceiptEvidence<T extends { id: string }>(
  orders: T[],
  evidenceRows: any[],
) {
  const evidenceByOrderId = buildPurchaseReceiptEvidenceMap(evidenceRows);
  return orders.map((order) => ({
    ...order,
    receipt_evidence: evidenceByOrderId.get(order.id) ?? null,
  }));
}

export const MAX_PURCHASE_RECEIPT_BYTES = 10 * 1024 * 1024;

export const PURCHASE_RECEIPT_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
]);

export function validatePurchaseReceipt(file: {
  name: string;
  size: number;
  type: string;
}) {
  const fileName = file.name.trim();
  if (!fileName) throw new Error("Choose a receipt or invoice to upload.");
  if (file.size <= 0) throw new Error("The selected receipt file is empty.");
  if (file.size > MAX_PURCHASE_RECEIPT_BYTES) {
    throw new Error("Receipt files must be 10 MB or smaller.");
  }
  if (!PURCHASE_RECEIPT_TYPES.has(file.type)) {
    throw new Error("Upload a PDF, PNG, JPG, or JPEG receipt file.");
  }
  return fileName;
}

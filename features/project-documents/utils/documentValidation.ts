import {
  PROJECT_DOCUMENT_CATEGORIES,
  type ProjectDocumentCategory,
} from "../types";

export const MAX_PROJECT_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_PROJECT_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
]);

export function parseProjectDocumentCategory(value: unknown): ProjectDocumentCategory {
  return typeof value === "string" && PROJECT_DOCUMENT_CATEGORIES.includes(value as ProjectDocumentCategory)
    ? (value as ProjectDocumentCategory)
    : "other";
}

export function validateProjectDocument(file: { name: string; size: number; type: string }) {
  const fileName = file.name.trim();
  if (!fileName) throw new Error("Choose a document to upload.");
  if (file.size <= 0) throw new Error("The selected document is empty.");
  if (file.size > MAX_PROJECT_DOCUMENT_BYTES) throw new Error("Documents must be 10 MB or smaller.");
  if (!ALLOWED_PROJECT_DOCUMENT_TYPES.has(file.type)) {
    throw new Error("Upload a PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, or JPEG file.");
  }
  return fileName;
}

export function sanitizeStorageFileName(fileName: string) {
  const normalized = fileName.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return normalized.replace(/^-+|-+$/g, "") || "document";
}


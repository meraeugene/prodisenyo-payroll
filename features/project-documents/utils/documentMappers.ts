import type { ProjectDocumentRecord } from "../types";
import { parseProjectDocumentCategory } from "./documentValidation";

export function mapProjectDocumentRow(row: any): ProjectDocumentRecord {
  return {
    id: row.id,
    project_id: row.project_id,
    uploaded_by: row.uploaded_by,
    uploader_name: row.uploader?.full_name || row.uploader?.username || "Project member",
    file_name: row.file_name,
    storage_path: row.storage_path,
    mime_type: row.mime_type,
    file_size: Number(row.file_size),
    category: parseProjectDocumentCategory(row.category),
    created_at: row.created_at,
  };
}


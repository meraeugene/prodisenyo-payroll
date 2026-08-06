export const PROJECT_DOCUMENT_CATEGORIES = [
  "plans",
  "reports",
  "permits",
  "contracts",
  "photos",
  "forms",
  "other",
] as const;

export type ProjectDocumentCategory = (typeof PROJECT_DOCUMENT_CATEGORIES)[number];

export interface ProjectDocumentRecord {
  id: string;
  project_id: string;
  uploaded_by: string;
  uploader_name: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  category: ProjectDocumentCategory;
  created_at: string;
}


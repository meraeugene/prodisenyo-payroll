"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { ProjectDocumentRecord } from "@/features/project-documents/types";
import { mapProjectDocumentRow } from "@/features/project-documents/utils/documentMappers";
import {
  parseProjectDocumentCategory,
  sanitizeStorageFileName,
  validateProjectDocument,
} from "@/features/project-documents/utils/documentValidation";

const PROJECT_DOCUMENT_BUCKET = "project-documents";

async function requireProjectAccess(projectId: string, write = false) {
  const { user, profile } = await requireRole([APP_ROLES.CEO, APP_ROLES.ENGINEER]);
  const database = createSupabaseAdminClient() as any;
  let query = database.from("projects").select("id,assigned_engineer_id,assigned_estimate_engineer_id").eq("id", projectId).neq("status", "archived");
  if (profile.role === APP_ROLES.ENGINEER) {
    query = write
      ? query.eq("assigned_engineer_id", user.id)
      : query.or(`assigned_engineer_id.eq.${user.id},assigned_estimate_engineer_id.eq.${user.id}`);
  }
  const { data: project } = await query.maybeSingle();
  if (!project) throw new Error(write ? "Only the assigned site engineer can upload project documents." : "Project document access denied.");
  return { user, profile, database };
}

export async function uploadProjectDocumentAction(formData: FormData): Promise<ProjectDocumentRecord> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const category = parseProjectDocumentCategory(formData.get("category"));
  const file = formData.get("file");
  if (!projectId) throw new Error("Project is required.");
  if (!(file instanceof File)) throw new Error("Choose a document to upload.");
  const fileName = validateProjectDocument(file);
  const { user, database } = await requireProjectAccess(projectId, true);
  const storagePath = `${projectId}/${user.id}/${randomUUID()}-${sanitizeStorageFileName(fileName)}`;
  const payload = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await database.storage.from(PROJECT_DOCUMENT_BUCKET).upload(storagePath, payload, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw new Error(`Document upload failed. ${uploadError.message}`);

  const { data, error } = await database
    .from("project_documents")
    .insert({ project_id: projectId, uploaded_by: user.id, file_name: fileName, storage_path: storagePath, mime_type: file.type, file_size: file.size, category })
    .select("*, uploader:profiles!project_documents_uploaded_by_fkey(full_name,username)")
    .single();
  if (error || !data) {
    await database.storage.from(PROJECT_DOCUMENT_BUCKET).remove([storagePath]);
    throw new Error(`Document record could not be created. ${error?.message ?? "Unknown error"}`);
  }
  revalidatePath(`/projects/${projectId}`);
  return mapProjectDocumentRow(data);
}

export async function getProjectDocumentDownloadUrlAction(documentId: string) {
  const database = createSupabaseAdminClient() as any;
  const { data: document } = await database.from("project_documents").select("id,project_id,storage_path").eq("id", documentId).maybeSingle();
  if (!document) throw new Error("Document not found.");
  await requireProjectAccess(document.project_id);
  const { data, error } = await database.storage.from(PROJECT_DOCUMENT_BUCKET).createSignedUrl(document.storage_path, 60);
  if (error || !data?.signedUrl) throw new Error("Unable to prepare the document download.");
  return data.signedUrl;
}

export async function deleteProjectDocumentAction(documentId: string) {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const database = createSupabaseAdminClient() as any;
  const { data: document } = await database.from("project_documents").select("id,project_id,uploaded_by,storage_path").eq("id", documentId).eq("uploaded_by", user.id).maybeSingle();
  if (!document) throw new Error("You can delete only documents that you uploaded.");
  await requireProjectAccess(document.project_id, true);
  const { error: storageError } = await database.storage.from(PROJECT_DOCUMENT_BUCKET).remove([document.storage_path]);
  if (storageError) throw new Error(`Document could not be removed. ${storageError.message}`);
  const { error } = await database.from("project_documents").delete().eq("id", document.id).eq("uploaded_by", user.id);
  if (error) throw new Error(`Document record could not be removed. ${error.message}`);
  revalidatePath(`/projects/${document.project_id}`);
  return document.id as string;
}


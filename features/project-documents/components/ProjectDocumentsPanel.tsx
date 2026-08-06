"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  Download,
  FileImage,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteProjectDocumentAction,
  getProjectDocumentDownloadUrlAction,
  uploadProjectDocumentAction,
} from "@/actions/projectDocuments";
import {
  PROJECT_DOCUMENT_CATEGORIES,
  type ProjectDocumentCategory,
  type ProjectDocumentRecord,
} from "../types";

function formatDate(value: string, includeTime = false) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function DocumentIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return <FileSpreadsheet size={18} className="text-emerald-700" />;
  if (mimeType.startsWith("image/")) return <FileImage size={18} className="text-sky-700" />;
  return <FileText size={18} className={mimeType === "application/pdf" ? "text-rose-600" : "text-blue-700"} />;
}

export default function ProjectDocumentsPanel({
  projectId, documents, canUpload, currentUserId, onCreated, onDeleted,
}: {
  projectId: string;
  documents: ProjectDocumentRecord[];
  canUpload: boolean;
  currentUserId: string;
  onCreated: (document: ProjectDocumentRecord) => void;
  onDeleted: (documentId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | ProjectDocumentCategory>("all");
  const [uploadCategory, setUploadCategory] = useState<ProjectDocumentCategory>("other");
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return documents.filter((document) =>
      (!query || document.file_name.toLowerCase().includes(query) || document.uploader_name.toLowerCase().includes(query))
      && (category === "all" || document.category === category),
    );
  }, [category, documents, search]);

  function upload(file: File | undefined) {
    if (!file || !canUpload) return;
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("category", uploadCategory);
    formData.set("file", file);
    startTransition(async () => {
      try {
        const created = await uploadProjectDocumentAction(formData);
        onCreated(created);
        if (inputRef.current) inputRef.current.value = "";
        toast.success("Document uploaded.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to upload document.");
      }
    });
  }

  function download(document: ProjectDocumentRecord) {
    setActiveDocumentId(document.id);
    void getProjectDocumentDownloadUrlAction(document.id)
      .then((url) => window.open(url, "_blank", "noopener,noreferrer"))
      .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to download document."))
      .finally(() => setActiveDocumentId(null));
  }

  function remove(document: ProjectDocumentRecord) {
    if (!window.confirm(`Delete ${document.file_name}? This cannot be undone.`)) return;
    setActiveDocumentId(document.id);
    void deleteProjectDocumentAction(document.id)
      .then((id) => { onDeleted(id); toast.success("Document deleted."); })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to delete document."))
      .finally(() => setActiveDocumentId(null));
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_6px_22px_rgba(15,23,42,.04)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h2 className="text-xl font-semibold text-slate-950">Project Documents</h2><p className="mt-1 text-sm text-slate-500">Project files and uploaded documents.</p></div>
        {canUpload ? <div className="flex gap-2"><select aria-label="Upload category" value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value as ProjectDocumentCategory)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm capitalize outline-none focus:border-emerald-600">{PROJECT_DOCUMENT_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select><button type="button" onClick={() => inputRef.current?.click()} disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"><UploadCloud size={16} /> Upload Document</button></div> : null}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200">
          <div className="flex flex-col gap-2 border-b border-slate-200 p-4 sm:flex-row">
            <label className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><span className="sr-only">Search documents</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search documents..." className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
            <select aria-label="Filter documents by category" value={category} onChange={(event) => setCategory(event.target.value as typeof category)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm capitalize outline-none focus:border-emerald-600"><option value="all">All categories</option>{PROJECT_DOCUMENT_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50/70 text-xs text-slate-500"><tr><th className="px-4 py-3">Document Name</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Uploaded By</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Size</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((document) => <tr key={document.id} className="hover:bg-slate-50/70"><td className="px-4 py-3"><span className="flex items-center gap-3 font-semibold text-slate-900"><DocumentIcon mimeType={document.mime_type} />{document.file_name}</span></td><td className="px-4 py-3 capitalize text-slate-600">{document.category}</td><td className="px-4 py-3 text-slate-600">{document.uploader_name}</td><td className="px-4 py-3 text-slate-600">{formatDate(document.created_at)}</td><td className="px-4 py-3 text-slate-600">{formatSize(document.file_size)}</td><td className="px-4 py-3"><div className="flex justify-end gap-1"><button type="button" onClick={() => download(document)} disabled={activeDocumentId === document.id} aria-label={`Download ${document.file_name}`} className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700">{activeDocumentId === document.id ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}</button>{canUpload && document.uploaded_by === currentUserId ? <button type="button" onClick={() => remove(document)} disabled={activeDocumentId === document.id} aria-label={`Delete ${document.file_name}`} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button> : null}</div></td></tr>)}</tbody></table></div>
          {filtered.length === 0 ? <div className="px-5 py-12 text-center"><FileText size={32} className="mx-auto text-slate-300" /><p className="mt-3 font-medium text-slate-700">No documents found</p><p className="mt-1 text-sm text-slate-500">Uploaded project files will appear here.</p></div> : null}
          <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Showing {filtered.length} of {documents.length} documents</p>
        </div>

        <aside className="space-y-5">
          {canUpload ? <label onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); upload(event.dataTransfer.files[0]); }} className={`flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 text-center transition ${dragging ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-slate-50/40 hover:border-emerald-400"}`}><input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" className="sr-only" onChange={(event) => upload(event.target.files?.[0])} /><UploadCloud size={28} className="text-emerald-700" /><p className="mt-3 text-sm font-semibold text-slate-800">Drop a file or click to browse</p><p className="mt-2 text-xs leading-5 text-slate-500">PDF, DOC, DOCX, XLS, XLSX, PNG or JPG<br />Maximum 10 MB per file</p>{pending ? <span className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-emerald-700"><LoaderCircle size={14} className="animate-spin" /> Uploading...</span> : null}</label> : null}
          <section className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold text-slate-950">Recent Uploads</h3><div className="mt-3 divide-y divide-slate-100">{documents.slice(0, 5).map((document) => <button type="button" key={document.id} onClick={() => download(document)} className="flex w-full gap-3 py-3 text-left hover:text-emerald-800"><div className="mt-0.5"><DocumentIcon mimeType={document.mime_type} /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{document.file_name}</p><p className="mt-1 text-xs text-slate-500">{formatDate(document.created_at, true)}</p></div></button>)}{documents.length === 0 ? <p className="py-7 text-center text-sm text-slate-500">No uploads yet.</p> : null}</div></section>
        </aside>
      </div>
    </section>
  );
}


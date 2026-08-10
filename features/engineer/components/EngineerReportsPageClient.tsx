"use client";

import { useState, useTransition } from "react";
import { TbFileDescription, TbPaperclip, TbPlus, TbX } from "react-icons/tb";
import { toast } from "sonner";
import { saveEngineerReportAction } from "@/actions/engineer";
import EngineerPageHeader from "@/features/engineer/components/EngineerPageHeader";
import EngineerPreviewBanner from "@/features/engineer/components/EngineerPreviewBanner";
import EngineerReportEditor from "@/features/engineer/components/EngineerReportEditor";
import type { EngineerProject, EngineerReport } from "@/features/engineer/types";
import { formatEngineerDate, humanizeEngineerStatus, isPastDate } from "@/features/engineer/utils/engineerDashboard";

const field = "h-10 w-full rounded-[6px] border border-[#d9e2dc] bg-white px-3 text-sm outline-none focus:border-[#087332]";

function ReportDialog({ projects, preview, onMockSubmit, onClose }: { projects: EngineerProject[]; preview: boolean; onMockSubmit: (data: FormData) => void; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [content, setContent] = useState('{"type":"doc","content":[]}');
  const [intent, setIntent] = useState<"draft" | "submit">("draft");

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[#111827]/35 p-3">
      <button className="absolute inset-0" onClick={onClose} aria-label="Close report form" />
      <form
        className="relative z-10 max-h-[95vh] w-full max-w-[780px] overflow-y-auto rounded-[8px] border border-[#dbe4de] bg-white shadow-[0_24px_70px_rgba(15,45,26,0.18)]"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          startTransition(async () => {
            try { const data = new FormData(form); if (preview) onMockSubmit(data); else await saveEngineerReportAction(data); toast.success("Report saved."); onClose(); }
            catch (error) { toast.error(error instanceof Error ? error.message : "Could not save report."); }
          });
        }}
      >
        <input type="hidden" name="intent" value={intent} />
        <div className="flex items-start justify-between border-b border-[#e1e7e3] p-5"><div><h2 className="text-lg font-semibold">Create report</h2><p className="mt-1 text-xs text-[#77808a]">Save a draft or submit it for CEO review.</p></div><button type="button" onClick={onClose}><TbX /></button></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold">Project<select name="projectId" required className={field}><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <label className="grid gap-1.5 text-xs font-semibold">Report type<select name="reportType" className={field}><option value="daily">Daily progress report</option><option value="weekly">Weekly progress report</option><option value="accomplishment">Site accomplishment report</option></select></label>
          <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Title<input name="title" required className={field} /></label>
          <label className="grid gap-1.5 text-xs font-semibold">Progress percentage<input name="progressPercent" type="number" min={0} max={100} defaultValue={0} required className={field} /></label>
          <label className="grid gap-1.5 text-xs font-semibold">Due date<input name="dueDate" type="date" className={field} /></label>
          <div className="sm:col-span-2"><p className="mb-1.5 text-xs font-semibold">Report content</p><EngineerReportEditor onChange={setContent} /><input type="hidden" name="contentJson" value={content} /></div>
          <label className="grid gap-1.5 text-xs font-semibold">Issues encountered<textarea name="issues" rows={3} className={`${field} h-auto p-3`} /></label>
          <label className="grid gap-1.5 text-xs font-semibold">Recommendations<textarea name="recommendations" rows={3} className={`${field} h-auto p-3`} /></label>
          <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Next work schedule<textarea name="nextSchedule" rows={2} className={`${field} h-auto p-3`} /></label>
          <label className="flex cursor-pointer items-center gap-2 rounded-[6px] border border-dashed border-[#b8cabe] p-4 text-xs font-semibold text-[#087332] sm:col-span-2"><TbPaperclip />Attach images or documents<input name="attachments" type="file" accept="image/*,application/pdf" multiple className="sr-only" /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#e1e7e3] p-4"><button type="submit" onClick={() => setIntent("draft")} disabled={pending} className="h-10 rounded-[6px] border border-[#cdd9d1] px-4 text-xs font-semibold">Save draft</button><button type="submit" onClick={() => setIntent("submit")} disabled={pending} className="h-10 rounded-[6px] bg-[#087332] px-5 text-xs font-semibold text-white">Submit report</button></div>
      </form>
    </div>
  );
}

export default function EngineerReportsPageClient({ projects, reports, preview = false }: { projects: EngineerProject[]; reports: EngineerReport[]; preview?: boolean }) {
  const [open, setOpen] = useState(false);
  const [visibleReports, setVisibleReports] = useState(reports);
  const addMockReport = (data: FormData) => { const project = projects.find((item) => item.id === String(data.get("projectId"))); if (!project) return; const intent = String(data.get("intent")); setVisibleReports((current) => [{ id: `mock-report-${Date.now()}`, project_id: project.id, author_id: "mock-engineer", report_type: String(data.get("reportType")) as EngineerReport["report_type"], title: String(data.get("title")), content_json: {}, progress_percent: Number(data.get("progressPercent")), issues: String(data.get("issues") || "") || null, recommendations: String(data.get("recommendations") || "") || null, next_schedule: String(data.get("nextSchedule") || "") || null, due_date: String(data.get("dueDate") || "") || null, status: intent === "submit" ? "submitted" : "draft", revision_note: null, attachment_paths: [], submitted_at: intent === "submit" ? new Date().toISOString() : null, created_at: new Date().toISOString(), project: { id: project.id, name: project.name, site: project.site } }, ...current]); };
  return <div className="mx-auto max-w-[1400px] p-4 sm:p-7">{preview ? <EngineerPreviewBanner /> : null}<EngineerPageHeader title="Reports" description="Prepare site reports and track their review status." action={<button onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-[6px] bg-[#087332] px-4 text-xs font-semibold text-white"><TbPlus />Create report</button>} /><section className="mt-6 overflow-hidden rounded-[7px] border border-[#d9e2dc] bg-white"><div className="hidden grid-cols-[minmax(260px,1.7fr)_150px_110px_130px_140px] border-b border-[#e1e7e3] px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#77808a] md:grid"><span>Report</span><span>Project</span><span>Progress</span><span>Due</span><span>Status</span></div><div className="divide-y divide-[#e3e8e5]">{visibleReports.map((report) => <article key={report.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(260px,1.7fr)_150px_110px_130px_140px] md:items-center"><div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e9f4ec] text-[#087332]"><TbFileDescription /></span><div><h3 className="text-xs font-semibold">{report.title}</h3><p className="mt-1 text-[9px] text-[#77808a]">{humanizeEngineerStatus(report.report_type)}</p></div></div><p className="truncate text-xs">{report.project?.name}</p><p className="text-xs font-semibold text-[#087332]">{report.progress_percent}%</p><p className={`text-xs ${isPastDate(report.due_date) && report.status !== "accepted" ? "font-semibold text-[#d12d3c]" : "text-[#5f6972]"}`}>{formatEngineerDate(report.due_date)}</p><span className={`w-fit rounded-full px-3 py-1 text-[9px] font-semibold ${report.status === "revision_requested" ? "bg-[#fdebed] text-[#c72d3b]" : report.status === "accepted" ? "bg-[#e9f4ec] text-[#087332]" : "bg-[#fff4df] text-[#b96a00]"}`}>{humanizeEngineerStatus(report.status)}</span></article>)}</div>{!visibleReports.length ? <p className="p-12 text-center text-sm text-[#7a838c]">No reports yet.</p> : null}</section>{open ? <ReportDialog projects={projects} preview={preview} onMockSubmit={addMockReport} onClose={() => setOpen(false)} /> : null}</div>;
}

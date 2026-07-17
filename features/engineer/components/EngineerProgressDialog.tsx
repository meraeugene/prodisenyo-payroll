"use client";

import { useState, useTransition } from "react";
import { TbFileUpload, TbPhoto, TbX } from "react-icons/tb";
import { toast } from "sonner";
import { submitEngineerProgressUpdateAction } from "@/actions/engineer";
import type { EngineerProject } from "@/features/engineer/types";
import { manilaDateKey } from "@/features/engineer/utils/engineerDashboard";

const field = "h-10 w-full rounded-[6px] border border-[#d9e2dc] bg-white px-3 text-sm outline-none focus:border-[#087332] focus:ring-2 focus:ring-[#087332]/10";

export default function EngineerProgressDialog({ open, projects, initialProjectId, mockMode = false, onMockSubmit, onClose }: { open: boolean; projects: EngineerProject[]; initialProjectId?: string; mockMode?: boolean; onMockSubmit?: (formData: FormData) => void; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState(projects.find((project) => project.id === initialProjectId)?.reported_progress ?? projects[0]?.reported_progress ?? 0);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[#111827]/35 p-3" role="dialog" aria-modal="true" aria-labelledby="progress-dialog-title">
      <button type="button" className="absolute inset-0" aria-label="Close progress dialog" onClick={onClose} />
      <form className="relative z-10 max-h-[94vh] w-full max-w-[720px] overflow-y-auto rounded-[10px] border border-[#dce5df] bg-white shadow-[0_24px_70px_rgba(15,45,26,0.18)]" onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        if (mockMode) {
          onMockSubmit?.(formData);
          toast.success("Preview update published. It will reset after refresh.");
          onClose();
          return;
        }
        startTransition(async () => {
          try { await submitEngineerProgressUpdateAction(formData); toast.success("Site progress update published."); onClose(); }
          catch (error) { toast.error(error instanceof Error ? error.message : "Could not publish the update."); }
        });
      }}>
        <div className="flex items-start justify-between border-b border-[#e1e7e3] px-6 py-5">
          <div><h2 id="progress-dialog-title" className="text-lg font-semibold">Post site update</h2><p className="mt-1 text-xs text-[#77808a]">This becomes visible in the executive activity feed.</p></div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-[#f0f4f1]" aria-label="Close"><TbX size={20} /></button>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold text-[#353d46]">Project<select name="projectId" defaultValue={initialProjectId ?? projects[0]?.id} required className={field}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#353d46]">Update date<input name="reportDate" type="date" defaultValue={manilaDateKey()} required className={field} /></label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#353d46]">Current phase<select name="currentPhase" defaultValue={projects.find((project) => project.id === initialProjectId)?.current_phase ?? projects[0]?.current_phase ?? "planning"} className={field}><option value="planning">Planning</option><option value="foundation">Foundation</option><option value="structural">Structural</option><option value="finishing">Finishing</option><option value="completed">Completed</option></select></label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#353d46]">Progress title<input name="title" required placeholder="e.g. Foundation concrete pour completed" className={field} /></label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#353d46] sm:col-span-2">Description<textarea name="description" rows={2} className={`${field} h-auto py-2`} placeholder="A short context summary for management" /></label>
          <label className="grid gap-2 text-xs font-semibold text-[#353d46] sm:col-span-2">Overall completion <span className="text-xl text-[#087332]">{progress}%</span><input name="progressPercent" type="range" min={0} max={100} value={progress} onChange={(event) => setProgress(Number(event.target.value))} className="accent-[#087332]" /></label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#353d46] sm:col-span-2">Accomplishment<textarea name="completedWork" rows={3} required className={`${field} h-auto py-2`} placeholder="What was completed?" /></label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#353d46]">Issues encountered<textarea name="issues" rows={3} className={`${field} h-auto py-2`} /></label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#353d46]">Risks<textarea name="risks" rows={3} className={`${field} h-auto py-2`} /></label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#353d46]">Next planned activity<textarea name="nextActivity" rows={2} className={`${field} h-auto py-2`} /></label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#353d46]">Next steps<textarea name="nextSteps" rows={2} required className={`${field} h-auto py-2`} /></label>
          <label className="flex cursor-pointer items-center gap-3 rounded-[7px] border border-dashed border-[#b8cabe] p-4 text-xs font-semibold text-[#087332]"><TbPhoto size={20} />Site photos<input name="photos" type="file" accept="image/*" multiple className="sr-only" /></label>
          <label className="flex cursor-pointer items-center gap-3 rounded-[7px] border border-dashed border-[#b8cabe] p-4 text-xs font-semibold text-[#087332]"><TbFileUpload size={20} />Documents<input name="documents" type="file" accept="image/*,application/pdf" multiple className="sr-only" /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#e1e7e3] px-6 py-4"><button type="button" onClick={onClose} className="h-10 rounded-[6px] border border-[#d7e0da] px-4 text-xs font-semibold">Cancel</button><button disabled={pending || !projects.length} className="h-10 rounded-[6px] bg-[#087332] px-5 text-xs font-semibold text-white disabled:opacity-60">{pending ? "Publishing…" : "Publish update"}</button></div>
      </form>
    </div>
  );
}

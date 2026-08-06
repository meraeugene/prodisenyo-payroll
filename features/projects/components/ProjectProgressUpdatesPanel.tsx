"use client";

import { useState, useTransition } from "react";
import { ClipboardCheck, LoaderCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { createProjectProgressUpdateAction } from "@/actions/projects";
import type { ProjectProgressUpdateRecord } from "../progressUpdateTypes";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export default function ProjectProgressUpdatesPanel({
  projectId,
  updates,
  canSubmit,
  onCreated,
  displayMode = "full",
  historyClassName,
}: {
  projectId: string;
  updates: ProjectProgressUpdateRecord[];
  canSubmit: boolean;
  onCreated: (update: ProjectProgressUpdateRecord) => void;
  displayMode?: "full" | "form" | "history";
  historyClassName?: string;
}) {
  const [overallPercent, setOverallPercent] = useState(0);
  const [completedWorkSummary, setCompletedWorkSummary] = useState("");
  const [remarks, setRemarks] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const update = await createProjectProgressUpdateAction({
          projectId,
          overallPercent,
          completedWorkSummary,
          remarks,
        });
        onCreated(update);
        setCompletedWorkSummary("");
        setRemarks("");
        toast.success("Progress update submitted.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to submit progress update.");
      }
    });
  }

  return (
    <div className={displayMode === "full" ? "grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]" : "min-w-0"}>
      {canSubmit && displayMode !== "history" ? (
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_22px_rgba(15,23,42,.04)] sm:p-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <ClipboardCheck size={18} className="text-emerald-700" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Add Progress Update</h2>
              <p className="mt-0.5 text-xs text-slate-500">Record the project&apos;s overall site update separately from activity percentages.</p>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Overall progress percentage</span>
              <div className="mt-2 flex items-center gap-4">
                <input type="range" min="0" max="100" step="1" value={overallPercent} onChange={(event) => setOverallPercent(Number(event.target.value))} className="h-2 flex-1 cursor-pointer accent-emerald-700" />
                <div className="relative w-24"><input type="number" min="0" max="100" value={overallPercent} onChange={(event) => setOverallPercent(Math.max(0, Math.min(100, Number(event.target.value))))} className="h-11 w-full rounded-lg border border-slate-200 px-3 pr-8 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span></div>
              </div>
            </label>

            <label className="block"><span className="text-sm font-semibold text-slate-700">Completed work summary <span className="text-rose-500">*</span></span><textarea required maxLength={1000} rows={6} value={completedWorkSummary} onChange={(event) => setCompletedWorkSummary(event.target.value)} placeholder="Summarize the work completed during this update period." className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm leading-6 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /><span className="mt-1 block text-right text-xs text-slate-400">{completedWorkSummary.length} / 1000</span></label>
            <label className="block"><span className="text-sm font-semibold text-slate-700">Remarks</span><textarea maxLength={600} rows={4} value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Add optional site notes or next steps." className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm leading-6 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /><span className="mt-1 block text-right text-xs text-slate-400">{remarks.length} / 600</span></label>
          </div>

          <button type="submit" disabled={pending || !completedWorkSummary.trim()} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
            {pending ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
            {pending ? "Submitting..." : "Submit Progress Update"}
          </button>
        </form>
      ) : null}

      {displayMode !== "form" ? <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_22px_rgba(15,23,42,.04)] ${historyClassName ?? (canSubmit ? "" : "xl:col-span-2")}`}>
        <h2 className="text-lg font-semibold text-slate-950">Progress Update History</h2>
        <p className="mt-1 text-xs text-slate-500">Overall site updates do not change weighted activity progress.</p>
        <div className="mt-4 space-y-3">
          {updates.map((update) => (
            <article key={update.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-start justify-between gap-4"><div><p className="text-2xl font-semibold text-emerald-800">{update.overall_percent}%</p><time className="mt-1 block text-xs text-slate-400">{formatDate(update.created_at)}</time></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Submitted</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${update.overall_percent}%` }} /></div>
              <p className="mt-4 text-sm font-semibold text-slate-800">Completed work</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{update.completed_work_summary}</p>
              {update.remarks ? <><p className="mt-3 text-sm font-semibold text-slate-800">Remarks</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{update.remarks}</p></> : null}
            </article>
          ))}
          {updates.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 px-5 py-12 text-center"><p className="font-medium text-slate-700">No progress updates yet</p><p className="mt-1 text-sm text-slate-500">Submitted overall updates will appear here.</p></div> : null}
        </div>
      </section> : null}
    </div>
  );
}

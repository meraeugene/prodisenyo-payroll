"use client";

import { useEffect, useRef } from "react";
import { CalendarDays, CheckCircle2, ClipboardList, Flag, Milestone, Plus, UserRound, X } from "lucide-react";
import type { OperationsProject, ProgressUpdate } from "@/features/operations/types";
import { buildProjectPortfolioRow, formatOperationsDate, formatProjectHealth, projectHealthClasses } from "@/features/operations/utils/operationsFormatters";

export default function OperationsProjectDrawer({ project, onClose, onCreateMilestone, onCreateTask, onOpenUpdate }: { project: OperationsProject | null; onClose: () => void; onCreateMilestone: () => void; onCreateTask: () => void; onOpenUpdate: (update: ProgressUpdate) => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!project) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = ""; previous?.focus(); };
  }, [onClose, project]);

  if (!project) return null;
  const row = buildProjectPortfolioRow(project);

  return (
    <div className="fixed inset-0 z-[90] bg-black/25" role="presentation" onMouseDown={onClose}>
      <aside role="dialog" aria-modal="true" aria-labelledby="project-drawer-title" className="absolute inset-y-0 right-0 flex w-full max-w-[430px] flex-col bg-white shadow-[-18px_0_50px_rgba(15,40,24,0.16)]" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-[#e0e6e2] px-5 py-5">
          <div className="min-w-0 pr-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#087332]">Project overview</p><h2 id="project-drawer-title" className="mt-1 truncate text-xl font-semibold text-[#171c24]">{project.name}</h2><p className="mt-1 text-[11px] text-[#707884]">{project.site}</p></div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close project details" className="grid h-9 w-9 shrink-0 place-items-center rounded-[6px] border border-[#dce3de] text-[#4f5762] hover:bg-[#f4f8f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087332]"><X size={17} /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[8px] border border-[#e0e6e2] p-3"><p className="text-[9px] uppercase tracking-[0.08em] text-[#7a828d]">Reported progress</p><p className="mt-1 text-2xl font-semibold text-[#087332]">{project.reported_progress}%</p><div className="mt-2 h-1.5 rounded-full bg-[#e7ebe9]"><div className="h-full rounded-full bg-[#087332]" style={{ width: `${project.reported_progress}%` }} /></div></div>
            <div className="rounded-[8px] border border-[#e0e6e2] p-3"><p className="text-[9px] uppercase tracking-[0.08em] text-[#7a828d]">Due state</p><span className={`mt-2 inline-flex rounded px-2 py-1 text-[10px] font-semibold ${projectHealthClasses(row.health)}`}>{formatProjectHealth(row.health)}</span><p className="mt-2 text-[10px] text-[#6e7681]">Due {formatOperationsDate(project.target_date)}</p></div>
          </div>

          <dl className="mt-5 grid gap-3 text-[11px]">
            <div className="flex items-center gap-3"><UserRound size={16} className="text-[#087332]" /><div><dt className="text-[9px] text-[#7a828d]">Lead engineer</dt><dd className="font-medium text-[#293039]">{project.lead_engineer?.full_name ?? project.lead_engineer?.username ?? "Unassigned"}</dd></div></div>
            <div className="flex items-center gap-3"><CalendarDays size={16} className="text-[#087332]" /><div><dt className="text-[9px] text-[#7a828d]">Schedule</dt><dd className="font-medium text-[#293039]">{formatOperationsDate(project.start_date)} — {formatOperationsDate(project.target_date)}</dd></div></div>
          </dl>

          {row.latestUpdate?.blockers ? <section className="mt-5 rounded-[8px] border border-[#f2c9cc] bg-[#fff7f7] p-3"><div className="flex items-center gap-2 text-[11px] font-semibold text-[#b42d38]"><Flag size={14} />Current blocker</div><p className="mt-1.5 text-[11px] leading-5 text-[#5e373b]">{row.latestUpdate.blockers}</p></section> : null}

          <section className="mt-6"><div className="flex items-center justify-between"><h3 className="text-[12px] font-semibold text-[#20262e]">Tasks</h3><span className="text-[10px] text-[#747c87]">{row.completedTasks} of {row.totalTasks} complete</span></div><div className="mt-2 divide-y divide-[#e5eae6] border-y border-[#e5eae6]">{project.tasks?.slice(0, 5).map((task) => <div key={task.id} className="flex items-center gap-2 py-2.5 text-[10px]"><CheckCircle2 size={14} className={task.status === "completed" ? "text-[#087332]" : "text-[#9aa0a7]"} /><span className="min-w-0 flex-1 truncate text-[#343a43]">{task.title}</span><span className="capitalize text-[#7b828c]">{task.status.replaceAll("_", " ")}</span></div>)}{!project.tasks?.length ? <p className="py-4 text-center text-[10px] text-[#858c95]">No tasks assigned yet.</p> : null}</div></section>

          <section className="mt-6"><div className="flex items-center justify-between"><h3 className="text-[12px] font-semibold text-[#20262e]">Milestones</h3><span className="text-[10px] text-[#747c87]">{row.completedMilestones} of {row.totalMilestones} complete</span></div><div className="mt-2 divide-y divide-[#e5eae6] border-y border-[#e5eae6]">{project.milestones?.slice(0, 5).map((milestone) => <div key={milestone.id} className="flex items-center gap-2 py-2.5 text-[10px]"><Milestone size={14} className={milestone.is_completed ? "text-[#087332]" : "text-[#9aa0a7]"} /><span className="min-w-0 flex-1 truncate text-[#343a43]">{milestone.title}</span><span className="text-[#7b828c]">{formatOperationsDate(milestone.due_date)}</span></div>)}{!project.milestones?.length ? <p className="py-4 text-center text-[10px] text-[#858c95]">No milestones created yet.</p> : null}</div></section>

          {row.latestUpdate ? <section className="mt-6"><h3 className="text-[12px] font-semibold text-[#20262e]">Latest field update</h3><button type="button" onClick={() => onOpenUpdate(row.latestUpdate!)} className="mt-2 w-full rounded-[8px] border border-[#dfe5e1] p-3 text-left hover:border-[#9bbca6]"><p className="text-[10px] font-medium text-[#303741]">{formatOperationsDate(row.latestUpdate.created_at)}</p><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#737b86]">{row.latestUpdate.completed_work}</p></button></section> : null}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-[#e0e6e2] p-4">
          <button type="button" onClick={onCreateMilestone} className="inline-flex h-10 items-center justify-center gap-2 rounded-[6px] border border-[#087332] text-[11px] font-semibold text-[#087332] hover:bg-[#f2f8f4]"><Plus size={14} />Milestone</button>
          <button type="button" onClick={onCreateTask} className="inline-flex h-10 items-center justify-center gap-2 rounded-[6px] bg-[#087332] text-[11px] font-semibold text-white hover:bg-[#065d29]"><ClipboardList size={14} />Assign task</button>
        </div>
      </aside>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Flag, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";
import { commentOnProgressAction, createMilestoneAction, createOperationsProjectAction, createOperationsTaskAction, flagProgressUpdateAction } from "@/actions/operations";
import type { OperationsModalName } from "@/features/operations/components/CeoOperationsPageClient";
import type { OperationsProject, ProfileOption, ProgressUpdate } from "@/features/operations/types";
import { formatOperationsDate } from "@/features/operations/utils/operationsFormatters";

const input = "h-10 w-full rounded-[6px] border border-[#d9e1db] bg-white px-3 text-sm outline-none focus:border-[#087332] focus:ring-1 focus:ring-[#087332]";

export default function OperationsModal({ modal, project, selectedUpdate, engineers, onClose }: { modal: OperationsModalName | null; project?: OperationsProject; selectedUpdate: ProgressUpdate | null; engineers: ProfileOption[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!modal) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [modal, onClose]);

  if (!modal) return null;

  function submit<TInput>(form: HTMLFormElement, action: (values: TInput) => Promise<unknown>, message: string) {
    const values = Object.fromEntries(new FormData(form)) as TInput;
    startTransition(async () => {
      try { await action(values); toast.success(message); onClose(); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Action failed."); }
    });
  }

  const title = modal === "project" ? "Create project" : modal === "task" ? "Assign project task" : modal === "milestone" ? "Add milestone" : "Field update";

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/35 p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="operations-modal-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[10px] bg-white p-6 shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 id="operations-modal-title" className="text-xl font-semibold">{title}</h2><button ref={closeRef} type="button" aria-label="Close dialog" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md border border-[#dce3de]"><X size={17} /></button></div>
        {modal === "project" ? <ProjectForm engineers={engineers} pending={pending} onSubmit={(form) => submit(form, createOperationsProjectAction, "Project created.")} /> : null}
        {modal === "task" ? <TaskForm project={project} engineers={engineers} pending={pending} onSubmit={(form) => submit(form, createOperationsTaskAction, "Task assigned.")} /> : null}
        {modal === "milestone" ? <MilestoneForm project={project} pending={pending} onSubmit={(form) => submit(form, createMilestoneAction, "Milestone created.")} /> : null}
        {modal === "update" && selectedUpdate ? <ProgressUpdateDetails update={selectedUpdate} comment={comment} setComment={setComment} pending={pending} startTransition={startTransition} /> : null}
      </div>
    </div>
  );
}

function ProgressUpdateDetails({ update, comment, setComment, pending, startTransition }: { update: ProgressUpdate; comment: string; setComment: (value: string) => void; pending: boolean; startTransition: (callback: () => Promise<void>) => void }) {
  return <div className="mt-5 space-y-4 text-sm"><div className="rounded-xl bg-emerald-50 p-4"><p className="text-3xl font-semibold text-emerald-800">{update.progress_percent}%</p><p className="text-xs text-emerald-700">Engineer-reported progress • {formatOperationsDate(update.created_at)}</p></div><section><b>Completed work</b><p className="mt-1 text-apple-smoke">{update.completed_work}</p></section><section><b>Next steps</b><p className="mt-1 text-apple-smoke">{update.next_steps}</p></section>{update.blockers ? <section className="rounded-lg border border-rose-200 bg-rose-50 p-3"><b className="text-rose-700">Blocker</b><p>{update.blockers}</p></section> : null}<div className="flex gap-2"><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment or instruction" className={input} /><button type="button" aria-label="Add comment" disabled={pending || !comment.trim()} onClick={() => startTransition(async () => { try { await commentOnProgressAction(update.id, comment); setComment(""); toast.success("Comment added."); } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to comment."); } })} className="rounded-lg bg-emerald-700 px-4 text-white disabled:opacity-50"><MessageSquare size={16} /></button></div><button type="button" disabled={pending} onClick={() => startTransition(async () => { try { await flagProgressUpdateAction(update.id, !update.is_flagged); toast.success(update.is_flagged ? "Flag removed." : "Flagged for follow-up."); } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to update flag."); } })} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-emerald-700 font-semibold text-emerald-800 disabled:opacity-50"><Flag size={16} />{update.is_flagged ? "Remove follow-up flag" : "Flag for follow-up"}</button></div>;
}

function ProjectForm({ engineers, pending, onSubmit }: { engineers: ProfileOption[]; pending: boolean; onSubmit: (form: HTMLFormElement) => void }) {
  return <form className="mt-5 grid gap-4" onSubmit={(event) => { event.preventDefault(); onSubmit(event.currentTarget); }}><input name="name" required placeholder="Project name" className={input} /><input name="site" required placeholder="Site / location" className={input} /><textarea name="description" placeholder="Project description" className="min-h-24 rounded-lg border border-apple-mist p-3 text-sm" /><div className="grid grid-cols-2 gap-3"><input aria-label="Start date" name="startDate" type="date" className={input} /><input aria-label="Target date" name="targetDate" type="date" className={input} /></div><select aria-label="Lead engineer" name="leadEngineerId" required className={input}><option value="">Select lead engineer</option>{engineers.map((engineer) => <option key={engineer.id} value={engineer.id}>{engineer.full_name ?? engineer.username}</option>)}</select><button disabled={pending} className="h-11 rounded-lg bg-[#087332] font-semibold text-white disabled:opacity-60">{pending ? "Creating…" : "Create project"}</button></form>;
}

function TaskForm({ project, engineers, pending, onSubmit }: { project?: OperationsProject; engineers: ProfileOption[]; pending: boolean; onSubmit: (form: HTMLFormElement) => void }) {
  return <form className="mt-5 grid gap-4" onSubmit={(event) => { event.preventDefault(); onSubmit(event.currentTarget); }}><input type="hidden" name="projectId" value={project?.id ?? ""} /><input name="title" required placeholder="Task title" className={input} /><textarea name="description" placeholder="Instructions" className="min-h-20 rounded-lg border border-apple-mist p-3 text-sm" /><select aria-label="Task assignee" name="assigneeId" className={input}><option value="">Unassigned</option>{engineers.map((engineer) => <option key={engineer.id} value={engineer.id}>{engineer.full_name ?? engineer.username}</option>)}</select><select aria-label="Task milestone" name="milestoneId" className={input}><option value="">No milestone</option>{project?.milestones?.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.title}</option>)}</select><input aria-label="Task due date" name="dueDate" type="date" className={input} /><button disabled={pending || !project} className="h-11 rounded-lg bg-[#087332] font-semibold text-white disabled:opacity-60">Assign task</button></form>;
}

function MilestoneForm({ project, pending, onSubmit }: { project?: OperationsProject; pending: boolean; onSubmit: (form: HTMLFormElement) => void }) {
  return <form className="mt-5 grid gap-4" onSubmit={(event) => { event.preventDefault(); onSubmit(event.currentTarget); }}><input type="hidden" name="projectId" value={project?.id ?? ""} /><input name="title" required placeholder="Milestone title" className={input} /><input aria-label="Milestone due date" name="dueDate" type="date" className={input} /><button disabled={pending || !project} className="h-11 rounded-lg bg-[#087332] font-semibold text-white disabled:opacity-60">Add milestone</button></form>;
}

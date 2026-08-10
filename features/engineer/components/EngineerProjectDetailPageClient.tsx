"use client";

import { useState } from "react";
import { TbAlertTriangle, TbCalendar, TbCheck, TbCircle, TbEdit } from "react-icons/tb";
import type { EngineerMaterialRequest, EngineerProgressUpdate, EngineerProject } from "@/features/engineer/types";
import EngineerPageHeader from "@/features/engineer/components/EngineerPageHeader";
import EngineerPreviewBanner from "@/features/engineer/components/EngineerPreviewBanner";
import EngineerProgressDialog from "@/features/engineer/components/EngineerProgressDialog";
import { formatEngineerDate, humanizeEngineerStatus } from "@/features/engineer/utils/engineerDashboard";

const phases = ["planning", "foundation", "structural", "finishing", "completed"] as const;

export default function EngineerProjectDetailPageClient({ project, materialRequests, preview = false }: { project: EngineerProject; materialRequests: EngineerMaterialRequest[]; preview?: boolean }) {
  const [open, setOpen] = useState(false);
  const [visibleProject, setVisibleProject] = useState(project);
  const currentIndex = phases.indexOf(visibleProject.current_phase);

  function addMockProgress(formData: FormData) {
    const update: EngineerProgressUpdate = {
      id: `mock-update-${Date.now()}`,
      project_id: visibleProject.id,
      title: String(formData.get("title")),
      description: String(formData.get("description") || "") || null,
      progress_percent: Number(formData.get("progressPercent")),
      report_date: String(formData.get("reportDate")),
      completed_work: String(formData.get("completedWork")),
      next_steps: String(formData.get("nextSteps")),
      next_activity: String(formData.get("nextActivity") || "") || null,
      blockers: String(formData.get("issues") || "") || null,
      risks: String(formData.get("risks") || "") || null,
      photo_paths: [],
      document_paths: [],
      created_at: new Date().toISOString(),
    };
    setVisibleProject((current) => ({ ...current, reported_progress: update.progress_percent, current_phase: String(formData.get("currentPhase")) as EngineerProject["current_phase"], updates: [update, ...current.updates] }));
  }

  return <div className="mx-auto max-w-[1400px] p-4 sm:p-7">
    {preview ? <EngineerPreviewBanner /> : null}
    <EngineerPageHeader backHref="/engineer/projects" title={visibleProject.name} description={`${visibleProject.site} · ${visibleProject.project_code || "Construction project"}`} action={<button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-[6px] bg-[#087332] px-4 text-xs font-semibold text-white"><TbEdit />Add progress update</button>} />
    <section className="mt-6 grid overflow-hidden rounded-[7px] border border-[#d9e2dc] bg-white md:grid-cols-4">
      <div className="p-5"><p className="text-[10px] text-[#737c85]">Overall completion</p><p className="mt-2 text-3xl font-semibold text-[#087332]">{visibleProject.reported_progress}%</p></div>
      <div className="border-t border-[#e0e6e2] p-5 md:border-l md:border-t-0"><p className="text-[10px] text-[#737c85]">Current phase</p><p className="mt-2 text-lg font-semibold">{humanizeEngineerStatus(visibleProject.current_phase)}</p></div>
      <div className="border-t border-[#e0e6e2] p-5 md:border-l md:border-t-0"><p className="text-[10px] text-[#737c85]">Schedule health</p><p className={`mt-2 text-lg font-semibold ${visibleProject.schedule_status === "delayed" ? "text-[#d12d3c]" : "text-[#087332]"}`}>{humanizeEngineerStatus(visibleProject.schedule_status)}</p></div>
      <div className="border-t border-[#e0e6e2] p-5 md:border-l md:border-t-0"><p className="text-[10px] text-[#737c85]">Target completion</p><p className="mt-2 text-lg font-semibold">{formatEngineerDate(visibleProject.target_date)}</p></div>
    </section>
    <section className="mt-4 rounded-[7px] border border-[#d9e2dc] bg-white p-5"><h2 className="font-semibold">Progress timeline</h2><div className="mt-6 grid gap-4 sm:grid-cols-5">{phases.map((phase, index) => <div key={phase} className="relative text-center"><span className={`relative z-10 mx-auto grid h-9 w-9 place-items-center rounded-full border ${index <= currentIndex ? "border-[#087332] bg-[#087332] text-white" : "border-[#cbd5ce] bg-white text-[#8b948e]"}`}>{index < currentIndex ? <TbCheck /> : <TbCircle />}</span>{index < phases.length - 1 ? <span className={`absolute left-[55%] right-[-45%] top-[18px] hidden h-px sm:block ${index < currentIndex ? "bg-[#087332]" : "bg-[#d2dbd5]"}`} /> : null}<p className="mt-2 text-xs font-semibold">{humanizeEngineerStatus(phase)}</p><p className="mt-1 text-[9px] text-[#7a838c]">{index < currentIndex ? "Completed" : index === currentIndex ? "In progress" : "Upcoming"}</p></div>)}</div></section>
    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_380px]">
      <section className="overflow-hidden rounded-[7px] border border-[#d9e2dc] bg-white"><div className="border-b border-[#e0e6e2] px-5 py-4"><h2 className="font-semibold">Recent updates</h2></div><div className="divide-y divide-[#e5eae7]">{visibleProject.updates.map((update) => <article key={update.id} className="p-5"><div className="flex flex-wrap justify-between gap-2"><div><p className="text-sm font-semibold">{update.title}</p><p className="mt-1 text-[10px] text-[#77808a]">{formatEngineerDate(update.report_date)} · {update.progress_percent}% complete</p></div>{update.blockers ? <span className="flex items-center gap-1 rounded-full bg-[#fdebed] px-3 py-1 text-[9px] font-semibold text-[#c92b3a]"><TbAlertTriangle />Issue reported</span> : null}</div><p className="mt-3 text-xs leading-5 text-[#59636c]">{update.completed_work}</p>{update.next_activity ? <p className="mt-3 text-[10px] text-[#087332]"><b>Next:</b> {update.next_activity}</p> : null}</article>)}</div></section>
      <aside className="space-y-4"><section className="rounded-[7px] border border-[#d9e2dc] bg-white p-5"><h2 className="font-semibold">Upcoming activities</h2><div className="mt-3 space-y-3">{visibleProject.tasks.filter((task) => task.status !== "completed").slice(0, 5).map((task) => <div key={task.id} className="flex gap-2 border-b border-[#e8ece9] pb-3"><TbCalendar className="mt-0.5 shrink-0 text-[#087332]" /><div><p className="text-xs font-medium">{task.title}</p><p className="mt-1 text-[9px] text-[#78818a]">{formatEngineerDate(task.due_date)}</p></div></div>)}</div></section><section className="rounded-[7px] border border-[#d9e2dc] bg-white p-5"><h2 className="font-semibold">Material workflow</h2><p className="mt-2 text-2xl font-semibold text-[#087332]">{materialRequests.length}</p><p className="text-[10px] text-[#77808a]">Requests linked to this project</p></section></aside>
    </div>
    <EngineerProgressDialog open={open} projects={[visibleProject]} initialProjectId={visibleProject.id} mockMode={preview} onMockSubmit={addMockProgress} onClose={() => setOpen(false)} />
  </div>;
}

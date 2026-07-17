import Image from "next/image";
import Link from "next/link";
import { TbAlertTriangle, TbCalendar, TbChevronRight } from "react-icons/tb";
import type { EngineerMaterialRequest, EngineerProject } from "@/features/engineer/types";
import { formatEngineerDate, getNextProjectActivity, getProjectDelayDays, humanizeEngineerStatus } from "@/features/engineer/utils/engineerDashboard";

export default function EngineerProjectAttention({ projects, materialRequests }: { projects: EngineerProject[]; materialRequests: EngineerMaterialRequest[] }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[6px] border border-[#d8e3dc] bg-white">
      <div className="border-b border-[#dfe6e1] px-4 py-3"><h2 className="text-[16px] font-semibold tracking-[-0.02em]">Projects needing attention</h2></div>
      <div className="hidden grid-cols-[minmax(190px,1.7fr)_105px_95px_minmax(110px,1fr)] border-b border-[#e5e9e6] px-4 py-2 text-[9px] font-medium text-[#626b74] md:grid"><span>Project</span><span>Phase / Progress</span><span>Status / Delay</span><span>Next key activity</span></div>
      <div className="divide-y divide-[#e2e8e4]">
        {projects.slice(0, 3).map((project) => {
          const requests = materialRequests.filter((request) => request.project_id === project.id && ["pending","approved"].includes(request.status));
          const nextTask = getNextProjectActivity(project);
          const delayed = project.schedule_status === "delayed";
          return <article key={project.id} className="p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(190px,1.7fr)_105px_95px_minmax(110px,1fr)] md:items-start">
              <div className="flex min-w-0 gap-3">
                <Image src={project.image_url || "/engineer-project-fallback.png"} alt="" width={88} height={78} className="h-[72px] w-[82px] shrink-0 rounded-[4px] object-cover" />
                <div className="min-w-0"><h3 className="truncate text-[11px] font-semibold uppercase text-[#20262d]">{project.name}</h3><p className="mt-1 truncate text-[10px] text-[#68717b]">{project.site}</p><p className="mt-1 text-[9px] text-[#7c858e]">{project.project_code || `Project ${project.id.slice(0, 8).toUpperCase()}`}</p><Link href={`/engineer/projects/${project.id}`} className="mt-1 inline-flex text-[10px] font-semibold text-[#087332]">View project</Link></div>
              </div>
              <div><span className="inline-flex rounded-full bg-[#eaf4ed] px-3 py-1 text-[9px] font-semibold text-[#087332]">{humanizeEngineerStatus(project.current_phase)}</span><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#dce7df]"><div className="h-full rounded-full bg-[#087332]" style={{ width: `${project.reported_progress}%` }} /></div><p className="mt-1 text-[11px] font-semibold">{project.reported_progress}% <span className="font-normal text-[#707984]">complete</span></p><p className="text-[9px] text-[#747d87]">Planned: {project.planned_progress}%</p></div>
              <div>{delayed ? <span className="inline-flex rounded-full bg-[#fdebed] px-3 py-1 text-[9px] font-semibold text-[#ce2d3b]">{getProjectDelayDays(project)} days behind</span> : <span className="inline-flex rounded-full bg-[#e8f4eb] px-3 py-1 text-[9px] font-semibold text-[#087332]">On track</span>}<p className="mt-2 text-[9px] text-[#6e7781]">Due: {formatEngineerDate(project.target_date)}</p></div>
              <div><p className="line-clamp-2 text-[10px] font-medium text-[#3e464f]">{nextTask?.title || project.updates[0]?.next_activity || "Awaiting next activity"}</p><p className="mt-2 flex items-center gap-1 text-[9px] text-[#747d87]"><TbCalendar />{formatEngineerDate(nextTask?.due_date ?? project.target_date)}</p></div>
            </div>
            {requests.length || project.tasks.some((task) => task.status === "blocked") ? <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[4px] border border-[#f2d9ae] bg-[#fffaf1] px-3 py-2 text-[9px] text-[#5d5a52]"><TbAlertTriangle className="text-[#de8a0b]" size={14} /><span>{requests.length} material {requests.length === 1 ? "request" : "requests"} waiting</span>{project.tasks.some((task) => task.status === "blocked") ? <><span>•</span><span>Blocked task requires attention</span></> : null}<Link href="/engineer/material-requests" className="ml-auto flex items-center gap-1 font-semibold text-[#087332]">View items<TbChevronRight /></Link></div> : null}
          </article>;
        })}
        {!projects.length ? <div className="p-12 text-center text-sm text-[#737c85]">No assigned projects yet.</div> : null}
      </div>
      {projects.length ? <Link href="/engineer/projects" className="flex h-10 items-center justify-center gap-1 border-t border-[#e2e8e4] text-[10px] font-semibold text-[#087332]">View all projects<TbChevronRight /></Link> : null}
    </section>
  );
}

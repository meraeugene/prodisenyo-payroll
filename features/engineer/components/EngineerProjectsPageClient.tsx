"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { TbChevronRight, TbSearch } from "react-icons/tb";
import type { EngineerProject } from "@/features/engineer/types";
import EngineerPageHeader from "@/features/engineer/components/EngineerPageHeader";
import { formatEngineerDate, humanizeEngineerStatus } from "@/features/engineer/utils/engineerDashboard";
import EngineerPreviewBanner from "@/features/engineer/components/EngineerPreviewBanner";

export default function EngineerProjectsPageClient({ projects, preview = false }: { projects: EngineerProject[]; preview?: boolean }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => projects.filter((project) => `${project.name} ${project.site} ${project.project_code ?? ""}`.toLowerCase().includes(query.toLowerCase())), [projects, query]);
  return <div className="mx-auto max-w-[1420px] p-4 sm:p-7">
    {preview ? <EngineerPreviewBanner /> : null}
    <EngineerPageHeader title="Projects" description="Track project health, phases, deadlines, and site progress." />
    <label className="mt-6 flex h-11 max-w-md items-center gap-2 rounded-[6px] border border-[#d9e2dc] bg-white px-3 text-[#707982]"><TbSearch size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects or sites" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
    <section className="mt-4 overflow-hidden rounded-[7px] border border-[#d9e2dc] bg-white">
      <div className="hidden grid-cols-[minmax(280px,1.6fr)_120px_150px_150px_40px] border-b border-[#e1e7e3] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#77808a] md:grid"><span>Project</span><span>Phase</span><span>Progress</span><span>Target</span><span /></div>
      <div className="divide-y divide-[#e4e9e6]">{visible.map((project) => <Link key={project.id} href={`/engineer/projects/${project.id}`} className="grid gap-4 px-5 py-4 transition hover:bg-[#f8faf8] md:grid-cols-[minmax(280px,1.6fr)_120px_150px_150px_40px] md:items-center">
        <span className="flex min-w-0 items-center gap-3"><Image src={project.image_url || "/engineer-project-fallback.png"} alt="" width={82} height={62} className="h-[62px] w-[82px] rounded-[4px] object-cover" /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{project.name}</span><span className="mt-1 block truncate text-xs text-[#747d86]">{project.site}</span></span></span>
        <span className="w-fit rounded-full bg-[#e9f4ec] px-3 py-1 text-[10px] font-semibold text-[#087332]">{humanizeEngineerStatus(project.current_phase)}</span>
        <span><span className="text-sm font-semibold text-[#087332]">{project.reported_progress}%</span><span className="mt-1 block h-1.5 max-w-[130px] overflow-hidden rounded-full bg-[#dce7df]"><span className="block h-full rounded-full bg-[#087332]" style={{ width: `${project.reported_progress}%` }} /></span><span className="mt-1 block text-[9px] text-[#7a838c]">Planned {project.planned_progress}%</span></span>
        <span className="text-xs text-[#5e6871]">{formatEngineerDate(project.target_date)}</span><TbChevronRight className="text-[#7b858e]" />
      </Link>)}</div>
      {!visible.length ? <p className="p-12 text-center text-sm text-[#79828b]">No projects match your search.</p> : null}
    </section>
  </div>;
}

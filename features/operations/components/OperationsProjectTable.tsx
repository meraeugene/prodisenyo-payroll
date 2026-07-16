"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronLeft, ChevronRight, Download } from "lucide-react";
import OperationsProjectCards from "@/features/operations/components/OperationsProjectCards";
import type { OperationsProject, ProjectHealth, ProgressUpdate } from "@/features/operations/types";
import { buildProjectPortfolioRow, formatOperationsDate, formatProjectHealth, projectHealthClasses } from "@/features/operations/utils/operationsFormatters";

const PAGE_SIZE = 8;

export default function OperationsProjectTable({ projects, onOpenProject, onOpenUpdate }: { projects: OperationsProject[]; onOpenProject: (id: string) => void; onOpenUpdate: (update: ProgressUpdate) => void }) {
  const [filter, setFilter] = useState<"all" | ProjectHealth>("all");
  const [page, setPage] = useState(1);
  const rows = useMemo(() => projects.map(buildProjectPortfolioRow), [projects]);
  const filtered = useMemo(() => rows.filter((row) => filter === "all" || row.health === filter), [filter, rows]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage((current) => Math.min(current, pageCount)), [pageCount]);

  function exportCsv() {
    const csvRows = [["Project", "Site", "Lead Engineer", "Reported Progress", "Tasks", "Milestones", "Latest Update", "Target Date", "Due State", "Blocker"], ...filtered.map((row) => [
      row.project.name,
      row.project.site,
      row.project.lead_engineer?.full_name ?? row.project.lead_engineer?.username ?? "Unassigned",
      `${row.project.reported_progress}%`,
      `${row.completedTasks}/${row.totalTasks}`,
      `${row.completedMilestones}/${row.totalMilestones}`,
      row.latestUpdate?.completed_work ?? "",
      row.project.target_date ?? "",
      formatProjectHealth(row.health),
      row.latestUpdate?.blockers ?? "",
    ])];
    const blob = new Blob([csvRows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "project-portfolio.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="min-w-0" aria-labelledby="project-portfolio-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="project-portfolio-title" className="text-[16px] font-semibold tracking-[-0.02em] text-[#181d25]">Project Portfolio</h2>
        <div className="flex items-center gap-2">
          <label className="relative">
            <span className="sr-only">Filter projects</span>
            <select value={filter} onChange={(event) => { setFilter(event.target.value as "all" | ProjectHealth); setPage(1); }} className="h-9 appearance-none rounded-[6px] border border-[#d8dfda] bg-white pl-3 pr-8 text-[10px] font-medium text-[#333943] outline-none focus:border-[#087332] focus:ring-1 focus:ring-[#087332]">
              <option value="all">All Projects</option>
              <option value="on_track">On Track</option>
              <option value="at_risk">At Risk</option>
              <option value="overdue">Overdue</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-3 text-[#68717d]" aria-hidden="true" />
          </label>
          <button type="button" onClick={exportCsv} disabled={!filtered.length} className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-[#d8dfda] px-3 text-[10px] font-semibold text-[#313740] transition hover:border-[#087332] hover:text-[#087332] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087332] disabled:cursor-not-allowed disabled:opacity-40">
            <Download size={14} aria-hidden="true" /> Export
          </button>
        </div>
      </div>

      <OperationsProjectCards rows={visible} onOpenProject={onOpenProject} onOpenUpdate={onOpenUpdate} />
      <div className="hidden overflow-hidden border-y border-[#dce3de] md:block">
        <table className="w-full table-fixed text-left" aria-label="Project portfolio">
          <colgroup><col className="w-[23%]" /><col className="w-[13%]" /><col className="w-[16%]" /><col className="w-[13%]" /><col className="w-[14%]" /><col className="w-[12%]" /><col className="w-[9%]" /></colgroup>
          <thead><tr className="h-11 text-[10px] font-semibold text-[#5e6672]"><th className="pl-0 pr-2">Project Name</th><th className="px-2">Lead Engineer</th><th className="px-2">Reported Progress</th><th className="px-2">Tasks / Milestones</th><th className="px-2">Latest Update</th><th className="px-2">Due State</th><th className="pl-2 pr-0">Blockers</th></tr></thead>
          <tbody className="divide-y divide-[#e4e9e5]">
            {visible.map((row) => (
              <tr key={row.project.id} className="h-[72px] cursor-pointer text-[10px] text-[#293039] transition hover:bg-[#f6faf7]" onClick={() => onOpenProject(row.project.id)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpenProject(row.project.id); } }}>
                <td className="pr-2"><div className="flex min-w-0 items-center gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#087332] text-white"><Building2 size={15} aria-hidden="true" /></span><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-[#1d232b]">{row.project.name}</p><p className="mt-1 truncate text-[9px] text-[#777f8a]">{row.project.site}</p></div></div></td>
                <td className="px-2"><p className="truncate">{row.project.lead_engineer?.full_name ?? row.project.lead_engineer?.username ?? "Unassigned"}</p></td>
                <td className="px-2"><p className="text-[13px] font-semibold text-[#087332]">{row.project.reported_progress}%</p><div className="mt-1.5 h-1.5 max-w-[110px] rounded-full bg-[#e6eae8]"><div className="h-full rounded-full bg-[#087332]" style={{ width: `${row.project.reported_progress}%` }} /></div></td>
                <td className="px-2"><p>{row.completedTasks} of {row.totalTasks} tasks</p><p className="mt-1 text-[9px] text-[#747c87]">{row.completedMilestones}/{row.totalMilestones} milestones</p></td>
                <td className="px-2"><button type="button" disabled={!row.latestUpdate} onClick={(event) => { event.stopPropagation(); if (row.latestUpdate) onOpenUpdate(row.latestUpdate); }} className="w-full text-left disabled:cursor-default"><p>{row.latestUpdate ? formatOperationsDate(row.latestUpdate.created_at) : "No report"}</p><p className="mt-1 truncate text-[9px] text-[#747c87]">{row.latestUpdate?.completed_work ?? "Awaiting field update"}</p></button></td>
                <td className="px-2"><span className={`inline-flex rounded px-2 py-1 text-[9px] font-semibold ${projectHealthClasses(row.health)}`}>{formatProjectHealth(row.health)}</span><p className="mt-1.5 truncate text-[9px] text-[#747c87]">Due {formatOperationsDate(row.project.target_date)}</p></td>
                <td className="pl-2 pr-0"><div className="flex items-center justify-between gap-1"><p className={`line-clamp-2 text-[9px] leading-4 ${row.latestUpdate?.blockers ? "text-[#9e3038]" : "text-[#747c87]"}`}>{row.latestUpdate?.blockers ?? "—"}</p><ChevronRight size={14} className="shrink-0 text-[#7b838e]" aria-hidden="true" /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!visible.length ? <div className="rounded-[8px] border border-dashed border-[#dce3de] py-14 text-center"><Building2 className="mx-auto text-[#7a9e86]" size={25} aria-hidden="true" /><p className="mt-3 text-[12px] font-medium text-[#333943]">No projects in this view</p><p className="mt-1 text-[10px] text-[#7b838d]">Choose another filter or create a project.</p></div> : null}

      <div className="flex items-center justify-between gap-3 pt-4 text-[9px] text-[#737b87]">
        <p>Showing {visible.length ? (page - 1) * PAGE_SIZE + 1 : 0} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} projects</p>
        <div className="flex items-center gap-2" aria-label="Project pagination">
          <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="grid h-7 w-7 place-items-center rounded border border-[#d8dfda] disabled:opacity-40"><ChevronLeft size={13} /></button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button type="button" key={number} aria-label={`Page ${number}`} aria-current={page === number ? "page" : undefined} onClick={() => setPage(number)} className={`grid h-7 min-w-7 place-items-center rounded border px-2 font-semibold ${page === number ? "border-[#087332] bg-[#087332] text-white" : "border-[#d8dfda] text-[#343b45]"}`}>{number}</button>)}
          <button type="button" aria-label="Next page" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)} className="grid h-7 w-7 place-items-center rounded border border-[#d8dfda] disabled:opacity-40"><ChevronRight size={13} /></button>
        </div>
      </div>
    </section>
  );
}

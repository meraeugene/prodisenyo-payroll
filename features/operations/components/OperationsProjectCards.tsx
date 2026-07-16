"use client";

import { Building2, ChevronRight } from "lucide-react";
import type { ProjectPortfolioRow, ProgressUpdate } from "@/features/operations/types";
import { formatOperationsDate, formatProjectHealth, projectHealthClasses } from "@/features/operations/utils/operationsFormatters";

export default function OperationsProjectCards({
  rows,
  onOpenProject,
  onOpenUpdate,
}: {
  rows: ProjectPortfolioRow[];
  onOpenProject: (projectId: string) => void;
  onOpenUpdate: (update: ProgressUpdate) => void;
}) {
  return (
    <div className="grid gap-3 md:hidden">
      {rows.map((row) => (
        <article key={row.project.id} className="rounded-[8px] border border-[#dfe5e1] bg-white p-4">
          <button type="button" onClick={() => onOpenProject(row.project.id)} className="flex w-full items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087332]">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#087332] text-white"><Building2 size={17} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-[#1f242c]">{row.project.name}</span>
              <span className="mt-0.5 block truncate text-[10px] text-[#737b87]">{row.project.site}</span>
            </span>
            <ChevronRight size={16} className="mt-2 shrink-0 text-[#7c838c]" aria-hidden="true" />
          </button>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[11px]">
            <div>
              <p className="text-[9px] uppercase tracking-[0.08em] text-[#858b94]">Reported progress</p>
              <p className="mt-1 text-[16px] font-semibold text-[#087332]">{row.project.reported_progress}%</p>
              <div className="mt-1 h-1.5 rounded-full bg-[#e7ebea]"><div className="h-full rounded-full bg-[#087332]" style={{ width: `${row.project.reported_progress}%` }} /></div>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.08em] text-[#858b94]">Due state</p>
              <span className={`mt-1 inline-flex rounded px-2 py-1 text-[9px] font-semibold ${projectHealthClasses(row.health)}`}>{formatProjectHealth(row.health)}</span>
              <p className="mt-1 text-[10px] text-[#727985]">Due {formatOperationsDate(row.project.target_date)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.08em] text-[#858b94]">Lead engineer</p>
              <p className="mt-1 truncate font-medium text-[#2b3038]">{row.project.lead_engineer?.full_name ?? row.project.lead_engineer?.username ?? "Unassigned"}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.08em] text-[#858b94]">Tasks / milestones</p>
              <p className="mt-1 font-medium text-[#2b3038]">{row.completedTasks} of {row.totalTasks} tasks</p>
              <p className="text-[10px] text-[#727985]">{row.completedMilestones}/{row.totalMilestones} milestones</p>
            </div>
          </div>

          {row.latestUpdate ? (
            <button type="button" onClick={() => onOpenUpdate(row.latestUpdate!)} className="mt-4 w-full border-t border-[#e7ebe8] pt-3 text-left text-[10px] text-[#68717d] hover:text-[#087332]">
              Latest update · {formatOperationsDate(row.latestUpdate.created_at)} — {row.latestUpdate.completed_work}
            </button>
          ) : <p className="mt-4 border-t border-[#e7ebe8] pt-3 text-[10px] text-[#8a9098]">Awaiting field update</p>}
        </article>
      ))}
    </div>
  );
}

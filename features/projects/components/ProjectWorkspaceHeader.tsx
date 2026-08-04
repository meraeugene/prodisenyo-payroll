import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin, UserRound } from "lucide-react";
import type { ProjectRecord } from "@/features/projects/types";
import {
  formatProjectCurrency,
  getProjectStatusPresentation,
} from "@/features/projects/utils/projectPresentation";

const STATUS_CLASSES = {
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  slate: "bg-slate-100 text-slate-700",
};

export default function ProjectWorkspaceHeader({
  project,
}: {
  project: ProjectRecord;
}) {
  const status = getProjectStatusPresentation(project);

  return (
    <header className="border-b border-slate-200 pb-5">
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-emerald-800"
      >
        <ArrowLeft size={15} /> Back to Projects
      </Link>
      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-[-0.035em] text-slate-950">
              {project.name}
            </h1>
            <span className={`rounded-lg px-3 py-1.5 text-xs font-bold ${STATUS_CLASSES[status.tone]}`}>
              {status.label}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <UserRound size={14} /> Engineer / PM: {project.engineer}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} /> {project.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={14} /> {project.startDate} – {project.endDate}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 lg:text-right">
          <p className="text-xs font-bold uppercase tracking-[.08em] text-slate-500">Budget Ceiling</p>
          <p className="mt-1 text-xl font-bold text-slate-950">
            {formatProjectCurrency(project.budget)}
          </p>
        </div>
      </div>
    </header>
  );
}

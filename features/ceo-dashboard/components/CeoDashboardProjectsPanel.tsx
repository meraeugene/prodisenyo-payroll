import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { ProjectRecord } from "@/features/projects/types";
import ProjectThumbnail from "@/features/projects/components/ProjectThumbnail";
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

export default function CeoDashboardProjectsPanel({
  projects,
}: {
  projects: ProjectRecord[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="font-bold text-slate-950">Project Overview</h2>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:text-emerald-950"
        >
          View all projects <ArrowRight size={14} />
        </Link>
      </div>
      <div className="divide-y divide-slate-100">
        {projects.slice(0, 4).map((project) => {
          const status = getProjectStatusPresentation(project);
          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="grid gap-4 px-5 py-4 transition hover:bg-slate-50/70 md:grid-cols-[minmax(0,1.2fr)_minmax(120px,.55fr)_minmax(150px,.65fr)_auto] md:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <ProjectThumbnail
                  src={project.imageUrl}
                  name={project.name}
                  className="h-16 w-24 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">{project.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin size={12} />
                    <span className="truncate">{project.location}</span>
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500">Progress</p>
                <p className="mt-1 text-sm font-bold text-slate-950">{project.progress}%</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-700"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500">Budget</p>
                <p className="mt-1 text-sm font-bold text-slate-950">
                  {formatProjectCurrency(project.spent)}
                </p>
                <p className="text-xs text-slate-500">
                  of {formatProjectCurrency(project.budget)}
                </p>
              </div>
              <span
                className={`w-fit rounded-lg px-3 py-1.5 text-xs font-bold ${STATUS_CLASSES[status.tone]}`}
              >
                {status.label}
              </span>
            </Link>
          );
        })}
        {!projects.length ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">
            No projects have been created yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}

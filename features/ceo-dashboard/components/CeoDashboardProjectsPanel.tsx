import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import ProjectThumbnail from "@/features/projects/components/ProjectThumbnail";
import type { CeoDashboardProject } from "@/features/ceo-dashboard/types";
import {
  formatCeoCurrency,
  formatCeoDate,
} from "@/features/ceo-dashboard/utils/ceoDashboard";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  completed: "bg-sky-50 text-sky-700",
  planning: "bg-amber-50 text-amber-700",
  on_hold: "bg-rose-50 text-rose-700",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  planning: "Planning",
  on_hold: "On Hold",
};

export default function CeoDashboardProjectsPanel({
  projects,
}: {
  projects: CeoDashboardProject[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-bold text-slate-950">Project Overview</h2>
          <p className="mt-0.5 text-xs text-slate-500">Latest persisted project health</p>
        </div>
        <Link href="/projects" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950">
          View all <ArrowRight size={13} />
        </Link>
      </div>
      <div className="hidden grid-cols-[minmax(220px,1.3fr)_minmax(110px,.65fr)_minmax(135px,.7fr)_minmax(120px,.65fr)_auto] gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 lg:grid">
        <span>Project</span><span>Progress</span><span>Budget used</span><span>Schedule</span><span>Status</span>
      </div>
      <div className="divide-y divide-slate-100">
        {projects.slice(0, 5).map((project) => (
          <Link
            key={project.id}
            href={"/projects/" + project.id}
            className="grid gap-4 px-5 py-4 transition hover:bg-slate-50/70 lg:grid-cols-[minmax(220px,1.3fr)_minmax(110px,.65fr)_minmax(135px,.7fr)_minmax(120px,.65fr)_auto] lg:items-center"
          >
            <div className="flex min-w-0 items-center gap-3">
              <ProjectThumbnail src={project.imageUrl} name={project.name} className="h-14 w-20 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-950">{project.name}</p>
                <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
                  <MapPin size={11} /> {project.location}
                </p>
                <p className="mt-1 truncate text-[11px] text-slate-400">{project.engineer}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-950">{project.progress}%</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-700" style={{ width: project.progress + "%" }} />
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                {project.latestProgressAt ? "Updated " + formatCeoDate(project.latestProgressAt) : "No progress update"}
              </p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-950">{formatCeoCurrency(project.spent)}</p>
              <p className="mt-1 text-[11px] text-slate-500">of {formatCeoCurrency(project.budget)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">{formatCeoDate(project.endDate)}</p>
              <p className="mt-1 text-[11px] text-slate-500">Target completion</p>
            </div>
            <span className={"w-fit rounded-full px-2.5 py-1 text-[11px] font-bold " + (STATUS_STYLES[project.status] || STATUS_STYLES.planning)}>
              {STATUS_LABELS[project.status] || project.status}
            </span>
          </Link>
        ))}
        {!projects.length ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">No project records are available.</p>
        ) : null}
      </div>
    </section>
  );
}

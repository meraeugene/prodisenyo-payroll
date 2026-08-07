import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { EngineerDashboardProject } from "@/features/engineer-dashboard/types";
import { formatDashboardCurrency } from "@/features/engineer-dashboard/utils/engineerDashboard";

export default function EngineerDashboardProjects({
  projects,
}: {
  projects: EngineerDashboardProject[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_6px_22px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">My Projects</h2>
        <Link href="/projects" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900">
          View all <ArrowRight size={15} />
        </Link>
      </div>
      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-5 py-10 text-center">
          <p className="font-medium text-slate-700">No assigned projects</p>
          <p className="mt-1 text-sm text-slate-500">Projects assigned by the CEO will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {projects.map((project) => (
            <article key={project.id} className="rounded-xl border border-slate-200 p-5 transition hover:border-emerald-200 hover:shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-slate-950">{project.name}</h3>
                  <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500"><MapPin size={13} />{project.location}</p>
                </div>
                <span className={`text-sm font-semibold ${project.status === "planning" ? "text-amber-700" : "text-emerald-700"}`}>{project.status === "planning" ? "Pending estimate" : `${project.progress}%`}</span>
              </div>
              {project.status === "planning" ? <p className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">Complete and submit the project cost estimate before operations begin.</p> : <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`${project.progress}% complete`}><div className="h-full rounded-full bg-emerald-600 transition-[width]" style={{ width: `${project.progress}%` }} /></div>}
              <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-slate-500">Budget</p><p className="mt-1 font-semibold text-slate-900">{formatDashboardCurrency(project.budget)}</p></div>
                <div><p className="text-xs text-slate-500">Spent to Date</p><p className="mt-1 font-semibold text-slate-900">{formatDashboardCurrency(project.spent)}</p></div>
              </div>
              <Link href={project.status === "planning" ? `/cost-estimator?projectId=${project.id}` : `/projects/${project.id}`} className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-200 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2">
                {project.status === "planning" ? "Open cost estimate" : "View details"}
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

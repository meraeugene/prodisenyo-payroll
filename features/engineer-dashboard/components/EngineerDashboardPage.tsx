"use client";

import { useMemo, useState } from "react";
import { Building2, ChevronDown } from "lucide-react";
import type { EngineerDashboardData } from "@/features/engineer-dashboard/types";
import EngineerDashboardAlerts from "./EngineerDashboardAlerts";
import EngineerDashboardProjects from "./EngineerDashboardProjects";
import EngineerDashboardRequests from "./EngineerDashboardRequests";
import EngineerDashboardSummary from "./EngineerDashboardSummary";

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Engineer";
}

export default function EngineerDashboardPage({ data }: { data: EngineerDashboardData }) {
  const [projectId, setProjectId] = useState("all");
  const visibleProjects = useMemo(() => data.projects.filter((project) => projectId === "all" || project.id === projectId), [data.projects, projectId]);
  const visibleRequests = useMemo(() => data.materialRequests.filter((request) => projectId === "all" || request.projectId === projectId), [data.materialRequests, projectId]);
  const visibleEstimates = useMemo(() => data.estimates.filter((estimate) => projectId === "all" || estimate.projectId === projectId), [data.estimates, projectId]);
  const visibleAlerts = useMemo(() => data.alerts.filter((alert) => projectId === "all" || alert.projectId === projectId), [data.alerts, projectId]);

  return (
    <main className="min-h-full bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Engineer workspace</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Engineer Dashboard</h1><p className="mt-1 text-sm text-slate-500">Good day, Engr. {getFirstName(data.fullName)}.</p></div>
          <label className="relative block w-full sm:w-72"><span className="sr-only">Filter dashboard by project</span><Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} /><select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"><option value="all">All assigned projects</option>{data.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} /></label>
        </header>
        <EngineerDashboardSummary values={{ projects: visibleProjects.filter((project) => project.status !== "completed").length, requests: visibleRequests.filter((request) => request.status === "submitted").length, estimates: visibleEstimates.filter((estimate) => estimate.status === "draft" || estimate.status === "rejected").length }} />
        <EngineerDashboardProjects projects={visibleProjects} />
        <div className="grid gap-5 lg:grid-cols-2"><EngineerDashboardRequests requests={visibleRequests} /><EngineerDashboardAlerts alerts={visibleAlerts} /></div>
      </div>
    </main>
  );
}

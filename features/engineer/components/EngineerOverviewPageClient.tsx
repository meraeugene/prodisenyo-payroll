"use client";

import { useState } from "react";
import { TbEdit } from "react-icons/tb";
import type { EngineerWorkspaceData } from "@/features/engineer/types";
import { buildEngineerMetrics, formatEngineerDate, rankProjectsForAttention } from "@/features/engineer/utils/engineerDashboard";
import EngineerActivityFeed from "@/features/engineer/components/EngineerActivityFeed";
import EngineerMetricsStrip from "@/features/engineer/components/EngineerMetricsStrip";
import EngineerProgressDialog from "@/features/engineer/components/EngineerProgressDialog";
import EngineerProjectAttention from "@/features/engineer/components/EngineerProjectAttention";
import EngineerTodayPanel from "@/features/engineer/components/EngineerTodayPanel";
import EngineerPreviewBanner from "@/features/engineer/components/EngineerPreviewBanner";
import type { EngineerActivity, EngineerProgressUpdate } from "@/features/engineer/types";

export default function EngineerOverviewPageClient({ data }: { data: EngineerWorkspaceData }) {
  const [workspace, setWorkspace] = useState(data);
  const [progressOpen, setProgressOpen] = useState(false);
  const pendingRequests = workspace.materialRequests.filter((request) => ["pending", "approved"].includes(request.status));
  const counts = new Map<string, number>();
  pendingRequests.forEach((request) => request.project_id && counts.set(request.project_id, (counts.get(request.project_id) ?? 0) + 1));
  const projects = rankProjectsForAttention(workspace.projects, counts);
  const metrics = buildEngineerMetrics({ projects: workspace.projects, tasks: workspace.tasks, reports: workspace.reports, materialRequestCount: pendingRequests.length, activities: workspace.activities });
  const displayName = workspace.profile.full_name?.trim() || workspace.profile.username;

  function addMockProgress(formData: FormData) {
    const projectId = String(formData.get("projectId"));
    const progress = Number(formData.get("progressPercent"));
    const title = String(formData.get("title") || "Site progress updated");
    const now = new Date().toISOString();
    const update: EngineerProgressUpdate = { id: `mock-update-${Date.now()}`, project_id: projectId, title, description: String(formData.get("description") || "") || null, progress_percent: progress, report_date: String(formData.get("reportDate")), completed_work: String(formData.get("completedWork")), next_steps: String(formData.get("nextSteps")), next_activity: String(formData.get("nextActivity") || "") || null, blockers: String(formData.get("issues") || "") || null, risks: String(formData.get("risks") || "") || null, photo_paths: [], document_paths: [], created_at: now, author: workspace.profile };
    const project = workspace.projects.find((item) => item.id === projectId);
    const activity: EngineerActivity = { id: `mock-activity-${Date.now()}`, project_id: projectId, event_type: "progress_update", title, body: update.completed_work, photo_paths: [], created_at: now, project: project ? { id: project.id, name: project.name, site: project.site } : null, actor: workspace.profile };
    setWorkspace((current) => ({ ...current, projects: current.projects.map((item) => item.id === projectId ? { ...item, reported_progress: progress, current_phase: String(formData.get("currentPhase")) as typeof item.current_phase, updates: [update, ...item.updates] } : item), activities: [activity, ...current.activities] }));
  }

  return <div className="mx-auto min-h-screen min-w-0 max-w-[1500px] px-4 py-6 sm:px-5 lg:px-6 xl:px-7">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><h1 className="text-[27px] font-semibold tracking-[-0.035em] text-[#171b22]">Good morning, {displayName}</h1><p className="mt-1 text-[11px] text-[#737b84]">{formatEngineerDate(new Date().toISOString(), { weekday: "long", month: "long", day: "numeric", year: "numeric" })} &nbsp;•&nbsp; Asia/Manila</p></div>
      <button type="button" onClick={() => setProgressOpen(true)} className="inline-flex h-11 w-fit items-center gap-2 rounded-[5px] bg-[#087332] px-5 text-[12px] font-semibold text-white shadow-[0_5px_12px_rgba(8,115,50,0.18)] transition hover:bg-[#065e29]"><TbEdit size={17} />Post site update</button>
    </header>
    {workspace.dataSource === "mock" ? <div className="mt-4"><EngineerPreviewBanner /></div> : null}
    <EngineerMetricsStrip metrics={metrics} />
    <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.95fr)]"><EngineerProjectAttention projects={projects} materialRequests={workspace.materialRequests} /><EngineerTodayPanel tasks={workspace.tasks} reports={workspace.reports} /></div>
    <EngineerActivityFeed activities={workspace.activities} />
    <EngineerProgressDialog open={progressOpen} projects={workspace.projects} mockMode={workspace.dataSource === "mock"} onMockSubmit={addMockProgress} onClose={() => setProgressOpen(false)} />
  </div>;
}

"use client";

import { useCallback, useMemo, useState } from "react";
import type { MaterialRequest, OperationsProject, ProfileOption, ProgressUpdate } from "@/features/operations/types";
import OperationsKpiStrip from "@/features/operations/components/OperationsKpiStrip";
import OperationsModal from "@/features/operations/components/OperationsModal";
import OperationsOverviewHeader from "@/features/operations/components/OperationsOverviewHeader";
import OperationsProjectDrawer from "@/features/operations/components/OperationsProjectDrawer";
import OperationsProjectTable from "@/features/operations/components/OperationsProjectTable";
import OperationsQueues from "@/features/operations/components/OperationsQueues";
import { buildProjectPortfolioRow } from "@/features/operations/utils/operationsFormatters";

export type OperationsModalName = "project" | "task" | "milestone" | "update";

export default function CeoOperationsPageClient({ projects, engineers, requests }: { projects: OperationsProject[]; engineers: ProfileOption[]; requests: MaterialRequest[] }) {
  const [modal, setModal] = useState<OperationsModalName | null>(null);
  const [drawerProjectId, setDrawerProjectId] = useState<string | null>(null);
  const [selectedUpdate, setSelectedUpdate] = useState<ProgressUpdate | null>(null);
  const selectedProject = projects.find((project) => project.id === drawerProjectId) ?? null;
  const closeDrawer = useCallback(() => setDrawerProjectId(null), []);

  const summary = useMemo(() => {
    const active = projects.filter((project) => project.status === "active");
    const average = active.length ? Math.round(active.reduce((sum, project) => sum + project.reported_progress, 0) / active.length) : 0;
    const blocked = projects.map(buildProjectPortfolioRow).filter((row) => row.health === "blocked").length;
    return {
      active: active.length,
      average,
      blocked,
      approvals: requests.filter((request) => request.status === "pending").length,
      sites: new Set(active.map((project) => project.site.trim()).filter(Boolean)).size,
    };
  }, [projects, requests]);

  function openUpdate(update: ProgressUpdate) {
    setSelectedUpdate(update);
    setModal("update");
  }

  return (
    <div className="min-h-screen bg-white px-4 py-5 sm:px-6 sm:py-7 min-[1400px]:py-9 min-[1400px]:pl-[26px] min-[1400px]:pr-4">
      <div className="grid gap-6 min-[1400px]:grid-cols-[minmax(0,1fr)_308px] min-[1400px]:gap-0">
        <div className="min-w-0 min-[1400px]:pr-5">
          <OperationsOverviewHeader onCreateProject={() => setModal("project")} />
          <OperationsKpiStrip activeProjects={summary.active} averageProgress={summary.average} blockedProjects={summary.blocked} pendingApprovals={summary.approvals} siteCount={summary.sites} />
          <div className="mt-7">
          <OperationsProjectTable projects={projects} onOpenProject={setDrawerProjectId} onOpenUpdate={openUpdate} />
          </div>
        </div>
        <div className="min-[1400px]:border-l min-[1400px]:border-[#e1e6e2] min-[1400px]:pl-[27px] min-[1400px]:pt-3">
          <OperationsQueues requests={requests} />
        </div>
      </div>

      <OperationsProjectDrawer
        project={selectedProject}
        onClose={closeDrawer}
        onCreateMilestone={() => setModal("milestone")}
        onCreateTask={() => setModal("task")}
        onOpenUpdate={openUpdate}
      />
      <OperationsModal modal={modal} project={selectedProject ?? undefined} selectedUpdate={selectedUpdate} engineers={engineers} onClose={() => setModal(null)} />
    </div>
  );
}

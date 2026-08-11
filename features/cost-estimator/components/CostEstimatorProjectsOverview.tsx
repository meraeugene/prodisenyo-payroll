"use client";

import {
  BriefcaseBusiness,
  CircleCheck,
  FileText,
  Send,
} from "lucide-react";
import CostEstimatorOverviewMetric from "@/features/cost-estimator/components/CostEstimatorOverviewMetric";
import CostEstimatorOverviewProjectCard from "@/features/cost-estimator/components/CostEstimatorOverviewProjectCard";
import type {
  AssignedEstimateProject,
  ProjectEstimateItemRow,
  ProjectEstimateRow,
} from "@/features/cost-estimator/types";

export default function CostEstimatorProjectsOverview({
  estimates,
  assignedProjects,
  itemsByEstimateId,
  pending,
  onOpenProject,
  onStartEstimate,
}: {
  estimates: ProjectEstimateRow[];
  assignedProjects: AssignedEstimateProject[];
  itemsByEstimateId: Record<string, ProjectEstimateItemRow[]>;
  pending: boolean;
  onOpenProject: (estimateId: string) => void;
  onStartEstimate: (projectId: string) => void;
}) {
  const assignedProjectsById = new Map(
    assignedProjects.map((project) => [project.id, project]),
  );
  const estimatedProjectIds = new Set(
    estimates.map((estimate) => estimate.project_id).filter(Boolean),
  );
  const projectsWithoutEstimates = assignedProjects.filter(
    (project) => !estimatedProjectIds.has(project.id),
  );
  const queueCount = estimates.length + projectsWithoutEstimates.length;
  const draftCount =
    projectsWithoutEstimates.length +
    estimates.filter((estimate) => estimate.status === "draft").length;
  const submittedCount = estimates.filter(
    (estimate) => estimate.status === "submitted",
  ).length;
  const approvedCount = estimates.filter(
    (estimate) => estimate.status === "approved",
  ).length;

  return (
    <div className="space-y-5 p-0 sm:p-6">
      <section className="rounded-none bg-[linear-gradient(135deg,#064e2b,#075f35_55%,#087443)] px-6 py-9 text-white shadow-[0_16px_34px_rgba(6,78,43,0.14)] sm:rounded-[14px] sm:px-10 sm:py-10">
        <h1 className="text-[34px] font-semibold tracking-[-0.035em] sm:text-[40px]">
          Cost Estimator
        </h1>
        <p className="mt-2 text-base text-white/90 sm:text-[18px]">
          Prepare and manage Bill of Quantities for projects assigned to you.
        </p>
      </section>

      <section aria-label="Estimate summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CostEstimatorOverviewMetric icon={BriefcaseBusiness} value={queueCount} label="Projects" tone="emerald" />
        <CostEstimatorOverviewMetric icon={FileText} value={draftCount} label="Draft" tone="amber" />
        <CostEstimatorOverviewMetric icon={Send} value={submittedCount} label="Submitted" tone="sky" />
        <CostEstimatorOverviewMetric icon={CircleCheck} value={approvedCount} label="Approved" tone="green" />
      </section>

      <section aria-labelledby="assigned-projects-heading" className="space-y-4 px-3 sm:px-2">
        <h2 id="assigned-projects-heading" className="text-[24px] font-semibold tracking-[-0.025em] text-slate-950">
          Assigned Projects
        </h2>

        {queueCount > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projectsWithoutEstimates.map((project) => (
              <CostEstimatorOverviewProjectCard
                key={project.id}
                project={project}
                estimate={null}
                items={[]}
                pending={pending}
                onOpen={() => onStartEstimate(project.id)}
              />
            ))}

            {estimates.map((estimate) => (
              <CostEstimatorOverviewProjectCard
                key={estimate.id}
                project={
                  estimate.project_id
                    ? assignedProjectsById.get(estimate.project_id) ?? null
                    : null
                }
                estimate={estimate}
                items={itemsByEstimateId[estimate.id] ?? []}
                pending={pending}
                onOpen={() => onOpenProject(estimate.id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[14px] border border-dashed border-emerald-200 bg-white px-5 py-14 text-center">
            <p className="font-semibold text-slate-900">No estimating assignments yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Projects assigned by the CEO for cost estimation will appear here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

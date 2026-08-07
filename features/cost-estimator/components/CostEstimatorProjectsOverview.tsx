"use client";

import { Calculator, FolderOpen } from "lucide-react";
import DashboardPageHero from "@/components/DashboardPageHero";
import EstimateStatusBadge from "@/features/cost-estimator/components/EstimateStatusBadge";
import {
  formatBudgetMoney,
  formatProjectTypeLabel,
} from "@/features/cost-estimator/utils/costEstimatorFormatters";
import type {
  AssignedEstimateProject,
  ProjectEstimateItemRow,
  ProjectEstimateRow,
} from "@/features/cost-estimator/types";

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

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
  const estimatedProjectIds = new Set(
    estimates.map((estimate) => estimate.project_id).filter(Boolean),
  );
  const projectsWithoutEstimates = assignedProjects.filter(
    (project) => !estimatedProjectIds.has(project.id),
  );
  const queueCount = estimates.length + projectsWithoutEstimates.length;

  return (
    <div className="space-y-4 p-0 sm:p-6">
      <DashboardPageHero
        eyebrow="Cost Estimation Workflow"
        title="Overall Projects"
        description="Open an existing estimate or start one for a project assigned to you by the CEO."
      />

      <section className="rounded-none border border-apple-mist bg-white p-5 shadow-[0_10px_30px_rgba(24,83,43,0.06)] sm:rounded-[18px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
              Project Queue
            </p>
            <h2 className="mt-2 text-xl font-semibold text-apple-charcoal">
              Your Estimate Queue
            </h2>
          </div>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            {queueCount} project{queueCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projectsWithoutEstimates.map((project) => (
            <article
              key={project.id}
              className="rounded-[14px] border border-emerald-200 bg-emerald-50/40 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
                    {project.subject || "Assigned project"}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-apple-charcoal">
                    {project.name}
                  </h3>
                </div>
                <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700">
                  New
                </span>
              </div>

              <div className="mt-4 rounded-[10px] border border-dashed border-emerald-200 bg-white/80 p-3">
                <p className="text-sm font-semibold text-apple-charcoal">
                  No cost estimate exists yet
                </p>
                <p className="mt-1 text-xs leading-5 text-apple-steel">
                  This project was assigned by the CEO and is waiting for its
                  first cost estimate.
                </p>
              </div>

              <div className="mt-4 space-y-2 text-sm text-apple-smoke">
                <p>
                  Location: <span className="font-semibold text-apple-charcoal">{project.location || "Not recorded"}</span>
                </p>
                <p>
                  Budget ceiling: <span className="font-semibold text-green-700">{formatBudgetMoney(project.budgetCeiling)}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => onStartEstimate(project.id)}
                disabled={pending}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-[#1f6a37] px-4 text-sm font-semibold text-white transition hover:bg-[#18552d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Calculator size={15} />
                Start cost estimate
              </button>
            </article>
          ))}

          {estimates.map((estimate) => {
            const estimateItems = itemsByEstimateId[estimate.id] ?? [];
            const totalQuantity = estimateItems.reduce(
              (sum, item) => sum + (item.quantity ?? 0),
              0,
            );
            const totalItemCost = estimateItems.reduce(
              (sum, item) => sum + (item.line_total ?? 0),
              0,
            );

            return (
              <article
                key={estimate.id}
                className="rounded-[14px] border border-apple-mist bg-[rgb(var(--apple-snow))] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
                      {formatProjectTypeLabel(estimate.project_type)}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-apple-charcoal">
                      {estimate.project_name}
                    </h3>
                  </div>
                  <EstimateStatusBadge status={estimate.status} />
                </div>

                <div className="mt-4 space-y-2 text-sm text-apple-smoke">
                  <p>
                    Total estimate:{" "}
                    <span className="font-semibold text-green-700">
                      {formatBudgetMoney(estimate.estimate_total)}
                    </span>
                  </p>

                  <p>
                    Total quantity:{" "}
                    <span className="font-semibold text-sky-700">
                      {totalQuantity.toLocaleString("en-PH")}
                    </span>
                  </p>
                  <p>
                    Total item cost:{" "}
                    <span className="font-semibold text-rose-700">
                      {formatBudgetMoney(totalItemCost)}
                    </span>
                  </p>

                  <p>
                    Updated:{" "}
                    <span className="font-semibold text-apple-charcoal">
                      {formatUpdatedAt(estimate.updated_at)}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenProject(estimate.id)}
                  disabled={pending}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-[#1f6a37] px-4 text-sm font-semibold text-white transition hover:bg-[#18552d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FolderOpen size={15} />
                  Open project
                </button>
              </article>
            );
          })}
        </div>

        {queueCount === 0 ? (
          <div className="rounded-[14px] border border-dashed border-apple-mist bg-[rgb(var(--apple-snow))] px-5 py-12 text-center">
            <p className="font-semibold text-apple-charcoal">No estimating assignments yet</p>
            <p className="mt-2 text-sm text-apple-steel">
              Projects assigned by the CEO for cost estimation will appear here.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

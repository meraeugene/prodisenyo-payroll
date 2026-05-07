"use client";

import { FolderOpen, PlusCircle } from "lucide-react";
import DashboardPageHero from "@/components/DashboardPageHero";
import {
  BUDGET_PROJECT_TYPE_OPTIONS,
  type BudgetItemRow,
  type BudgetProjectRow,
} from "@/features/budget-tracker/types";
import { formatBudgetMoney } from "@/features/budget-tracker/utils/budgetTrackerFormatters";

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getProjectTypeLabel(value: BudgetProjectRow["project_type"]) {
  return (
    BUDGET_PROJECT_TYPE_OPTIONS.find((option) => option.value === value)
      ?.label ?? value
  );
}

export default function BudgetTrackerProjectsOverview({
  projects,
  items,
  pending,
  onOpenProject,
  onCreateProject,
  canManageProjects,
}: {
  projects: BudgetProjectRow[];
  items: BudgetItemRow[];
  pending: boolean;
  onOpenProject: (projectId: string) => void;
  onCreateProject: () => void;
  canManageProjects: boolean;
}) {
  return (
    <div className="space-y-4 p-0 sm:p-6">
      <DashboardPageHero
        eyebrow="Budget Workflow"
        title="Overall Projects"
        description={
          canManageProjects
            ? "Select a project to open its budget board, or create a new one for another client request."
            : "Centralized view of ongoing Prodisenyo projects and budget progress."
        }
        actions={
          canManageProjects ? (
          <button
            type="button"
            onClick={onCreateProject}
            disabled={pending}
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-0"
          >
            <PlusCircle size={14} />
            New project
          </button>
          ) : null
        }
      />

      <section className="rounded-none border border-apple-mist bg-white p-4 shadow-[0_10px_30px_rgba(24,83,43,0.06)] sm:rounded-[18px] sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
              Project Queue
            </p>
            <h2 className="mt-2 text-xl font-semibold text-apple-charcoal">
              Budget Projects
            </h2>
          </div>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-apple-mist bg-[rgb(var(--apple-snow))] p-8 text-center">
            <p className="text-sm font-semibold text-apple-charcoal">
              No projects to display yet.
            </p>
            <p className="mt-2 text-sm text-apple-smoke">
              Project tracking will show new Prodisenyo projects here once they
              are created.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
            const projectItems = items.filter(
              (item) => item.project_id === project.id,
            );
            const spent = projectItems.reduce(
              (sum, item) => sum + (item.actual_spent ?? 0),
              0,
            );
            const remaining = (project.starting_budget ?? 0) - spent;

            return (
              <article
                key={project.id}
                className="rounded-[14px] border border-apple-mist bg-[rgb(var(--apple-snow))] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
                      {getProjectTypeLabel(project.project_type)}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-apple-charcoal">
                      {project.name}
                    </h3>
                  </div>
                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                    Draft
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm text-apple-smoke">
                  <p>
                    Budget:{" "}
                    <span className="font-semibold text-sky-700">
                      {formatBudgetMoney(
                        project.starting_budget ?? 0,
                        project.currency_code,
                      )}
                    </span>
                  </p>
                  <p>
                    Spent:{" "}
                    <span className="font-semibold text-rose-700">
                      {formatBudgetMoney(spent, project.currency_code)}
                    </span>
                  </p>
                  <p>
                    Remaining:{" "}
                    <span className="font-semibold text-emerald-700">
                      {formatBudgetMoney(remaining, project.currency_code)}
                    </span>
                  </p>
                  <p>
                    Updated:{" "}
                    <span className="font-semibold text-apple-charcoal">
                      {formatUpdatedAt(project.updated_at)}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenProject(project.id)}
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
        )}
      </section>
    </div>
  );
}

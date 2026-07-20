import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle,
  MapPin,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectRecord } from "@/features/projects/types";

type ProjectPortfolioCardProps = {
  project: ProjectRecord;
  role: "ceo" | "engineer";
  imageSrc: string;
  formatCurrency: (value: number) => string;
  isOverBudget: (project: ProjectRecord) => boolean;
  onOpen: () => void;
};

export default function ProjectPortfolioCard({
  project,
  role,
  imageSrc,
  formatCurrency,
  isOverBudget,
  onOpen,
}: ProjectPortfolioCardProps) {
  const budgetWarning = role === "ceo" && isOverBudget(project);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={project.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.12)_0%,rgba(15,23,42,0.28)_42%,rgba(15,23,42,0.78)_100%)]" />
        {budgetWarning ? (
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-rose-700 shadow-sm">
              <AlertTriangle size={11} />
              Budget
            </span>
          </div>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <h3 className="text-lg font-semibold leading-tight tracking-[-0.01em] [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
            {project.name}
          </h3>
          <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md bg-slate-950/55 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            <MapPin size={13} className="shrink-0 text-emerald-200" />
            <span className="truncate">{project.location}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Completion
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-slate-950">
                {project.progress}%
              </p>
            </div>
            <div className="text-right text-xs font-semibold text-slate-600">
              {project.completedTasksCount} / {project.tasksCount} tasks
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-700 transition-all duration-700"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {role === "ceo" ? (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Budget Limit
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {formatCurrency(project.budget)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Actual Spent
              </p>
              <p
                className={cn(
                  "mt-1 text-sm font-semibold",
                  budgetWarning ? "text-rose-600" : "text-emerald-700",
                )}
              >
                {formatCurrency(project.spent)}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs font-medium text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle size={13} className="text-emerald-600" />
              {project.completedTasksCount} / {project.tasksCount} completed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={13} className="text-slate-500" />
              End: {project.endDate}
            </span>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <User size={13} />
            <span className="truncate">Engr: {project.engineer}</span>
          </span>
          <button
            onClick={onOpen}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-emerald-800 px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-900"
          >
            {role === "ceo" ? "View Details" : "Open Workspace"}
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </article>
  );
}

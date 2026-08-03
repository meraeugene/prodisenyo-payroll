import { Plus } from "lucide-react";

type ProjectPortfolioOverviewProps = {
  role: "ceo" | "engineer";
  totalBudget: string;
  totalSpent: string;
  onCreateProject: () => void;
};

export default function ProjectPortfolioOverview({
  role,
  totalBudget,
  totalSpent,
  onCreateProject,
}: ProjectPortfolioOverviewProps) {
  return (
    <section aria-labelledby="portfolio-heading">
      <div className="flex flex-col gap-5 border-b border-emerald-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            Portfolio overview
          </p>
          <h1
            id="portfolio-heading"
            className="mt-2 text-3xl font-bold tracking-[-0.03em] text-slate-950 sm:text-4xl"
          >
            Project Portfolio
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
            Track budgets and spending across every active project.
          </p>
        </div>

        {role === "ceo" ? (
          <button
            type="button"
            onClick={onCreateProject}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2.5 self-start rounded-xl bg-emerald-800 px-5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(6,95,70,0.18)] transition-colors hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 sm:self-auto"
          >
            <Plus aria-hidden="true" size={18} strokeWidth={2.25} />
            Create New Project
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid overflow-hidden rounded-2xl bg-emerald-50/70 sm:grid-cols-2">
        <PortfolioMetric
          label="Total portfolio budget"
          value={totalBudget}
        />
        <PortfolioMetric
          label="Actual spent to date"
          value={totalSpent}
          secondary
        />
      </div>
    </section>
  );
}

function PortfolioMetric({
  label,
  value,
  secondary = false,
}: {
  label: string;
  value: string;
  secondary?: boolean;
}) {
  return (
    <div
      className={
        secondary
          ? "border-t border-emerald-200/80 px-6 py-6 sm:border-l sm:border-t-0 sm:px-8"
          : "px-6 py-6 sm:px-8"
      }
    >
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-[-0.03em] text-emerald-950 sm:text-4xl">
        {value}
      </p>
    </div>
  );
}

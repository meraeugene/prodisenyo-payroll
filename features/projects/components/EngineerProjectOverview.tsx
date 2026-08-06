import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  PackageCheck,
  PackageOpen,
} from "lucide-react";
import type { ProjectProgressUpdateRecord } from "../progressUpdateTypes";
import type { ProjectRecord } from "../types";
import { buildProjectScheduleSummary } from "../utils/engineerProjectOverview";
import { formatProjectCurrency } from "../utils/projectPresentation";

type Submission = { id: string; activity_count: number; submitted_at: string };
type MaterialRequest = { id: string; material_name: string; status: string; created_at: string };
type BudgetItem = { id: string; actual_spent: number };

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

export default function EngineerProjectOverview({
  project,
  budgetItems,
  materialRequests,
  progressUpdates,
  canUpdateProgress,
  onUpdateProgress,
  onOpenMaterials,
}: {
  project: ProjectRecord;
  activities: unknown[];
  submissions: Submission[];
  budgetItems: BudgetItem[];
  materialRequests: MaterialRequest[];
  progressUpdates: ProjectProgressUpdateRecord[];
  canUpdateProgress: boolean;
  onUpdateProgress: () => void;
  onOpenMaterials: () => void;
}) {
  const latestUpdate = progressUpdates[0];
  const overallProgress = latestUpdate?.overall_percent ?? 0;
  const spent = budgetItems.reduce((total, item) => total + Number(item.actual_spent || 0), 0);
  const remaining = Math.max(0, project.budget - spent);
  const schedule = buildProjectScheduleSummary({
    status: project.status,
    progress: overallProgress,
    endDate: project.endDate,
  });
  const materialCounts = materialRequests.reduce(
    (counts, request) => {
      counts.total += 1;
      if (request.status === "submitted") counts.pending += 1;
      if (request.status === "approved") counts.approved += 1;
      if (request.status === "rejected") counts.returned += 1;
      return counts;
    },
    { total: 0, pending: 0, approved: 0, returned: 0 },
  );

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_.95fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_22px_rgba(15,23,42,.04)] sm:p-6">
          <h2 className="text-sm font-semibold text-slate-950">Project Progress</h2>
          <div className="mt-6 flex items-end gap-3">
            <p className="text-4xl font-bold tracking-tight text-slate-950">{overallProgress}%</p>
            <p className="pb-1 text-sm text-slate-500">Overall progress</p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-700 transition-[width]" style={{ width: `${overallProgress}%` }} />
          </div>
          <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4">
            <Info label="Target Completion" value={formatDate(project.endDate)} />
            <Info label="Schedule" value={schedule.label} tone={schedule.state === "overdue" ? "danger" : "default"} />
          </dl>
          {canUpdateProgress ? (
            <button type="button" onClick={onUpdateProgress} className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-700 px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2">
              Update Progress <ArrowRight size={15} />
            </button>
          ) : null}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_22px_rgba(15,23,42,.04)] sm:p-6">
          <h2 className="text-sm font-semibold text-slate-950">Project Information</h2>
          <dl className="mt-4 divide-y divide-slate-100">
            <Info label="Client" value={project.client || "Not recorded"} />
            <Info label="Budget" value={formatProjectCurrency(project.budget)} />
            <Info label="Spent to Date" value={formatProjectCurrency(spent)} />
            <Info label="Remaining Budget" value={formatProjectCurrency(remaining)} />
            <Info label="Status" value={project.status.replace("_", " ")} />
            <Info label="Start Date" value={formatDate(project.startDate)} />
            <Info label="Expected Date" value={formatDate(project.endDate)} />
          </dl>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_22px_rgba(15,23,42,.04)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Materials</h2>
              <p className="mt-1 text-xs text-slate-500">Requests for this project</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><PackageOpen size={21} /></div>
          </div>
          <p className="mt-6 text-4xl font-bold tracking-tight text-slate-950">{materialCounts.total}</p>
          <p className="mt-1 text-sm text-slate-500">Total material requests</p>
          <div className="mt-5 divide-y divide-slate-100 border-y border-slate-100">
            <MaterialStat label="Awaiting CEO review" value={materialCounts.pending} icon={Clock3} tone="amber" />
            <MaterialStat label="Approved" value={materialCounts.approved} icon={CheckCircle2} tone="emerald" />
            <MaterialStat label="Returned" value={materialCounts.returned} icon={PackageCheck} tone="rose" />
          </div>
          <button type="button" onClick={onOpenMaterials} className="mt-5 inline-flex w-full items-center justify-between rounded-lg px-1 py-2 text-sm font-semibold text-emerald-800 transition hover:text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2">
            View Material Requests <ArrowRight size={16} />
          </button>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_22px_rgba(15,23,42,.04)] sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="text-base font-semibold text-slate-950">Recent Progress Updates</h2><p className="mt-1 text-xs text-slate-500">Latest overall progress reports submitted for this project.</p></div>
          {progressUpdates.length > 0 ? <button type="button" onClick={onUpdateProgress} className="text-sm font-semibold text-emerald-800 hover:text-emerald-950">View all</button> : null}
        </div>
        <div className="mt-4 divide-y divide-slate-100">
          {progressUpdates.slice(0, 4).map((update) => (
            <article key={update.id} className="grid gap-3 py-4 sm:grid-cols-[120px_70px_minmax(0,1fr)] sm:items-start">
              <time className="text-xs font-medium text-slate-500">{formatDate(update.created_at)}</time>
              <p className="text-sm font-bold text-emerald-700">{update.overall_percent}%</p>
              <div><p className="text-sm font-semibold text-slate-800">{update.completed_work_summary}</p>{update.remarks ? <p className="mt-1 text-xs leading-5 text-slate-500">{update.remarks}</p> : null}</div>
            </article>
          ))}
          {progressUpdates.length === 0 ? <div className="py-10 text-center"><p className="font-medium text-slate-700">No progress updates yet</p><p className="mt-1 text-sm text-slate-500">Use Update Progress to submit the first overall project update.</p></div> : null}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "danger" }) {
  return <div className="flex items-start justify-between gap-4 py-3 text-sm"><dt className="text-slate-500">{label}</dt><dd className={`max-w-[62%] text-right font-semibold capitalize ${tone === "danger" ? "text-rose-600" : "text-slate-900"}`}>{value}</dd></div>;
}

function MaterialStat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Clock3; tone: "amber" | "emerald" | "rose" }) {
  const colors = { amber: "text-amber-600", emerald: "text-emerald-700", rose: "text-rose-600" };
  return <div className="flex items-center justify-between gap-3 py-3"><span className="inline-flex items-center gap-2 text-sm text-slate-600"><Icon size={15} className={colors[tone]} />{label}</span><strong className="text-sm text-slate-950">{value}</strong></div>;
}

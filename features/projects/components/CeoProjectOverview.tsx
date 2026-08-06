import { CalendarDays, CircleCheckBig, WalletCards } from "lucide-react";
import ProjectProgressUpdatesPanel from "./ProjectProgressUpdatesPanel";
import type { ProjectProgressUpdateRecord } from "../progressUpdateTypes";
import type { ProjectRecord } from "@/features/projects/types";
import { formatProjectCurrency } from "@/features/projects/utils/projectPresentation";
import {
  getLatestProgressUpdatePercentage,
  selectLatestProgressUpdate,
} from "@/features/projects/utils/progressUpdates";

type BudgetItem = {
  id: string;
  name: string;
  category: string;
  estimated_cost: number;
  actual_spent: number;
  status: string;
};

function formatUpdateDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export default function CeoProjectOverview({
  project,
  budgetItems,
  progressUpdates,
}: {
  project: ProjectRecord;
  budgetItems: BudgetItem[];
  progressUpdates: ProjectProgressUpdateRecord[];
}) {
  const spent = budgetItems.reduce((sum, item) => sum + Number(item.actual_spent), 0);
  const remaining = Math.max(0, project.budget - spent);
  const latestUpdate = selectLatestProgressUpdate(progressUpdates);
  const currentProgress = getLatestProgressUpdatePercentage(progressUpdates) ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <OverviewCard title="Project Progress" icon={CircleCheckBig}>
          <div className="flex items-end gap-3">
            <p className="text-3xl font-bold text-slate-950">{currentProgress}%</p>
            <p className="pb-1 text-xs text-slate-500">
              {latestUpdate
                ? "Latest update " + formatUpdateDate(latestUpdate.created_at)
                : "No progress update submitted"}
            </p>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-700" style={{ width: currentProgress + "%" }} />
          </div>
          <div className="mt-5 grid gap-3 text-sm">
            <InfoRow label="Start Date" value={project.startDate} />
            <InfoRow label="Target Completion" value={project.endDate} />
            <InfoRow label="Project Status" value={project.status.replace("_", " ")} />
          </div>
        </OverviewCard>

        <OverviewCard title="Budget Summary" icon={WalletCards}>
          <div className="grid gap-4 text-sm">
            <InfoRow label="Budget Limit" value={formatProjectCurrency(project.budget)} />
            <InfoRow label="Actual Spent" value={formatProjectCurrency(spent)} />
            <div className="border-t border-slate-100 pt-4">
              <InfoRow label="Remaining Balance" value={formatProjectCurrency(remaining)} emphasized />
            </div>
          </div>
        </OverviewCard>

        <OverviewCard title="Project Information" icon={CalendarDays}>
          <div className="grid gap-4 text-sm">
            <InfoRow label="Engineer / PM" value={project.engineer} />
            <InfoRow label="Estimate Engineer" value={project.estimateEngineer || project.engineer} />
            <InfoRow label="Location" value={project.location} />
            <InfoRow label="Client" value={project.client || "Not recorded"} />
          </div>
        </OverviewCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <ProjectProgressUpdatesPanel
          projectId={project.id}
          updates={progressUpdates.slice(0, 6)}
          canSubmit={false}
          onCreated={() => undefined}
          displayMode="history"
          historyClassName=""
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,.04)]">
          <h2 className="font-bold text-slate-950">Current Cost Items</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {budgetItems.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
                  <p className="text-xs capitalize text-slate-500">{item.category}</p>
                </div>
                <p className="shrink-0 text-sm font-bold text-slate-900">{formatProjectCurrency(item.actual_spent)}</p>
              </div>
            ))}
            {!budgetItems.length ? <p className="py-8 text-center text-sm text-slate-500">No budget items recorded yet.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function OverviewCard({ title, icon: Icon, children }: { title: string; icon: typeof CircleCheckBig; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,.04)]">
      <div className="mb-5 flex items-center gap-2">
        <Icon size={17} className="text-emerald-700" />
        <h2 className="font-bold text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function InfoRow({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className={emphasized ? "font-semibold text-emerald-700" : "text-slate-500"}>{label}</span>
      <span className={"text-right capitalize " + (emphasized ? "font-bold text-emerald-800" : "font-semibold text-slate-900")}>{value}</span>
    </div>
  );
}
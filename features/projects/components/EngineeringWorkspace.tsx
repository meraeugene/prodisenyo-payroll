"use client";

import type { ReactNode } from "react";
import {
  ArrowLeft,
  ClipboardList,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectRecord } from "../types";
import type { ImportedProgressActivity } from "../utils/engineeringProgressImport";
import {
  buildProgressSummary,
  type EngineeringProgressActivityRecord,
} from "../utils/engineeringWorkspace";
import EngineeringProgressWorksheet from "./EngineeringProgressWorksheet";

export type EngineeringWorkspaceTab = "progress" | "materials";

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

interface EngineeringWorkspaceProps {
  project: ProjectRecord;
  tab: EngineeringWorkspaceTab;
  activities: EngineeringProgressActivityRecord[];
  materialsCount: number;
  materialContent: ReactNode;
  onBack: () => void;
  onTabChange: (tab: EngineeringWorkspaceTab) => void;
  onAddActivity: (input: {
    activity: string;
    weightPercent: number;
    progressPercent: number;
  }) => void;
  onUpdateActivity: (
    id: string,
    input: {
      activity: string;
      weightPercent: number;
      progressPercent: number;
    },
  ) => void;
  onImportActivities: (activities: ImportedProgressActivity[]) => void;
  onDeleteActivity: (id: string) => void;
  onDeleteAllActivities: () => void;
}

export default function EngineeringWorkspace({
  project,
  tab,
  activities,
  materialsCount,
  materialContent,
  onBack,
  onTabChange,
  onAddActivity,
  onUpdateActivity,
  onImportActivities,
  onDeleteActivity,
  onDeleteAllActivities,
}: EngineeringWorkspaceProps) {
  const activityRows = Array.isArray(activities) ? activities : [];
  const progressSummary = buildProgressSummary(activityRows);
  const tabs = [
    { id: "progress", label: "Progress", icon: FileText, count: activityRows.length },
    { id: "materials", label: "Materials", icon: ClipboardList, count: materialsCount },
  ] as const;
  return (
    <div className="space-y-4 text-sm">
      <header className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to projects"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Engineering workspace
              </p>
              <h2 className="truncate text-xl font-bold text-apple-charcoal">
                {project.name}
              </h2>
            </div>
          </div>

          <div className="rounded-md bg-slate-50 px-3 py-2 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Overall progress
            </p>
            <p className="text-lg font-bold text-emerald-700">
              {formatPercent(progressSummary.overallProgress)}
            </p>
          </div>
        </div>
      </header>

      <nav
        aria-label="Engineering workspace sections"
        className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
      >
        <div className="flex min-w-max gap-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              aria-current={tab === item.id ? "page" : undefined}
              className={cn(
                "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                tab === item.id
                  ? "bg-[#1f6a37] text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-apple-charcoal",
              )}
            >
              <item.icon size={15} />
              {item.label}
              {"count" in item ? (
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold",
                    tab === item.id
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </nav>

      {tab === "progress" ? (
        <EngineeringProgressWorksheet
          activities={activityRows}
          onAddActivity={onAddActivity}
          onUpdateActivity={onUpdateActivity}
          onImportActivities={onImportActivities}
          onDeleteActivity={onDeleteActivity}
          onDeleteAllActivities={onDeleteAllActivities}
        />
      ) : null}

      {tab === "materials" ? materialContent : null}
    </div>
  );
}

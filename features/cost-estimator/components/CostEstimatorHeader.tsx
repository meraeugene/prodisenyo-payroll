"use client";

import {
  CheckCircle2,
  Ellipsis,
  LayoutList,
  FolderPlus,
  LoaderCircle,
  Save,
  Trash2,
  Info,
} from "lucide-react";
import EstimateStatusBadge from "@/features/cost-estimator/components/EstimateStatusBadge";
import type { ProjectEstimateRow } from "@/features/cost-estimator/types";
import { cn } from "@/lib/utils";

export default function CostEstimatorHeader({
  estimates,
  selectedEstimate,
  uiLocked,
  pendingDeleteEstimate,
  pendingSaveEstimate,
  saveState,
  saveMessage,
  onOpenProjects,
  onSelectEstimate,
  onSaveDraft,
  onNewProject,
  onDeleteProject,
}: {
  estimates: ProjectEstimateRow[];
  selectedEstimate: ProjectEstimateRow | null;
  uiLocked: boolean;
  pendingDeleteEstimate: boolean;
  pendingSaveEstimate: boolean;
  saveState: "saved" | "dirty" | "saving" | "error";
  saveMessage: string;
  onOpenProjects: () => void;
  onSelectEstimate: (estimateId: string) => void;
  onSaveDraft: () => void;
  onNewProject: () => void;
  onDeleteProject: () => void;
}) {
  const isReadOnlyEstimate =
    selectedEstimate !== null && selectedEstimate.status !== "draft";
  const canDeleteEstimate =
    selectedEstimate !== null &&
    selectedEstimate.status !== "approved" &&
    selectedEstimate.status !== "submitted";

  return (
    <header className="sticky top-[69px] z-20 border-b border-apple-mist bg-white/95 px-3 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-white/85 lg:top-0">
      <div className="flex min-h-[48px] flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid w-full gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3 xl:w-auto">
          {estimates.length > 0 ? (
            <button
              type="button"
              onClick={onOpenProjects}
              disabled={uiLocked}
              className="hidden h-11 items-center gap-2 rounded-[10px] border border-apple-mist bg-white px-4 text-sm font-semibold text-apple-charcoal transition hover:bg-apple-mist/40 disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex"
            >
              <LayoutList size={16} />
              All projects
            </button>
          ) : null}

          {selectedEstimate ? (
            <select
              value={selectedEstimate.id}
              onChange={(event) => onSelectEstimate(event.target.value)}
              disabled={uiLocked}
              className="h-11 w-full min-w-0 rounded-[10px] border border-apple-mist bg-white px-4 text-base font-semibold text-apple-charcoal outline-none transition hover:border-[#1f6a37]/60 hover:bg-[#f8fbf9] focus:border-[#1f6a37] focus:bg-[#f8fbf9] sm:min-w-[280px] sm:w-auto"
            >
              {estimates.map((estimate) => (
                <option key={estimate.id} value={estimate.id}>
                  {estimate.project_name || "Untitled estimate"}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex h-11 items-center rounded-[10px] border border-apple-mist bg-white px-4 text-sm text-apple-smoke">
              No project selected
            </div>
          )}

          <div
            className={cn(
              "hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium sm:inline-flex",
              saveState === "saving"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : saveState === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : saveState === "dirty"
                    ? "border-sky-200 bg-sky-50 text-sky-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700",
            )}
          >
            {saveState === "saving" ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            <span>{saveMessage}</span>
          </div>

          {selectedEstimate && selectedEstimate.status !== "draft" ? (
            <div className="hidden sm:block">
              <EstimateStatusBadge status={selectedEstimate.status} />
            </div>
          ) : null}
        </div>

        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-3 xl:justify-end">
          {selectedEstimate ? (
            !isReadOnlyEstimate ? (
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={uiLocked || saveState !== "dirty"}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {pendingSaveEstimate ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Save draft
              </button>
            ) : (
              <div className="w-full flex flex-col gap-2 sm:hidden">
                <button
                  type="button"
                  disabled
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 opacity-80 cursor-default"
                >
                  <CheckCircle2 size={18} />
                  Submitted
                </button>
              </div>
            )
          ) : null}

          <details className="relative sm:hidden">
            <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-[10px] border border-apple-mist bg-white text-apple-charcoal transition hover:bg-apple-mist/40 [&::-webkit-details-marker]:hidden">
              <Ellipsis size={18} />
            </summary>
            <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-48 overflow-hidden rounded-[12px] border border-apple-mist bg-white shadow-[0_16px_40px_rgba(15,23,42,0.16)]">
              {estimates.length > 0 ? (
                <button
                  type="button"
                  onClick={onOpenProjects}
                  disabled={uiLocked}
                  className="flex h-10 w-full items-center gap-2 border-b border-apple-mist px-3 text-left text-sm font-medium text-apple-charcoal transition hover:bg-apple-mist/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LayoutList size={15} />
                  All projects
                </button>
              ) : null}
              <button
                type="button"
                onClick={onNewProject}
                disabled={uiLocked}
                className="flex h-10 w-full items-center gap-2 border-b border-apple-mist px-3 text-left text-sm font-medium text-apple-charcoal transition hover:bg-apple-mist/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FolderPlus size={15} />
                New project
              </button>
              {canDeleteEstimate ? (
                <button
                  type="button"
                  onClick={onDeleteProject}
                  disabled={uiLocked}
                  className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm font-medium text-rose-700 transition hover:bg-rose-50 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingDeleteEstimate ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 size={15} />
                  )}
                  Delete project
                </button>
              ) : null}
            </div>
          </details>

          <button
            type="button"
            onClick={onNewProject}
            disabled={uiLocked}
            className="hidden h-11 items-center gap-2 rounded-[10px] border border-apple-mist bg-white px-4 text-sm font-medium text-apple-charcoal transition hover:bg-apple-mist/40 disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex"
          >
            <FolderPlus size={16} />
            New project
          </button>
          {canDeleteEstimate ? (
            <button
              type="button"
              onClick={onDeleteProject}
              disabled={uiLocked}
              className="hidden h-11 items-center gap-2 rounded-[10px] border border-rose-200 bg-white px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-50 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex"
            >
              {pendingDeleteEstimate ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              Delete project
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

import {
  CheckCircle2,
  FolderPlus,
  LayoutList,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type { BudgetProjectRow } from "@/features/budget-tracker/types";
import { cn } from "@/lib/utils";

export default function BudgetTrackerHeader({
  projects,
  selectedProject,
  schemaReady,
  isPending,
  saveState,
  saveMessage,
  onOpenProjects,
  onSelectProject,
  onSaveDraft,
  onNewProject,
  onAddCost,
  onDeleteProject,
  canManageProjects,
}: {
  projects: BudgetProjectRow[];
  selectedProject: BudgetProjectRow | null;
  schemaReady: boolean;
  isPending: boolean;
  saveState: "saved" | "dirty" | "saving" | "error";
  saveMessage: string;
  onOpenProjects: () => void;
  onSelectProject: (projectId: string) => void;
  onSaveDraft: () => void;
  onNewProject: () => void;
  onAddCost: () => void;
  onDeleteProject: () => void;
  canManageProjects: boolean;
}) {
  const [showMobileActions, setShowMobileActions] = useState(false);

  const mobileSaveLabel =
    saveState === "saving"
      ? "Saving draft"
      : saveState === "error"
        ? "Save failed"
        : "Save draft";
  const canSaveDraft = saveState === "dirty";

  return (
    <header className="sticky top-[69px] z-20 w-full border-b border-apple-mist bg-white/95 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-white/85 lg:top-0">
      <div className="flex min-h-[48px] flex-col gap-3 px-3 sm:hidden">
        {selectedProject ? (
          <select
            value={selectedProject.id}
            onChange={(event) => onSelectProject(event.target.value)}
            className="h-11 w-full rounded-[10px] border border-apple-mist bg-white px-4 text-base font-semibold text-apple-charcoal outline-none transition hover:border-[#1f6a37]/60 hover:bg-[#f8fbf9] focus:border-[#1f6a37] focus:bg-[#f8fbf9]"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex h-11 items-center rounded-[10px] border border-apple-mist bg-white px-4 text-sm text-apple-smoke">
            No project selected
          </div>
        )}

        <div className="flex items-center gap-2">
          {canManageProjects ? (
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isPending || saveState !== "dirty"}
            className={cn(
              "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
              saveState === "saving"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : saveState === "dirty"
                  ? "border-sky-200 bg-sky-50 text-sky-700"
                  : saveState === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700",
            )}
          >
            {saveState === "saving" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{mobileSaveLabel}</span>
          </button>
          ) : null}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMobileActions((current) => !current)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-apple-mist bg-white text-apple-charcoal transition hover:bg-apple-mist/40"
              aria-label="Open budget tracker actions"
            >
              <MoreHorizontal size={18} />
            </button>

            {showMobileActions ? (
              <div className="absolute right-0 top-[calc(100%+8px)] z-30 min-w-[190px] overflow-hidden rounded-[12px] border border-apple-mist bg-white p-1.5 shadow-[0_14px_28px_rgba(15,23,42,0.12)]">
                {projects.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenProjects();
                      setShowMobileActions(false);
                    }}
                    disabled={isPending}
                    className="flex h-10 w-full items-center gap-2 rounded-[10px] px-3 text-sm font-medium text-apple-charcoal transition hover:bg-apple-mist/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LayoutList size={16} />
                    All projects
                  </button>
                ) : null}

                {canManageProjects ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onNewProject();
                        setShowMobileActions(false);
                      }}
                      disabled={!schemaReady || isPending}
                      className="flex h-10 w-full items-center gap-2 rounded-[10px] px-3 text-sm font-medium text-apple-charcoal transition hover:bg-apple-mist/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FolderPlus size={16} />
                      New project
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onAddCost();
                        setShowMobileActions(false);
                      }}
                      disabled={!selectedProject || !schemaReady || isPending}
                      className="flex h-10 w-full items-center gap-2 rounded-[10px] px-3 text-sm font-semibold text-[#1f6a37] transition hover:bg-[#eaf7ef] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Plus size={16} />
                      Add cost
                    </button>
                  </>
                ) : null}

                {canManageProjects && selectedProject ? (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteProject();
                      setShowMobileActions(false);
                    }}
                    disabled={isPending}
                    className="flex h-10 w-full items-center gap-2 rounded-[10px] px-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 size={16} />
                    Delete project
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="hidden min-h-[48px] flex-col gap-3 px-3 sm:flex xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {projects.length > 0 ? (
            <button
              type="button"
              onClick={onOpenProjects}
              disabled={isPending}
              className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-apple-mist bg-white px-4 text-sm font-semibold text-apple-charcoal transition hover:bg-apple-mist/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LayoutList size={16} />
              All projects
            </button>
          ) : null}

          {selectedProject ? (
            <select
              value={selectedProject.id}
              onChange={(event) => onSelectProject(event.target.value)}
              className="h-11 min-w-[280px] rounded-[10px] border border-apple-mist bg-white px-4 text-base font-semibold text-apple-charcoal outline-none transition hover:border-[#1f6a37]/60 hover:bg-[#f8fbf9] focus:border-[#1f6a37] focus:bg-[#f8fbf9]"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex h-11 items-center rounded-[10px] border border-apple-mist bg-white px-4 text-sm text-apple-smoke">
              No project selected
            </div>
          )}

          {canManageProjects ? (
            <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium",
              saveState === "saving"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : saveState === "dirty"
                  ? "border-sky-200 bg-sky-50 text-sky-700"
                  : saveState === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
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
          ) : (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
              View only
            </span>
          )}

          {selectedProject ? (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              {canManageProjects ? "Draft" : "Centralized tracking"}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
          {canManageProjects && selectedProject ? (
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isPending || !canSaveDraft}
              className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saveState === "saving" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save draft
            </button>
          ) : null}

          {canManageProjects ? (
            <>
              <button
                type="button"
                onClick={onNewProject}
                disabled={!schemaReady || isPending}
                className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-apple-mist bg-white px-4 text-sm font-medium text-apple-charcoal transition hover:bg-apple-mist/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FolderPlus size={16} />
                New project
              </button>
              <button
                type="button"
                onClick={onAddCost}
                disabled={!selectedProject || !schemaReady || isPending}
                className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-[#1f6a37] px-5 text-sm font-semibold text-white transition hover:bg-[#18552b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={16} />
                Add cost
              </button>
            </>
          ) : null}
          {canManageProjects && selectedProject ? (
            <button
              type="button"
              onClick={onDeleteProject}
              disabled={isPending}
              className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-rose-200 bg-white px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-50 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 size={16} />
              Delete project
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

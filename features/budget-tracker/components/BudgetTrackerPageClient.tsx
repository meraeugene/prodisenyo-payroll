"use client";

import { useState } from "react";
import BudgetTrackerBoard from "@/features/budget-tracker/components/BudgetTrackerBoard";
import CostEstimatorConfirmModal from "@/features/cost-estimator/components/CostEstimatorConfirmModal";
import BudgetTrackerDeleteProjectModal from "@/features/budget-tracker/components/BudgetTrackerDeleteProjectModal";
import BudgetTrackerHeader from "@/features/budget-tracker/components/BudgetTrackerHeader";
import BudgetTrackerItemModal from "@/features/budget-tracker/components/BudgetTrackerItemModal";
import BudgetTrackerProjectsOverview from "@/features/budget-tracker/components/BudgetTrackerProjectsOverview";
import BudgetTrackerSetupForm from "@/features/budget-tracker/components/BudgetTrackerSetupForm";
import BudgetTrackerSummaryPanel from "@/features/budget-tracker/components/BudgetTrackerSummaryPanel";
import { useBudgetTrackerPage } from "@/features/budget-tracker/hooks/useBudgetTrackerPage";
import type {
  BudgetItemRow,
  BudgetProjectRow,
} from "@/features/budget-tracker/types";

export default function BudgetTrackerPageClient({
  projects,
  items,
  schemaReady,
  loadError,
  canManageProjects,
}: {
  projects: BudgetProjectRow[];
  items: BudgetItemRow[];
  schemaReady: boolean;
  loadError: string | null;
  canManageProjects: boolean;
}) {
  const state = useBudgetTrackerPage({
    projects,
    items,
    schemaReady,
    canManageProjects,
  });
  const [showSaveDraftFirstConfirm, setShowSaveDraftFirstConfirm] =
    useState(false);
  const [saveDraftNextAction, setSaveDraftNextAction] = useState<
    "new-project" | "overview" | "switch-project" | null
  >(null);
  const [pendingProjectSwitchId, setPendingProjectSwitchId] = useState<
    string | null
  >(null);
  const [showProjectOverview, setShowProjectOverview] = useState(
    schemaReady && (!canManageProjects || projects.length > 0),
  );

  function handleOpenProject(projectId: string) {
    handleRequestSelectProject(projectId);
    setShowProjectOverview(false);
  }

  function handleCreateProject() {
    if (!canManageProjects) return;

    state.resetProjectForm();
    state.setProjectSetupOpen(true);
    setShowProjectOverview(false);
  }

  function handleRequestCreateProject() {
    if (state.selectedProject && state.hasUnsavedChanges) {
      setSaveDraftNextAction("new-project");
      setShowSaveDraftFirstConfirm(true);
      return;
    }

    handleCreateProject();
  }

  function handleRequestOpenOverview() {
    if (state.selectedProject && state.hasUnsavedChanges) {
      setSaveDraftNextAction("overview");
      setShowSaveDraftFirstConfirm(true);
      return;
    }

    setShowProjectOverview(true);
  }

  function handleRequestSelectProject(projectId: string) {
    if (projectId === state.selectedProject?.id) {
      return;
    }

    if (state.selectedProject && state.hasUnsavedChanges) {
      setPendingProjectSwitchId(projectId);
      setSaveDraftNextAction("switch-project");
      setShowSaveDraftFirstConfirm(true);
      return;
    }

    state.setSelectedProjectId(projectId);
    // setShowProjectOverview(false); // Now handled in handleOpenProject
  }

  const showOverview =
    schemaReady &&
    showProjectOverview &&
    !state.projectSetupOpen;

  return (
    <div>
      {showOverview ? (
        <BudgetTrackerProjectsOverview
          projects={state.localProjects}
          items={state.localItems}
          pending={state.isPending}
          onOpenProject={handleOpenProject}
          onCreateProject={handleRequestCreateProject}
          canManageProjects={state.canManageProjects}
        />
      ) : null}

      {!state.projectSetupOpen && !showOverview ? (
        <BudgetTrackerHeader
          projects={state.localProjects}
          selectedProject={state.selectedProject}
          schemaReady={schemaReady}
          isPending={state.isPending}
          saveState={state.saveState}
          saveMessage={state.saveMessage}
          onOpenProjects={handleRequestOpenOverview}
          onSelectProject={handleRequestSelectProject}
          onSaveDraft={() => state.handleSaveDraft()}
          onNewProject={handleRequestCreateProject}
          onAddCost={() => state.openNewItemModal()}
          onDeleteProject={() => state.setDeleteProjectModalOpen(true)}
          canManageProjects={state.canManageProjects}
        />
      ) : null}

      {!schemaReady ? (
        <section className="rounded-[12px] border border-amber-200 bg-amber-50/70 p-6 text-amber-900 shadow-sm">
          <p className="text-sm font-semibold">
            Budget tracker tables are not available yet.
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-800/90">
            Run the SQL in{" "}
            <span className="font-semibold">
              supabase/budget-tracker-schema.sql
            </span>{" "}
            first, then refresh this page.
          </p>
          {loadError ? (
            <p className="mt-3 text-xs text-amber-700">{loadError}</p>
          ) : null}
        </section>
      ) : null}

      {state.projectSetupOpen && state.canManageProjects ? (
        <BudgetTrackerSetupForm
          projects={state.localProjects}
          projectForm={state.projectForm}
          projectBudgetInput={state.projectBudgetInput}
          projectError={state.projectError}
          isPending={state.isPending}
          pendingAction={state.pendingAction}
          onBack={() => {
            state.setProjectSetupOpen(false);
            state.resetProjectForm();
          }}
          onSubmit={state.submitProject}
          onProjectFormChange={state.setProjectForm}
          onProjectBudgetChange={state.updateFormattedProjectBudget}
        />
      ) : null}

      {state.selectedProject && !state.projectSetupOpen && !showOverview ? (
        <section className="grid min-h-[calc(100vh-69px)]  xl:grid-cols-[minmax(0,1fr)_350px]">
          <BudgetTrackerBoard
            groups={state.groups}
            selectedProject={state.selectedProject}
            draggedItemId={state.draggedItemId}
            activeDropStatus={state.activeDropStatus}
            onAddItem={state.openNewItemModal}
            onDragStart={state.handleDragStart}
            onDragOver={state.handleDragOver}
            onDragEnd={state.handleDragEnd}
            onEditItem={state.openEditItemModal}
            canManageProjects={state.canManageProjects}
          />
          <BudgetTrackerSummaryPanel
            selectedProject={state.selectedProject}
            summary={state.summary}
            budgetHealthMessage={state.budgetHealthMessage}
          />
        </section>
      ) : null}

      {state.canManageProjects ? (
        <BudgetTrackerItemModal
          open={state.itemModalOpen}
          itemPanelVisible={state.itemPanelVisible}
          itemForm={state.itemForm}
          estimatedCostInput={state.estimatedCostInput}
          actualSpentInput={state.actualSpentInput}
          itemError={state.itemError}
          itemFieldErrors={state.itemFieldErrors}
          isPending={state.isPending}
          pendingAction={state.pendingAction}
          onClose={state.closeItemModal}
          onSubmit={state.submitItem}
          onRemove={state.removeItem}
          onItemFormChange={state.setItemForm}
          onEstimatedCostChange={state.updateFormattedEstimatedCost}
          onActualSpentChange={state.updateFormattedActualSpent}
        />
      ) : null}

      {state.canManageProjects ? (
        <BudgetTrackerDeleteProjectModal
          open={state.deleteProjectModalOpen}
          selectedProject={state.selectedProject}
          isPending={state.isPending}
          pendingAction={state.pendingAction}
          onClose={() => state.setDeleteProjectModalOpen(false)}
          onDelete={state.removeProject}
        />
      ) : null}

      <CostEstimatorConfirmModal
        open={showSaveDraftFirstConfirm}
        title="Save draft first?"
        description={
          saveDraftNextAction === "overview"
            ? "This project has unsaved changes. Save the draft first before returning to All Projects."
            : saveDraftNextAction === "switch-project"
              ? "This project has unsaved changes. Save the draft first before switching projects so ordering changes are not lost."
              : "This project has unsaved changes. Save the draft first before creating a new project so nothing gets lost."
        }
        confirmLabel="Save draft first"
        confirmTone="primary"
        pending={state.isPending}
        onConfirm={() => {
          setShowSaveDraftFirstConfirm(false);
          const nextAction = saveDraftNextAction;
          const nextProjectId = pendingProjectSwitchId;
          setSaveDraftNextAction(null);
          setPendingProjectSwitchId(null);
          state.handleSaveDraft(() => {
            if (nextAction === "overview") {
              setShowProjectOverview(true);
              return;
            }

            if (nextAction === "switch-project" && nextProjectId) {
              state.setSelectedProjectId(nextProjectId);
              setShowProjectOverview(false);
              return;
            }

            handleCreateProject();
          });
        }}
        onCancel={() => {
          setShowSaveDraftFirstConfirm(false);
          setSaveDraftNextAction(null);
          setPendingProjectSwitchId(null);
        }}
      />
    </div>
  );
}

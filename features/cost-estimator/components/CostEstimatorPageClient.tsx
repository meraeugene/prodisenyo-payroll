"use client";

import { useState } from "react";
import { LoaderCircle, Send } from "lucide-react";
import CostEstimatorBoard from "@/features/cost-estimator/components/CostEstimatorBoard";
import CostEstimatorConfirmModal from "@/features/cost-estimator/components/CostEstimatorConfirmModal";
import CostEstimatorDeleteProjectModal from "@/features/cost-estimator/components/CostEstimatorDeleteProjectModal";
import CostEstimatorHeader from "@/features/cost-estimator/components/CostEstimatorHeader";
import CostEstimatorItemModal from "@/features/cost-estimator/components/CostEstimatorItemModal";
import CostEstimatorProjectsOverview from "@/features/cost-estimator/components/CostEstimatorProjectsOverview";
import CostEstimatorSetupForm from "@/features/cost-estimator/components/CostEstimatorSetupForm";
import CostEstimatorSummaryPanel from "@/features/cost-estimator/components/CostEstimatorSummaryPanel";
import EstimateReportModal from "@/features/cost-estimator/components/EstimateReportModal";
import EstimateRejectedAlertModal from "@/features/cost-estimator/components/EstimateRejectedAlertModal";
import { useCostEstimatorPage } from "@/features/cost-estimator/hooks/useCostEstimatorPage";
import type {
  CostCatalogItemRow,
  AssignedEstimateProject,
  ProjectEstimateItemRow,
  ProjectEstimateRow,
} from "@/features/cost-estimator/types";

export default function CostEstimatorPageClient({
  estimates,
  items,
  catalogItems,
  initialProjectId,
  assignedProjects,
}: {
  estimates: ProjectEstimateRow[];
  items: ProjectEstimateItemRow[];
  catalogItems: CostCatalogItemRow[];
  initialProjectId: string;
  assignedProjects: AssignedEstimateProject[];
}) {
  const [pendingDeleteItemIndices, setPendingDeleteItemIndices] = useState<
    number[] | null
  >(null);
  const [showDeleteProjectConfirm, setShowDeleteProjectConfirm] =
    useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showSaveDraftFirstConfirm, setShowSaveDraftFirstConfirm] =
    useState(false);
  const [showProjectOverview, setShowProjectOverview] = useState(
    estimates.length > 0,
  );
  const [saveDraftNextAction, setSaveDraftNextAction] = useState<
    "new-project" | "overview" | null
  >(null);
  const state = useCostEstimatorPage({
    estimates,
    items,
    catalogItems,
    initialProjectId,
    assignedProjects,
  });
  const isSavingChanges = state.saveState === "saving";
  const isUiLocked = state.pendingEstimateAction || isSavingChanges;

  function handleRequestNewProject() {
    if (state.selectedEstimate && state.hasUnsavedEstimateChanges) {
      setSaveDraftNextAction("new-project");
      setShowSaveDraftFirstConfirm(true);
      return;
    }

    state.handleOpenNewProjectSetup();
  }

  function handleOpenProject(estimateId: string) {
    state.handleSelectEstimate(estimateId);
    setShowProjectOverview(false);
  }

  function handleRequestOpenOverview() {
    if (state.selectedEstimate && state.hasUnsavedEstimateChanges) {
      setSaveDraftNextAction("overview");
      setShowSaveDraftFirstConfirm(true);
      return;
    }

    setShowProjectOverview(true);
  }

  function handleConfirmDeleteItem() {
    if (!pendingDeleteItemIndices) return;
    state.handleRemoveItem(pendingDeleteItemIndices);
    setPendingDeleteItemIndices(null);
  }

  function handleRequestDeleteProject() {
    setShowDeleteProjectConfirm(true);
  }

  function handleRequestSubmitEstimate() {
    setShowSubmitConfirm(true);
  }

  if (state.projectSetupOpen) {
    return (
      <div>
        <CostEstimatorSetupForm
          hasExistingProjects={state.sortedEstimates.length > 0}
          form={state.estimateForm}
          assignedProjects={assignedProjects}
          errors={state.setupFormErrors}
          pending={state.pendingEstimateAction}
          onBack={state.handleCloseProjectSetup}
          onFieldChange={state.handleEstimateFieldChange}
          onSubmit={state.handleSaveEstimate}
        />
      </div>
    );
  }

  if (showProjectOverview && state.sortedEstimates.length > 0) {
    return (
      <>
        <CostEstimatorProjectsOverview
          estimates={state.sortedEstimates}
          itemsByEstimateId={state.itemsByEstimateId}
          pending={isUiLocked}
          onOpenProject={handleOpenProject}
          onCreateProject={handleRequestNewProject}
        />

        <EstimateRejectedAlertModal
          open={state.rejectionAlert !== null}
          projectName={state.rejectionAlert?.projectName ?? ""}
          rejectionReason={state.rejectionAlert?.rejectionReason ?? null}
          onClose={state.handleCloseRejectionAlert}
        />
      </>
    );
  }

  return (
    <div>
      <CostEstimatorHeader
        estimates={state.sortedEstimates}
        selectedEstimate={state.selectedEstimate}
        uiLocked={isUiLocked}
        pendingDeleteEstimate={state.pendingDeleteEstimate}
        pendingSaveEstimate={Boolean(
          state.pendingEstimateAction && state.pendingEstimateIntent === "save",
        )}
        saveState={state.saveState}
        saveMessage={state.saveMessage}
        onOpenProjects={handleRequestOpenOverview}
        onSelectEstimate={state.handleSelectEstimate}
        onSaveDraft={() => state.handleSaveEstimate()}
        onNewProject={handleRequestNewProject}
        onDeleteProject={handleRequestDeleteProject}
      />

      <section className="flex flex-col xl:grid xl:min-h-[calc(100vh-69px)] xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5 px-2 py-3 sm:px-5 sm:py-5">
          {state.selectedEstimate ? (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-apple-charcoal">
                  {state.selectedEstimate?.project_name}
                </h2>
                <p className="mt-2 text-sm text-apple-steel">
                  Build the full estimate breakdown here before sending it to
                  the CEO.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!state.isReadOnlyEstimate ? (
                  <button
                    type="button"
                    onClick={handleRequestSubmitEstimate}
                    disabled={isUiLocked}
                    className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-[#1f6a37] px-4 text-sm font-semibold text-white transition hover:bg-[#18552d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {state.pendingEstimateAction &&
                    state.pendingEstimateIntent === "submit" ? (
                      <>
                        <LoaderCircle size={15} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        Submit to CEO
                      </>
                    )}
                  </button>
                ) : state.selectedEstimate?.status === "rejected" ? (
                  <button
                    type="button"
                    onClick={state.handleReopenRejectedEstimate}
                    disabled={isUiLocked}
                    className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-[#1f6a37] px-4 text-sm font-semibold text-white transition hover:bg-[#18552d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {state.pendingEstimateAction &&
                    state.pendingEstimateIntent === "duplicate" ? (
                      <>
                        <LoaderCircle size={15} className="animate-spin" />
                        Opening editor...
                      </>
                    ) : (
                      "Edit project again"
                    )}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <CostEstimatorBoard
            estimate={state.selectedEstimate}
            form={state.estimateForm}
            readOnly={state.isReadOnlyEstimate}
            disabled={isUiLocked}
            onAddCost={state.handleOpenAddCostModal}
            onViewItem={state.handleViewItemModal}
            onEditItem={state.handleEditItemModal}
            onDeleteItem={setPendingDeleteItemIndices}
          />
        </div>

        <div className="mt-4 xl:mt-0">
          <CostEstimatorSummaryPanel
            estimate={state.selectedEstimate}
            costEstimate={state.plannedEstimateTotal}
            currentItemTotal={state.currentEstimateTotal}
            itemCount={state.estimateForm.items.length}
            totalQuantity={state.totalQuantity}
          />
        </div>
      </section>

      <CostEstimatorItemModal
        open={state.itemModalOpen}
        form={state.itemModalForm}
        errors={state.itemModalErrors}
        editingMaterialSnapshots={state.editingMaterialSnapshots}
        pendingMaterialRowId={state.pendingMaterialRowId}
        materials={state.materialOptions}
        computedTotal={state.currentLineTotal}
        editing={Boolean(
          !state.itemModalReadOnly &&
          state.editingItemIndices &&
          state.editingItemIndices.length > 0,
        )}
        readOnly={state.itemModalReadOnly}
        pending={state.pendingEstimateAction}
        onClose={state.handleCloseAddCostModal}
        onSelectMaterial={state.handleSelectMaterial}
        onSelectUnitType={state.handleSelectMaterialUnit}
        onFieldChange={state.handleItemModalFieldChange}
        onMaterialRowFieldChange={state.handleMaterialRowFieldChange}
        onAddMaterial={state.handleAddModalMaterial}
        onSaveMaterial={state.handleSaveModalMaterial}
        onEditMaterial={state.handleEditModalMaterial}
        onCancelMaterial={state.handleCancelModalMaterial}
        onRemoveMaterial={state.handleRemoveModalMaterial}
        onSave={state.handleSaveItem}
        onDelete={() => {
          if (state.editingItemIndices && state.editingItemIndices.length > 0) {
            state.handleRemoveItem(state.editingItemIndices);
          }
          state.handleCloseAddCostModal();
        }}
      />

      {state.activeReportEstimate ? (
        <EstimateReportModal
          estimate={state.activeReportEstimate}
          items={state.activeReportItems}
          onClose={() => state.setActiveReportEstimateId(null)}
        />
      ) : null}

      <CostEstimatorConfirmModal
        open={pendingDeleteItemIndices !== null}
        title="Delete item cost?"
        description="This will remove the selected item cost from the estimate breakdown."
        confirmLabel="Delete item cost"
        confirmTone="danger"
        pending={isUiLocked}
        onConfirm={handleConfirmDeleteItem}
        onCancel={() => setPendingDeleteItemIndices(null)}
      />

      <CostEstimatorDeleteProjectModal
        open={showDeleteProjectConfirm}
        selectedEstimate={state.selectedEstimate}
        pending={isUiLocked}
        onDelete={() => {
          setShowDeleteProjectConfirm(false);
          state.handleDeleteEstimate();
        }}
        onClose={() => setShowDeleteProjectConfirm(false)}
      />

      <CostEstimatorConfirmModal
        open={showSaveDraftFirstConfirm}
        title="Save draft first?"
        description={
          saveDraftNextAction === "overview"
            ? "This project has unsaved changes. Save the draft first before returning to Overall Projects."
            : "This project has unsaved changes. Save the draft first before creating a new project so nothing gets lost."
        }
        confirmLabel="Save draft first"
        confirmTone="primary"
        pending={isUiLocked}
        onConfirm={() => {
          setShowSaveDraftFirstConfirm(false);
          const nextAction = saveDraftNextAction;
          setSaveDraftNextAction(null);
          state.handleSaveEstimate(() => {
            if (nextAction === "overview") {
              setShowProjectOverview(true);
              return;
            }

            state.handleOpenNewProjectSetup();
          });
        }}
        onCancel={() => {
          setShowSaveDraftFirstConfirm(false);
          setSaveDraftNextAction(null);
        }}
      />

      <CostEstimatorConfirmModal
        open={showSubmitConfirm}
        title="Submit to CEO?"
        description="Once submitted, this estimate will no longer be editable. Make sure everything is finalized before sending it for review."
        confirmLabel="Submit to CEO"
        confirmTone="primary"
        pending={isUiLocked}
        onConfirm={() => {
          setShowSubmitConfirm(false);
          state.handleSubmitEstimate();
        }}
        onCancel={() => setShowSubmitConfirm(false)}
      />

      <EstimateRejectedAlertModal
        open={state.rejectionAlert !== null}
        projectName={state.rejectionAlert?.projectName ?? ""}
        rejectionReason={state.rejectionAlert?.rejectionReason ?? null}
        onClose={state.handleCloseRejectionAlert}
      />
    </div>
  );
}

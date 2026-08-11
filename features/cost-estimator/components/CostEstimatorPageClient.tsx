"use client";

import { useState } from "react";
import CostEstimatorBoqDetails from "@/features/cost-estimator/components/CostEstimatorBoqDetails";
import CostEstimatorConfirmModal from "@/features/cost-estimator/components/CostEstimatorConfirmModal";
import CostEstimatorDeleteProjectModal from "@/features/cost-estimator/components/CostEstimatorDeleteProjectModal";
import CostEstimatorDraftWorkspace from "@/features/cost-estimator/components/CostEstimatorDraftWorkspace";
import CostEstimatorItemModal from "@/features/cost-estimator/components/CostEstimatorItemModal";
import CostEstimatorProjectsOverview from "@/features/cost-estimator/components/CostEstimatorProjectsOverview";
import CostEstimatorSetupForm from "@/features/cost-estimator/components/CostEstimatorSetupForm";
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
    estimates.length > 0 || assignedProjects.length > 0,
  );
  const [saveDraftNextAction, setSaveDraftNextAction] = useState<
    "overview" | null
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

  function handleOpenProject(estimateId: string) {
    state.handleSelectEstimate(estimateId);
    setShowProjectOverview(false);
  }

  function handleStartEstimate(projectId: string) {
    state.handleOpenAssignedProjectSetup(projectId, () => {
      setShowProjectOverview(false);
    });
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
          hasExistingProjects={
            state.sortedEstimates.length > 0 || assignedProjects.length > 0
          }
          form={state.estimateForm}
          errors={state.setupFormErrors}
          pending={state.pendingEstimateAction}
          onBack={state.handleCloseProjectSetup}
          onFieldChange={state.handleEstimateFieldChange}
          onSubmit={state.handleSaveEstimate}
        />
      </div>
    );
  }

  if (showProjectOverview) {
    return (
      <>
        <CostEstimatorProjectsOverview
          estimates={state.sortedEstimates}
          assignedProjects={assignedProjects}
          itemsByEstimateId={state.itemsByEstimateId}
          pending={isUiLocked}
          onOpenProject={handleOpenProject}
          onStartEstimate={handleStartEstimate}
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

  if (state.selectedEstimate && state.isReadOnlyEstimate) {
    const selectedItems = state.itemsByEstimateId[state.selectedEstimate.id] ?? [];
    const linkedProject = state.selectedEstimate.project_id
      ? assignedProjects.find(
          (project) => project.id === state.selectedEstimate?.project_id,
        ) ?? null
      : null;

    return (
      <>
        <CostEstimatorBoqDetails
          estimate={state.selectedEstimate}
          items={selectedItems}
          budgetCeiling={linkedProject?.budgetCeiling ?? null}
          pending={isUiLocked}
          onBack={handleRequestOpenOverview}
          onViewReport={() =>
            state.setActiveReportEstimateId(state.selectedEstimate?.id ?? null)
          }
          onEdit={
            state.selectedEstimate.status === "rejected"
              ? state.handleReopenRejectedEstimate
              : undefined
          }
        />

        {state.activeReportEstimate ? (
          <EstimateReportModal
            estimate={state.activeReportEstimate}
            items={state.activeReportItems}
            onClose={() => state.setActiveReportEstimateId(null)}
          />
        ) : null}

        <EstimateRejectedAlertModal
          open={state.rejectionAlert !== null}
          projectName={state.rejectionAlert?.projectName ?? ""}
          rejectionReason={state.rejectionAlert?.rejectionReason ?? null}
          onClose={state.handleCloseRejectionAlert}
        />
      </>
    );
  }

  const draftLinkedProject = state.selectedEstimate?.project_id
    ? assignedProjects.find(
        (project) => project.id === state.selectedEstimate?.project_id,
      ) ?? null
    : null;
  const editingItemTotal =
    state.editingItemIndices?.reduce(
      (sum, index) =>
        sum + (state.estimateForm.items[index]?.lineTotal ?? 0),
      0,
    ) ?? 0;
  const groupedItemCount = new Set(
    state.estimateForm.items.map(
      (item) =>
        item.section.trim().toLowerCase() +
        "::" +
        item.itemNumber.trim().toLowerCase(),
    ),
  ).size;
  const modalItemNumber =
    state.editingItemIndices && state.editingItemIndices.length > 0
      ? String(Math.min(...state.editingItemIndices) + 1)
      : String(groupedItemCount + 1);

  return (
    <div>
      {state.selectedEstimate ? (
        <CostEstimatorDraftWorkspace
          estimate={state.selectedEstimate}
          form={state.estimateForm}
          linkedProject={draftLinkedProject}
          catalogItems={catalogItems}
          disabled={isUiLocked}
          saveMessage={state.saveMessage}
          submitting={
            state.pendingEstimateAction &&
            state.pendingEstimateIntent === "submit"
          }
          onBack={handleRequestOpenOverview}
          onFieldChange={state.handleEstimateFieldChange}
          onAdd={state.handleOpenAddCostModal}
          onEdit={state.handleEditItemModal}
          onDeleteItem={setPendingDeleteItemIndices}
          onSave={() => state.handleSaveEstimate()}
          onSubmit={handleRequestSubmitEstimate}
          onDeleteDraft={handleRequestDeleteProject}
        />
      ) : null}

      <CostEstimatorItemModal
        open={state.itemModalOpen}
        form={state.itemModalForm}
        errors={state.itemModalErrors}
        editingMaterialSnapshots={state.editingMaterialSnapshots}
        pendingMaterialRowId={state.pendingMaterialRowId}
        materials={state.materialOptions}
        computedTotal={state.currentLineTotal}
        baseEstimateTotal={state.currentEstimateTotal - editingItemTotal}
        budgetCeiling={draftLinkedProject?.budgetCeiling ?? null}
        itemNumberLabel={modalItemNumber}
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
          "This project has unsaved changes. Save the draft first before returning to the Cost Estimator dashboard."
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
            }
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

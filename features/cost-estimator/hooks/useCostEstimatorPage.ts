"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteProjectEstimateAction,
  getEngineerEstimateNotificationsAction,
  reopenRejectedEstimateAction,
  saveProjectEstimateDraftAction,
  submitProjectEstimateAction,
} from "@/actions/costEstimator";
import {
  EMPTY_ESTIMATE_FORM,
  EMPTY_ESTIMATE_ITEM_MODAL_FORM,
  type AssignedEstimateProject,
  type CostCatalogItemRow,
  type EstimateItemModalForm,
  type EstimateItemModalMaterialForm,
  type MaterialOptionGroup,
  type ProjectEstimateDraftForm,
  type ProjectEstimateDraftLine,
  type ProjectEstimateItemRow,
  type ProjectEstimateRow,
} from "@/features/cost-estimator/types";
import {
  buildEstimateDraftForm,
  buildEstimateItemModalForm,
  buildEstimateItemModalFormFromItems,
  buildEstimateItemsMap,
  buildInitialModalMaterial,
  ensureEstimateLineTotals,
  sortEstimatesByUpdatedAt,
} from "@/features/cost-estimator/utils/costEstimatorMappers";
import {
  parseBudgetNumberInput,
  sanitizeBudgetNumericInput,
} from "@/features/cost-estimator/utils/costEstimatorFormatters";
import {
  buildMaterialIdFromName,
  normalizeMaterialOptions,
} from "@/features/cost-estimator/utils/materialSourceAdapter";

interface UseCostEstimatorPageOptions {
  estimates: ProjectEstimateRow[];
  items: ProjectEstimateItemRow[];
  catalogItems: CostCatalogItemRow[];
  initialProjectId?: string;
  assignedProjects: AssignedEstimateProject[];
}

type SetupFormErrors = Partial<
  Record<
    "projectId" | "projectName" | "projectType" | "location" | "ownerName" | "costEstimate",
    string
  >
>;

type ItemModalErrors = {
  displayName?: string;
  materialRows: Record<
    string,
    Partial<Record<"searchInput" | "unitType" | "quantityInput", string>>
  >;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function buildDisplayName(baseName: string) {
  return baseName;
}

function setCostEstimatorModalScrollEnabled(enabled: boolean) {
  if (typeof document === "undefined") return;

  [document.body, document.documentElement].forEach((element) => {
    if (enabled) {
      element.classList.add("overflow-hidden");
      element.classList.remove("overflow-y-auto");
    } else {
      element.classList.remove("overflow-hidden");
      element.classList.remove("overflow-y-auto");
    }
  });
}

function validateModalMaterial(
  material: EstimateItemModalMaterialForm,
  materialOptions: ReturnType<typeof normalizeMaterialOptions>,
) {
  const quantityValue = parseBudgetNumberInput(material.quantityInput);
  const unitCostValue = parseBudgetNumberInput(material.unitCostInput);
  const resolvedMaterial =
    materialOptions.find(
      (option) => option.materialId === material.materialId,
    ) ?? null;
  const resolvedUnit =
    resolvedMaterial?.units.find(
      (entry) => entry.catalogItemId === material.catalogItemId,
    ) ??
    resolvedMaterial?.units[0] ??
    null;

  if (
    (!material.materialName.trim() && !material.searchInput.trim()) ||
    !material.unitType.trim()
  ) {
    throw new Error("Select a material and unit type before saving it.");
  }
  if (quantityValue <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  return {
    quantityValue,
    unitCostValue,
    resolvedMaterial,
    resolvedUnit,
  };
}

export function useCostEstimatorPage({
  estimates: initialEstimates,
  items: initialItems,
  catalogItems,
  initialProjectId = "",
  assignedProjects,
}: UseCostEstimatorPageOptions) {
  const initialItemsMap = useMemo(
    () => buildEstimateItemsMap(initialItems),
    [initialItems],
  );
  const initialLinkedEstimate =
    initialProjectId
      ? initialEstimates.find((estimate) => estimate.project_id === initialProjectId) ?? null
      : null;
  const [estimates, setEstimates] = useState(initialEstimates);
  const [itemsByEstimateId, setItemsByEstimateId] = useState(initialItemsMap);
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(
    initialLinkedEstimate?.id ?? initialEstimates[0]?.id ?? null,
  );
  const [estimateForm, setEstimateForm] = useState<ProjectEstimateDraftForm>(
    () => {
      if (initialLinkedEstimate) {
        return buildEstimateDraftForm(
          initialLinkedEstimate,
          initialItemsMap[initialLinkedEstimate.id] ?? [],
        );
      }

      return buildEstimateDraftForm(
        initialEstimates[0] ?? null,
        initialItemsMap[initialEstimates[0]?.id ?? ""] ?? [],
      );
    },
  );
  const [projectSetupOpen, setProjectSetupOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemModalForm, setItemModalForm] = useState<EstimateItemModalForm>(
    EMPTY_ESTIMATE_ITEM_MODAL_FORM,
  );
  const [itemModalReadOnly, setItemModalReadOnly] = useState(false);
  const [editingItemIndices, setEditingItemIndices] = useState<number[] | null>(
    null,
  );
  const [activeReportEstimateId, setActiveReportEstimateId] = useState<
    string | null
  >(null);
  const [pendingEstimateAction, startEstimateTransition] = useTransition();
  const [pendingEstimateIntent, setPendingEstimateIntent] = useState<
    "save" | "submit" | "delete" | "duplicate" | null
  >(null);
  const [pendingDeleteEstimate, setPendingDeleteEstimate] = useState(false);
  const [saveState, setSaveState] = useState<
    "saved" | "dirty" | "saving" | "error"
  >("saved");
  const [saveMessage, setSaveMessage] = useState("Draft saved");
  const [setupFormErrors, setSetupFormErrors] = useState<SetupFormErrors>({});
  const [itemModalErrors, setItemModalErrors] = useState<ItemModalErrors>({
    materialRows: {},
  });
  const [customMaterialOptions, setCustomMaterialOptions] = useState<
    MaterialOptionGroup[]
  >([]);
  const [editingMaterialSnapshots, setEditingMaterialSnapshots] = useState<
    Record<string, EstimateItemModalMaterialForm>
  >({});
  const [pendingMaterialRowId, setPendingMaterialRowId] = useState<
    string | null
  >(null);
  const [rejectionAlert, setRejectionAlert] = useState<{
    estimateId: string;
    projectName: string;
    rejectionReason: string | null;
  } | null>(null);
  const pendingExternalSyncRef = useRef(false);
  const knownRejectionTimesRef = useRef<Record<string, string>>({});
  const canPlayNotificationSoundRef = useRef(false);

  useEffect(() => {
    setEstimates(initialEstimates);
  }, [initialEstimates]);

  useEffect(() => {
    setItemsByEstimateId(initialItemsMap);
  }, [initialItemsMap]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.sessionStorage.getItem(
        "cost-estimator:seen-rejection-times",
      );
      if (!raw) return;

      const parsed = JSON.parse(raw) as Record<string, string>;
      knownRejectionTimesRef.current = parsed;
    } catch {
      knownRejectionTimesRef.current = {};
    }
  }, []);

  function syncFromIncomingEstimates() {
    const refreshedSelectedEstimate =
      initialEstimates.find((estimate) => estimate.id === selectedEstimateId) ??
      null;
    const fallbackEstimate = initialEstimates[0] ?? null;
    const nextSelectedEstimate = refreshedSelectedEstimate ?? fallbackEstimate;

    setSelectedEstimateId(nextSelectedEstimate?.id ?? null);
    setEstimateForm(
      buildEstimateDraftForm(
        nextSelectedEstimate,
        initialItemsMap[nextSelectedEstimate?.id ?? ""] ?? [],
      ),
    );
  }

  useEffect(() => {
    if (projectSetupOpen || itemModalOpen) {
      pendingExternalSyncRef.current = true;
      return;
    }

    pendingExternalSyncRef.current = false;
    syncFromIncomingEstimates();
  }, [initialEstimates, initialItemsMap]);

  useEffect(() => {
    if (projectSetupOpen || itemModalOpen || !pendingExternalSyncRef.current) {
      return;
    }

    pendingExternalSyncRef.current = false;
    syncFromIncomingEstimates();
  }, [itemModalOpen, projectSetupOpen]);

  const materialOptions = useMemo(() => {
    const normalized = normalizeMaterialOptions(catalogItems);
    const merged = [...normalized];

    customMaterialOptions.forEach((customMaterial) => {
      const existing = merged.find(
        (entry) => entry.materialId === customMaterial.materialId,
      );
      if (existing) {
        customMaterial.units.forEach((unit) => {
          const duplicate = existing.units.some(
            (entry) => entry.catalogItemId === unit.catalogItemId,
          );
          if (!duplicate) {
            existing.units.push(unit);
          }
        });
        return;
      }

      merged.push(customMaterial);
    });

    return merged.sort((left, right) =>
      left.materialName.localeCompare(right.materialName),
    );
  }, [catalogItems, customMaterialOptions]);
  const sortedEstimates = useMemo(
    () => sortEstimatesByUpdatedAt(estimates),
    [estimates],
  );
  const selectedEstimate =
    sortedEstimates.find((estimate) => estimate.id === selectedEstimateId) ??
    null;
  const persistedSelectedEstimateForm = useMemo(
    () =>
      buildEstimateDraftForm(
        selectedEstimate,
        itemsByEstimateId[selectedEstimate?.id ?? ""] ?? [],
      ),
    [itemsByEstimateId, selectedEstimate],
  );
  const activeReportEstimate =
    sortedEstimates.find(
      (estimate) => estimate.id === activeReportEstimateId,
    ) ?? null;
  const activeReportItems = activeReportEstimate
    ? (itemsByEstimateId[activeReportEstimate.id] ?? [])
    : [];
  const isReadOnlyEstimate =
    selectedEstimate !== null && selectedEstimate.status !== "draft";
  const derivedEstimateTotal = useMemo(
    () =>
      round2(estimateForm.items.reduce((sum, item) => sum + item.lineTotal, 0)),
    [estimateForm.items],
  );
  const currentEstimateTotal = derivedEstimateTotal;
  const plannedEstimateTotal = estimateForm.costEstimate;
  const totalQuantity = useMemo(
    () =>
      round2(estimateForm.items.reduce((sum, item) => sum + item.quantity, 0)),
    [estimateForm.items],
  );
  const currentLineTotal = useMemo(
    () =>
      round2(
        itemModalForm.materials.reduce(
          (sum, item) =>
            sum +
            parseBudgetNumberInput(item.unitCostInput) *
              parseBudgetNumberInput(item.quantityInput),
          0,
        ),
      ),
    [itemModalForm.materials],
  );
  const hasUnsavedEstimateChanges = useMemo(() => {
    if (!selectedEstimate || selectedEstimate.status !== "draft") {
      return false;
    }

    const normalizeForm = (form: ProjectEstimateDraftForm) => ({
      projectName: form.projectName.trim(),
      projectId: form.projectId,
      projectType: form.projectType || "",
      location: form.location.trim(),
      ownerName: form.ownerName.trim(),
      costEstimate: round2(form.costEstimate),
      notes: form.notes.trim(),
      items: [...form.items]
        .map((item) => ({
          id: item.id ?? "",
          catalogItemId: item.catalogItemId,
          materialId: item.materialId,
          materialName: item.materialName.trim(),
          unitType: item.unitType.trim(),
          unitCost: round2(item.unitCost),
          quantity: round2(item.quantity),
          lineTotal: round2(item.lineTotal),
          displayName: item.displayName.trim(),
          notes: item.notes.trim(),
          sortOrder: item.sortOrder,
        }))
        .sort((left, right) => left.sortOrder - right.sortOrder),
    });

    return (
      JSON.stringify(normalizeForm(estimateForm)) !==
      JSON.stringify(normalizeForm(persistedSelectedEstimateForm))
    );
  }, [estimateForm, persistedSelectedEstimateForm, selectedEstimate]);

  useEffect(() => {
    if (!selectedEstimate || selectedEstimate.status !== "draft") {
      setSaveState("saved");
      setSaveMessage("Draft saved");
      return;
    }

    if (hasUnsavedEstimateChanges) {
      setSaveState("dirty");
      setSaveMessage("Unsaved changes");
      return;
    }

    setSaveState("saved");
    setSaveMessage("Draft saved");
  }, [hasUnsavedEstimateChanges, selectedEstimate]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      canPlayNotificationSoundRef.current = true;
    }, 1000);

    let cancelled = false;

    async function loadEstimateNotifications() {
      if (cancelled || document.hidden) return;

      try {
        const response = await getEngineerEstimateNotificationsAction();
        if (cancelled) return;

        const incomingById = new Map(
          response.estimates.map((estimate) => [estimate.id, estimate]),
        );

        setEstimates((current) =>
          sortEstimatesByUpdatedAt(
            current.map((estimate) => {
              const incoming = incomingById.get(estimate.id);
              if (!incoming) return estimate;

              return {
                ...estimate,
                status: incoming.status,
                rejection_reason: incoming.rejection_reason,
                rejected_at: incoming.rejected_at,
                updated_at: incoming.updated_at,
              };
            }),
          ),
        );

        const latestFreshRejection = response.estimates
          .filter(
            (estimate) =>
              estimate.status === "rejected" && estimate.rejected_at,
          )
          .sort(
            (left, right) =>
              new Date(right.rejected_at as string).getTime() -
              new Date(left.rejected_at as string).getTime(),
          )
          .find((estimate) => {
            const known = knownRejectionTimesRef.current[estimate.id];
            return (
              !known ||
              new Date(estimate.rejected_at as string).getTime() >
                new Date(known).getTime()
            );
          });

        response.estimates.forEach((estimate) => {
          if (estimate.rejected_at) {
            knownRejectionTimesRef.current[estimate.id] = estimate.rejected_at;
          }
        });

        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            "cost-estimator:seen-rejection-times",
            JSON.stringify(knownRejectionTimesRef.current),
          );
        }

        if (latestFreshRejection) {
          setRejectionAlert({
            estimateId: latestFreshRejection.id,
            projectName: latestFreshRejection.project_name,
            rejectionReason: latestFreshRejection.rejection_reason,
          });

          if (canPlayNotificationSoundRef.current) {
            const audio = new Audio("/sounds/overtime-approval.mp3");
            audio.volume = 0.9;
            void audio.play().catch(() => undefined);
          }
        }
      } catch {
        // Keep polling silent during editing so intermittent failures do not disrupt work.
      }
    }

    void loadEstimateNotifications();

    const intervalId = window.setInterval(() => {
      void loadEstimateNotifications();
    }, 30000);

    function handleWindowFocus() {
      void loadEstimateNotifications();
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        void loadEstimateNotifications();
      }
    }

    function handlePageShow() {
      void loadEstimateNotifications();
    }

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  function applyEstimateUpdate(
    estimate: ProjectEstimateRow,
    items: ProjectEstimateItemRow[],
  ) {
    setEstimates((current) => {
      const existing = current.some((entry) => entry.id === estimate.id);
      const next = existing
        ? current.map((entry) => (entry.id === estimate.id ? estimate : entry))
        : [estimate, ...current];
      return sortEstimatesByUpdatedAt(next);
    });
    setItemsByEstimateId((current) => ({
      ...current,
      [estimate.id]: items,
    }));
    setSelectedEstimateId(estimate.id);
    setEstimateForm(buildEstimateDraftForm(estimate, items));
    setProjectSetupOpen(false);
  }

  function selectEstimateLocally(estimateId: string) {
    const estimate =
      sortedEstimates.find((entry) => entry.id === estimateId) ?? null;
    setSelectedEstimateId(estimateId);
    setEstimateForm(
      buildEstimateDraftForm(estimate, itemsByEstimateId[estimateId] ?? []),
    );
    setProjectSetupOpen(false);
  }

  function handleSelectEstimate(estimateId: string) {
    if (estimateId === selectedEstimateId) {
      return;
    }

    if (!selectedEstimate || !hasUnsavedEstimateChanges) {
      selectEstimateLocally(estimateId);
      return;
    }

    toast.error("Save your draft before switching projects.");
  }

  function handleOpenAssignedProjectSetup(projectId: string) {
    const assignedProject = assignedProjects.find(
      (project) => project.id === projectId,
    );
    if (!assignedProject) {
      toast.error("This project is no longer assigned to you for estimating.");
      return;
    }

    setSelectedEstimateId(null);
    setEstimateForm({
      ...EMPTY_ESTIMATE_FORM,
      projectId: assignedProject.id,
      projectName: assignedProject.name,
      location: assignedProject.location,
      ownerName: assignedProject.clientName || assignedProject.lead || "",
      costEstimate: assignedProject.budgetCeiling,
      draftedDate: new Date().toISOString(),
    });
    setSetupFormErrors({});
    setProjectSetupOpen(true);
    setItemModalOpen(false);
  }

  function handleCloseProjectSetup() {
    if (selectedEstimate) {
      setEstimateForm(
        buildEstimateDraftForm(
          selectedEstimate,
          itemsByEstimateId[selectedEstimate.id] ?? [],
        ),
      );
      setProjectSetupOpen(false);
      return;
    }

    if (sortedEstimates[0]) {
      handleSelectEstimate(sortedEstimates[0].id);
      return;
    }

    setProjectSetupOpen(false);
  }

  function handleEstimateFieldChange(
    field: Exclude<keyof ProjectEstimateDraftForm, "items" | "id">,
    value: string,
  ) {
    if (
      field === "projectName" ||
      field === "projectId" ||
      field === "projectType" ||
      field === "location" ||
      field === "ownerName" ||
      field === "costEstimate"
    ) {
      setSetupFormErrors((current) => {
        const { [field]: _removed, ...rest } = current;
        return rest;
      });
    }

    setEstimateForm((current) => {
      if (field === "projectId") {
        const selectedProject = assignedProjects.find((project) => project.id === value);
        return {
          ...current,
          projectId: value,
          projectName: selectedProject?.name ?? "",
          location: selectedProject?.location ?? "",
          ownerName: selectedProject?.clientName || selectedProject?.lead || current.ownerName,
          costEstimate: selectedProject?.budgetCeiling || current.costEstimate,
        };
      }

      if (field === "costEstimate") {
        return {
          ...current,
          costEstimate: parseBudgetNumberInput(value),
        };
      }

      return {
        ...current,
        [field]: value,
      };
    });
  }

  async function persistDraft(shouldSubmit: boolean) {
    const nextForm = ensureEstimateLineTotals(estimateForm);
    const saved = await saveProjectEstimateDraftAction({
      id: nextForm.id,
      projectId: nextForm.projectId,
      projectName: nextForm.projectName,
      projectType: nextForm.projectType,
      location: nextForm.location,
      ownerName: nextForm.ownerName,
      costEstimate: nextForm.costEstimate,
      notes: nextForm.notes,
      items: nextForm.items.map((item) => ({
        id: item.id,
        catalogItemId: item.catalogItemId,
        materialName: item.materialName,
        unitType: item.unitType,
        unitCost: item.unitCost,
        quantity: item.quantity,
        displayName: item.displayName,
        notes: item.notes,
        sortOrder: item.sortOrder,
      })),
    });

    applyEstimateUpdate(saved.estimate, saved.items);

    if (!shouldSubmit) {
      return saved;
    }

    const submitted = await submitProjectEstimateAction(saved.estimate.id);
    applyEstimateUpdate(submitted.estimate, submitted.items);
    toast.success("Estimate submitted for CEO review.");
    return submitted;
  }

  function handleSaveEstimate(onSuccess?: () => void) {
    if (projectSetupOpen) {
      const nextErrors = validateSetupForm(estimateForm);
      if (Object.keys(nextErrors).length > 0) {
        setSetupFormErrors(nextErrors);
        return;
      }
    }

    setPendingEstimateIntent("save");
    setSaveState("saving");
    setSaveMessage("Saving draft...");
    startEstimateTransition(async () => {
      try {
        await persistDraft(false);
        setSetupFormErrors({});
        setSaveState("saved");
        setSaveMessage("Draft saved");
        toast.success(
          projectSetupOpen ? "Project estimate created." : "Draft saved.",
        );
        onSuccess?.();
      } catch (error) {
        setSaveState("error");
        setSaveMessage("Unable to save draft");
        toast.error(
          error instanceof Error ? error.message : "Failed to save estimate.",
        );
      } finally {
        setPendingEstimateIntent(null);
      }
    });
  }

  function handleSubmitEstimate() {
    setPendingEstimateIntent("submit");
    startEstimateTransition(async () => {
      try {
        if (hasUnsavedEstimateChanges) {
          setSaveState("saving");
          setSaveMessage("Saving draft...");
        }
        await persistDraft(true);
        setSaveState("saved");
        setSaveMessage("Draft saved");
      } catch (error) {
        setSaveState("error");
        setSaveMessage("Unable to submit estimate");
        toast.error(
          error instanceof Error ? error.message : "Failed to submit estimate.",
        );
      } finally {
        setPendingEstimateIntent(null);
      }
    });
  }

  function handleDeleteEstimate() {
    if (!selectedEstimate) return;

    setPendingDeleteEstimate(true);
    setPendingEstimateIntent("delete");
    startEstimateTransition(async () => {
      try {
        await deleteProjectEstimateAction(selectedEstimate.id);
        setEstimates((current) =>
          current.filter((estimate) => estimate.id !== selectedEstimate.id),
        );
        setItemsByEstimateId((current) => {
          const { [selectedEstimate.id]: _removed, ...rest } = current;
          return rest;
        });
        const nextEstimate = sortedEstimates.find(
          (estimate) => estimate.id !== selectedEstimate.id,
        );
        if (nextEstimate) {
          setSelectedEstimateId(nextEstimate.id);
          setEstimateForm(
            buildEstimateDraftForm(
              nextEstimate,
              itemsByEstimateId[nextEstimate.id] ?? [],
            ),
          );
          setProjectSetupOpen(false);
        } else {
          setSelectedEstimateId(null);
          setEstimateForm(EMPTY_ESTIMATE_FORM);
          setProjectSetupOpen(true);
        }
        toast.success("Estimate deleted.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete estimate.",
        );
      } finally {
        setPendingDeleteEstimate(false);
        setPendingEstimateIntent(null);
      }
    });
  }

  function handleReopenRejectedEstimate() {
    if (!selectedEstimate) return;

    setPendingEstimateIntent("duplicate");
    startEstimateTransition(async () => {
      try {
        const reopened = await reopenRejectedEstimateAction(
          selectedEstimate.id,
        );
        applyEstimateUpdate(reopened.estimate, reopened.items);
        delete knownRejectionTimesRef.current[selectedEstimate.id];
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            "cost-estimator:seen-rejection-times",
            JSON.stringify(knownRejectionTimesRef.current),
          );
        }
        setRejectionAlert((current) =>
          current?.estimateId === selectedEstimate.id ? null : current,
        );
        setSaveState("saved");
        setSaveMessage("Draft saved");
        toast.success("Returned estimate reopened for editing.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to reopen estimate.",
        );
      } finally {
        setPendingEstimateIntent(null);
      }
    });
  }

  function handleOpenAddCostModal() {
    setCostEstimatorModalScrollEnabled(true);
    setItemModalReadOnly(false);
    setEditingMaterialSnapshots({});
    const initialMaterial = buildInitialModalMaterial(materialOptions);

    setItemModalForm({
      ...EMPTY_ESTIMATE_ITEM_MODAL_FORM,
      displayName: "",
      materials: [initialMaterial],
    });
    setItemModalErrors({ materialRows: {} });
    setEditingItemIndices(null);
    setItemModalOpen(true);
  }

  function handleCloseAddCostModal() {
    setCostEstimatorModalScrollEnabled(false);
    setItemModalOpen(false);
    setEditingItemIndices(null);
    setItemModalForm(EMPTY_ESTIMATE_ITEM_MODAL_FORM);
    setItemModalReadOnly(false);
    setEditingMaterialSnapshots({});
    setItemModalErrors({ materialRows: {} });
  }

  function handleOpenItemGroupModal(indices: number[], readOnly: boolean) {
    setCostEstimatorModalScrollEnabled(true);
    setItemModalReadOnly(readOnly);

    const groupItems = indices
      .map((index) => estimateForm.items[index])
      .filter(Boolean);

    if (groupItems.length === 0) return;

    const modalForm = buildEstimateItemModalFormFromItems(groupItems);
    const firstMaterial = modalForm.materials[0] ?? null;

    setItemModalForm(
      readOnly || !firstMaterial
        ? modalForm
        : {
            ...modalForm,
            materials: modalForm.materials.map((material, index) => ({
              ...material,
              saved: index === 0 ? false : true,
            })),
          },
    );
    setEditingItemIndices(indices);
    setItemModalOpen(true);
    setItemModalErrors({ materialRows: {} });
    setEditingMaterialSnapshots(
      readOnly || !firstMaterial
        ? {}
        : {
            [firstMaterial.id]: {
              ...firstMaterial,
              saved: true,
            },
          },
    );
  }

  function handleViewItemModal(indices: number[]) {
    handleOpenItemGroupModal(indices, true);
  }

  function handleEditItemModal(indices: number[]) {
    handleOpenItemGroupModal(indices, false);
  }

  function findMaterial(materialId: string) {
    return (
      materialOptions.find((option) => option.materialId === materialId) ?? null
    );
  }

  function updateModalMaterial(
    materialRowId: string,
    updater: (
      current: EstimateItemModalMaterialForm,
    ) => EstimateItemModalMaterialForm,
  ) {
    setItemModalForm((current) => ({
      ...current,
      materials: current.materials.map((material) =>
        material.id === materialRowId ? updater(material) : material,
      ),
    }));
  }

  function handleSelectMaterial(materialRowId: string, materialId: string) {
    const material = findMaterial(materialId);
    const unit = material?.units[0] ?? null;

    updateModalMaterial(materialRowId, (current) => ({
      ...current,
      searchInput: material?.materialName ?? current.searchInput,
      materialId: material?.materialId ?? "",
      materialName: material?.materialName ?? "",
      catalogItemId: unit?.catalogItemId ?? "",
      unitType: unit?.unitType ?? "",
      rawCostLabel: unit?.rawCostLabel ?? "N/A",
      unitCostInput: unit ? unit.unitCost.toString() : "",
    }));
  }

  function handleSelectMaterialUnit(
    materialRowId: string,
    catalogItemId: string,
  ) {
    const currentMaterial = itemModalForm.materials.find(
      (item) => item.id === materialRowId,
    );
    const material = findMaterial(currentMaterial?.materialId ?? "");
    const allUnits = materialOptions.flatMap((entry) => entry.units);
    const unit = material
      ? (material.units.find(
          (entry) => entry.catalogItemId === catalogItemId,
        ) ??
        material.units[0] ??
        null)
      : (allUnits.find((entry) => entry.catalogItemId === catalogItemId) ??
        null);

    updateModalMaterial(materialRowId, (current) => ({
      ...current,
      catalogItemId: unit?.catalogItemId ?? "",
      unitType: unit?.unitType ?? current.unitType,
      rawCostLabel: unit?.rawCostLabel ?? current.rawCostLabel,
      unitCostInput:
        current.materialId && unit
          ? unit.unitCost.toString()
          : current.unitCostInput,
    }));
  }

  function handleItemModalFieldChange(
    field: Exclude<keyof EstimateItemModalForm, "materials" | "id">,
    value: string,
  ) {
    if (field === "displayName") {
      setItemModalErrors((current) => ({
        ...current,
        displayName: undefined,
      }));
    }

    setItemModalForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleMaterialRowFieldChange(
    materialRowId: string,
    field: "searchInput" | "unitType" | "unitCostInput" | "quantityInput" | "pricingBasis" | "referenceSupplier" | "referenceQuotation",
    value: string,
  ) {
    if (
      field === "searchInput" ||
      field === "unitType" ||
      field === "quantityInput"
    ) {
      setItemModalErrors((current) => ({
        ...current,
        materialRows: {
          ...current.materialRows,
          [materialRowId]: {
            ...current.materialRows[materialRowId],
            [field]: undefined,
          },
        },
      }));
    }

    updateModalMaterial(materialRowId, (current) => ({
      ...current,
      ...(field === "searchInput"
        ? {
            searchInput: value,
            materialId: "",
            materialName: "",
            catalogItemId: "",
          }
        : field === "unitType"
          ? {
              unitType: value,
              catalogItemId: "",
            }
          : {
              [field]: sanitizeBudgetNumericInput(value),
            }),
    }));
  }

  function handleAddModalMaterial() {
    setItemModalForm((current) => ({
      ...current,
      materials: [
        ...current.materials,
        buildInitialModalMaterial(materialOptions),
      ],
    }));
  }

  function handleSaveModalMaterial(materialRowId: string) {
    void (async () => {
      try {
        setPendingMaterialRowId(materialRowId);
        const material = itemModalForm.materials.find(
          (entry) => entry.id === materialRowId,
        );
        if (!material) return;

        const quantityValue = parseBudgetNumberInput(material.quantityInput);
        const unitCostValue = parseBudgetNumberInput(material.unitCostInput);
        const matchedExistingMaterial =
          !material.materialId && material.searchInput.trim()
            ? (materialOptions.find(
                (entry) =>
                  entry.materialName.toLowerCase() ===
                  material.searchInput.trim().toLowerCase(),
              ) ?? null)
            : null;

        if (!material.searchInput.trim()) {
          throw new Error("Material name is required.");
        }
        if (!material.unitType.trim()) {
          throw new Error("Select a unit type before saving the material.");
        }
        if (quantityValue <= 0) {
          throw new Error("Quantity must be greater than zero.");
        }

        if (matchedExistingMaterial) {
          const matchedUnit =
            matchedExistingMaterial.units.find(
              (entry) =>
                entry.unitType.toLowerCase() ===
                material.unitType.trim().toLowerCase(),
            ) ??
            matchedExistingMaterial.units[0] ??
            null;

          updateModalMaterial(materialRowId, (current) => ({
            ...current,
            saved: true,
            searchInput: matchedExistingMaterial.materialName,
            materialId: matchedExistingMaterial.materialId,
            materialName: matchedExistingMaterial.materialName,
            catalogItemId: matchedUnit?.catalogItemId ?? "",
            unitType: material.unitType,
            rawCostLabel: matchedUnit?.rawCostLabel ?? current.rawCostLabel,
          }));
        } else if (!material.materialId) {
          const customMaterialId = buildMaterialIdFromName(
            material.searchInput.trim(),
          );
          const customCatalogItemId = `${customMaterialId}:${material.unitType
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")}`;
          const customOption: MaterialOptionGroup = {
            materialId: customMaterialId,
            materialName: material.searchInput.trim(),
            searchText:
              `${material.searchInput.trim()} ${material.unitType}`.toLowerCase(),
            units: [
              {
                optionId: customCatalogItemId,
                catalogItemId: customCatalogItemId,
                unitType: material.unitType.trim(),
                unitCost: unitCostValue,
                rawCostLabel: unitCostValue.toString(),
                category: "materials",
                notes: "Added from cost estimator",
              },
            ],
          };

          setCustomMaterialOptions((current) => {
            const withoutDuplicate = current.filter(
              (entry) =>
                entry.materialName.toLowerCase() !==
                customOption.materialName.toLowerCase(),
            );
            return [...withoutDuplicate, customOption];
          });

          updateModalMaterial(materialRowId, (current) => ({
            ...current,
            saved: true,
            searchInput: customOption.materialName,
            materialId: customOption.materialId,
            materialName: customOption.materialName,
            catalogItemId: customCatalogItemId,
            unitType: material.unitType.trim(),
            rawCostLabel: unitCostValue.toString(),
          }));
          toast.success("Material saved.");
        } else {
          const { resolvedMaterial, resolvedUnit } = validateModalMaterial(
            material,
            materialOptions,
          );

          updateModalMaterial(materialRowId, (current) => ({
            ...current,
            saved: true,
            materialName:
              current.materialName ||
              resolvedMaterial?.materialName ||
              current.searchInput,
            unitType: current.unitType || resolvedUnit?.unitType || "",
          }));
        }

        setEditingMaterialSnapshots((current) => {
          const { [materialRowId]: _removed, ...rest } = current;
          return rest;
        });
        setItemModalForm((current) => {
          const hasAnotherUnsavedMaterial = current.materials.some(
            (entry) => !entry.saved && entry.id !== materialRowId,
          );

          if (hasAnotherUnsavedMaterial) {
            return current;
          }

          return {
            ...current,
            materials: [
              buildInitialModalMaterial(materialOptions),
              ...current.materials,
            ],
          };
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save material.",
        );
      } finally {
        setPendingMaterialRowId(null);
      }
    })();
  }

  function handleEditModalMaterial(materialRowId: string) {
    const targetMaterial =
      itemModalForm.materials.find(
        (material) => material.id === materialRowId,
      ) ?? null;

    if (!targetMaterial) {
      return;
    }

    const targetSnapshot = editingMaterialSnapshots[materialRowId] ?? {
      ...targetMaterial,
      saved: true,
    };

    setEditingMaterialSnapshots({
      [materialRowId]: targetSnapshot,
    });

    setItemModalForm((current) => {
      const hasTarget = current.materials.some(
        (material) => material.id === materialRowId,
      );

      if (!hasTarget) {
        return current;
      }

      return {
        ...current,
        materials: current.materials.reduce<EstimateItemModalMaterialForm[]>(
          (nextMaterials, material) => {
            if (material.id === materialRowId) {
              nextMaterials.push({
                ...material,
                saved: false,
              });
              return nextMaterials;
            }

            if (material.saved) {
              nextMaterials.push({
                ...material,
                saved: true,
              });
              return nextMaterials;
            }

            const snapshot = editingMaterialSnapshots[material.id];

            if (snapshot) {
              nextMaterials.push({
                ...snapshot,
                saved: true,
              });
            }

            return nextMaterials;
          },
          [],
        ),
      };
    });
  }

  function validateSetupForm(form: ProjectEstimateDraftForm) {
    const errors: SetupFormErrors = {};

    if (!form.projectId) {
      errors.projectId = "Select an assigned project.";
    }

    if (!form.projectName.trim()) {
      errors.projectName = "Project name is required.";
    }

    if (!form.projectType) {
      errors.projectType = "Project type is required.";
    }

    if (!form.location.trim()) {
      errors.location = "Location is required.";
    }

    if (!form.ownerName.trim()) {
      errors.ownerName = "Owner is required.";
    }

    if (round2(form.costEstimate) <= 0) {
      errors.costEstimate = "Cost estimate must be greater than zero.";
    }

    return errors;
  }

  function handleCancelModalMaterial(materialRowId: string) {
    const snapshot = editingMaterialSnapshots[materialRowId];

    if (snapshot) {
      setItemModalForm((current) => {
        const restoredMaterials = current.materials.map((material) =>
          material.id === materialRowId
            ? { ...snapshot, saved: true }
            : material,
        );
        const hasUnsavedMaterial = restoredMaterials.some(
          (material) => !material.saved,
        );

        return {
          ...current,
          materials: hasUnsavedMaterial
            ? restoredMaterials
            : [
                buildInitialModalMaterial(materialOptions),
                ...restoredMaterials,
              ],
        };
      });
      setEditingMaterialSnapshots((current) => {
        const { [materialRowId]: _removed, ...rest } = current;
        return rest;
      });
      return;
    }

    handleRemoveModalMaterial(materialRowId);
  }

  function handleRemoveModalMaterial(materialRowId: string) {
    setEditingMaterialSnapshots((current) => {
      const { [materialRowId]: _removed, ...rest } = current;
      return rest;
    });
    setItemModalForm((current) => {
      const remainingMaterials = current.materials.filter(
        (material) => material.id !== materialRowId,
      );

      return {
        ...current,
        materials:
          remainingMaterials.length > 0
            ? remainingMaterials
            : [buildInitialModalMaterial(materialOptions)],
      };
    });
  }

  function handleSaveItem() {
    try {
      const nextErrors: ItemModalErrors = {
        materialRows: {},
      };
      const trimmedDisplayName = itemModalForm.displayName.trim();
      const validMaterials = itemModalForm.materials.filter((material) => {
        const hasName =
          material.materialName.trim().length > 0 ||
          material.searchInput.trim().length > 0;
        const hasUnit = material.unitType.trim().length > 0;
        const quantityValue = parseBudgetNumberInput(material.quantityInput);

        const rowErrors: Partial<
          Record<"searchInput" | "unitType" | "quantityInput", string>
        > = {};

        if (!hasName) {
          rowErrors.searchInput = "Material name is required.";
        }

        if (!hasUnit) {
          rowErrors.unitType = "Unit type is required.";
        }

        if (quantityValue <= 0) {
          rowErrors.quantityInput = "Quantity must be greater than zero.";
        }

        if (Object.keys(rowErrors).length > 0) {
          nextErrors.materialRows[material.id] = rowErrors;
        }

        return hasName && hasUnit && quantityValue > 0;
      });

      if (!trimmedDisplayName) {
        nextErrors.displayName = "Description is required.";
      }

      if (validMaterials.length === 0) {
        setItemModalErrors(nextErrors);
        return;
      }

      const itemDisplayName =
        trimmedDisplayName ||
        validMaterials[0]?.materialName.trim() ||
        validMaterials[0]?.searchInput.trim() ||
        "";

      if (!itemDisplayName) {
        setItemModalErrors({
          ...nextErrors,
          displayName: "Description is required.",
        });
        return;
      }

      const incompleteQuote = validMaterials.find(
        (material) =>
          material.pricingBasis === "supplier_quote" &&
          (!material.referenceSupplier.trim() || !material.referenceQuotation.trim()),
      );
      if (incompleteQuote) {
        toast.error("Supplier and quotation reference are required for supplier pricing.");
        return;
      }

      setItemModalErrors({ materialRows: {} });

      const existingItems =
        editingItemIndices
          ?.map((index) => estimateForm.items[index])
          .filter(Boolean) ?? [];

      const nextItems = validMaterials.map((material, index) => {
        const { quantityValue, unitCostValue, resolvedMaterial, resolvedUnit } =
          validateModalMaterial(material, materialOptions);

        return {
          id: existingItems[index]?.id ?? undefined,
          catalogItemId: material.catalogItemId,
          materialId: resolvedMaterial?.materialId ?? material.materialId,
          materialName:
            material.materialName ||
            resolvedMaterial?.materialName ||
            material.searchInput.trim(),
          unitType: material.unitType || resolvedUnit?.unitType || "",
          unitCost: unitCostValue,
          quantity: quantityValue,
          lineTotal: round2(quantityValue * unitCostValue),
          displayName: buildDisplayName(itemDisplayName),
          notes: itemModalForm.notes,
          pricingBasis: material.pricingBasis,
          referenceSupplier: material.referenceSupplier,
          referenceQuotation: material.referenceQuotation,
          sortOrder:
            editingItemIndices && editingItemIndices.length > 0
              ? Math.min(...editingItemIndices) + index
              : estimateForm.items.length + index,
        } satisfies ProjectEstimateDraftLine;
      });

      setEstimateForm((current) => {
        const baseItems =
          editingItemIndices === null
            ? current.items
            : current.items.filter(
                (_, index) => !editingItemIndices.includes(index),
              );

        const insertionIndex =
          editingItemIndices === null
            ? baseItems.length
            : Math.min(...editingItemIndices);
        const mergedItems = [
          ...baseItems.slice(0, insertionIndex),
          ...nextItems,
          ...baseItems.slice(insertionIndex),
        ].map((item, index) => ({
          ...item,
          sortOrder: index,
        }));

        return ensureEstimateLineTotals({
          ...current,
          items: mergedItems,
        });
      });
      handleCloseAddCostModal();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save cost.",
      );
    }
  }

  function handleRemoveItem(indices: number[]) {
    setEstimateForm((current) =>
      ensureEstimateLineTotals({
        ...current,
        items: current.items
          .filter((_, itemIndex) => !indices.includes(itemIndex))
          .map((item, itemIndex) => ({
            ...item,
            sortOrder: itemIndex,
          })),
      }),
    );
  }

  function handleCloseRejectionAlert() {
    setRejectionAlert(null);
  }

  return {
    sortedEstimates,
    itemsByEstimateId,
    selectedEstimate,
    estimateForm,
    projectSetupOpen,
    isReadOnlyEstimate,
    itemModalOpen,
    itemModalForm,
    itemModalErrors,
    editingMaterialSnapshots,
    pendingMaterialRowId,
    itemModalReadOnly,
    editingItemIndices,
    materialOptions,
    currentLineTotal,
    currentEstimateTotal,
    plannedEstimateTotal,
    totalQuantity,
    hasUnsavedEstimateChanges,
    saveState,
    saveMessage,
    setupFormErrors,
    pendingEstimateAction,
    pendingEstimateIntent,
    pendingDeleteEstimate,
    activeReportEstimate,
    activeReportItems,
    rejectionAlert,
    handleSelectEstimate,
    handleOpenAssignedProjectSetup,
    handleCloseProjectSetup,
    handleEstimateFieldChange,
    handleSaveEstimate,
    handleSubmitEstimate,
    handleDeleteEstimate,
    handleReopenRejectedEstimate,
    handleOpenAddCostModal,
    handleViewItemModal,
    handleEditItemModal,
    handleCloseAddCostModal,
    handleSelectMaterial,
    handleSelectMaterialUnit,
    handleItemModalFieldChange,
    handleMaterialRowFieldChange,
    handleAddModalMaterial,
    handleSaveModalMaterial,
    handleEditModalMaterial,
    handleCancelModalMaterial,
    handleRemoveModalMaterial,
    handleSaveItem,
    handleRemoveItem,
    handleCloseRejectionAlert,
    setActiveReportEstimateId,
  };
}

"use client";

import type {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import {
  createBudgetProjectAction,
  deleteBudgetItemAction,
  deleteBudgetProjectAction,
  reorderBudgetItemsAction,
  saveBudgetItemAction,
} from "@/actions/budgetTracker";
import {
  BUDGET_ITEM_CATEGORY_OPTIONS,
  BUDGET_ITEM_STATUS_OPTIONS,
  type BudgetItemFormInput,
  type BudgetItemGroup,
  type BudgetItemRow,
  type BudgetProjectFormInput,
  type BudgetProjectRow,
  type BudgetTrackerSummary,
} from "@/features/budget-tracker/types";
import {
  formatBudgetMoney,
  formatBudgetNumberForInput,
  parseBudgetNumberInput,
  sanitizeBudgetNumericInput,
} from "@/features/budget-tracker/utils/budgetTrackerFormatters";
import type { BudgetItemStatus } from "@/types/database";

const EMPTY_PROJECT_FORM: BudgetProjectFormInput = {
  name: "",
  projectType: "",
  currencyCode: "PHP",
  startingBudget: 0,
};

const EMPTY_ITEM_FORM: BudgetItemFormInput = {
  projectId: "",
  name: "",
  status: "upcoming",
  category: "materials",
  estimatedCost: 0,
  actualSpent: 0,
  notes: "",
  sortOrder: 0,
};

export function useBudgetTrackerPage({
  projects,
  items,
  schemaReady,
  canManageProjects = true,
}: {
  projects: BudgetProjectRow[];
  items: BudgetItemRow[];
  schemaReady: boolean;
  canManageProjects?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [localProjects, setLocalProjects] = useState(projects);
  const [localItems, setLocalItems] = useState(items);
  const [selectedProjectId, setSelectedProjectId] = useState(
    projects[0]?.id ?? "",
  );
  const [projectSetupOpen, setProjectSetupOpen] = useState(
    canManageProjects && projects.length === 0 && schemaReady,
  );
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemPanelVisible, setItemPanelVisible] = useState(false);
  const [deleteProjectModalOpen, setDeleteProjectModalOpen] = useState(false);
  const [projectForm, setProjectForm] = useState(EMPTY_PROJECT_FORM);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);
  const [projectBudgetInput, setProjectBudgetInput] = useState("");
  const [estimatedCostInput, setEstimatedCostInput] = useState("");
  const [actualSpentInput, setActualSpentInput] = useState("");
  const [projectError, setProjectError] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const [itemFieldErrors, setItemFieldErrors] = useState<
    Partial<Record<"name" | "status" | "category" | "estimatedCost", string>>
  >({});
  const [activeDropStatus, setActiveDropStatus] =
    useState<BudgetItemStatus | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "project" | "item" | "delete-project" | "delete-item" | null
  >(null);
  const [saveState, setSaveState] = useState<
    "saved" | "dirty" | "saving" | "error"
  >("saved");
  const [saveMessage, setSaveMessage] = useState("Draft saved");
  const pendingReordersRef = useRef<
    Record<
      string,
      {
        projectId: string;
        items: Array<{
          id: string;
          status: BudgetItemStatus;
          sortOrder: number;
        }>;
      }
    >
  >({});

  useEffect(() => setLocalProjects(projects), [projects]);
  useEffect(() => setLocalItems(items), [items]);

  useEffect(() => {
    if (!itemModalOpen) {
      setItemPanelVisible(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setItemPanelVisible(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [itemModalOpen]);

  useEffect(() => {
    if (!selectedProjectId && localProjects[0]?.id) {
      setSelectedProjectId(localProjects[0].id);
      return;
    }

    if (
      selectedProjectId &&
      !localProjects.some((project) => project.id === selectedProjectId)
    ) {
      setSelectedProjectId(localProjects[0]?.id ?? "");
    }
  }, [localProjects, selectedProjectId]);

  const selectedProject =
    localProjects.find((project) => project.id === selectedProjectId) ??
    localProjects[0] ??
    null;

  const selectedItems = useMemo(
    () =>
      localItems
        .filter((item) => item.project_id === selectedProject?.id)
        .sort((a, b) => {
          const sortDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
          if (sortDiff !== 0) return sortDiff;
          return a.created_at.localeCompare(b.created_at);
        }),
    [localItems, selectedProject?.id],
  );

  const groups = useMemo<BudgetItemGroup[]>(
    () =>
      BUDGET_ITEM_STATUS_OPTIONS.map((status) => ({
        ...status,
        items: selectedItems.filter((item) => item.status === status.value),
      })),
    [selectedItems],
  );

  const summary = useMemo<BudgetTrackerSummary>(() => {
    const startingBudget = selectedProject?.starting_budget ?? 0;
    const actualSpent = selectedItems.reduce(
      (sum, item) => sum + (item.actual_spent ?? 0),
      0,
    );

    return {
      startingBudget,
      actualSpent,
      remainingBudget: startingBudget - actualSpent,
      categoryTotals: BUDGET_ITEM_CATEGORY_OPTIONS.map((category) => {
        const total = selectedItems
          .filter((item) => item.category === category.value)
          .reduce((sum, item) => sum + (item.actual_spent ?? 0), 0);

        return {
          ...category,
          total,
          ratio: actualSpent > 0 ? total / actualSpent : 0,
        };
      }).filter((item) => item.total > 0),
    };
  }, [selectedItems, selectedProject]);

  const budgetHealthMessage =
    summary.remainingBudget >= 0
      ? `You still have ${formatBudgetMoney(summary.remainingBudget, selectedProject?.currency_code ?? "PHP")} left in this project budget.`
      : `This project is over budget by ${formatBudgetMoney(Math.abs(summary.remainingBudget), selectedProject?.currency_code ?? "PHP")}.`;

  function queueReorderSave(nextProjectId: string, nextItems: BudgetItemRow[]) {
    if (!canManageProjects) return;

    pendingReordersRef.current[nextProjectId] = {
      projectId: nextProjectId,
      items: nextItems.map((entry) => ({
        id: entry.id,
        status: entry.status,
        sortOrder: entry.sort_order ?? 0,
      })),
    };

    setSaveState("dirty");
    setSaveMessage("Unsaved changes");
  }

  function handleSaveDraft(onSuccess?: () => void) {
    if (!canManageProjects) {
      if (typeof onSuccess === "function") {
        onSuccess();
      }
      return;
    }

    const pendingPayloads = Object.values(pendingReordersRef.current);
    if (pendingPayloads.length === 0) {
      setSaveState("saved");
      setSaveMessage("Draft saved");
      if (typeof onSuccess === "function") {
        onSuccess();
      }
      return;
    }

    setSaveState("saving");
    setSaveMessage("Saving draft...");

    startTransition(async () => {
      try {
        for (const pending of pendingPayloads) {
          await reorderBudgetItemsAction({
            projectId: pending.projectId,
            items: pending.items,
          });
        }

        pendingReordersRef.current = {};
        setSaveState("saved");
        setSaveMessage("Draft saved");
        toast.success("Draft saved.");
        if (typeof onSuccess === "function") {
          onSuccess();
        }
      } catch (error) {
        setSaveState("error");
        setSaveMessage("Unable to save draft");
        toast.error(
          error instanceof Error ? error.message : "Failed to save draft.",
        );
      }
    });
  }

  function updateFormattedProjectBudget(value: string) {
    const formatted = sanitizeBudgetNumericInput(value);
    setProjectBudgetInput(formatted);
    setProjectForm((current) => ({
      ...current,
      startingBudget: parseBudgetNumberInput(formatted),
    }));
  }

  function updateFormattedEstimatedCost(value: string) {
    const formatted = sanitizeBudgetNumericInput(value);
    setEstimatedCostInput(formatted);
    setItemForm((current) => ({
      ...current,
      estimatedCost: parseBudgetNumberInput(formatted),
    }));
  }

  function updateFormattedActualSpent(value: string) {
    const formatted = sanitizeBudgetNumericInput(value);
    setActualSpentInput(formatted);
    setItemForm((current) => ({
      ...current,
      actualSpent: parseBudgetNumberInput(formatted),
    }));
  }

  function resetProjectForm() {
    setProjectForm(EMPTY_PROJECT_FORM);
    setProjectBudgetInput("");
    setProjectError(null);
  }

  function resetItemForm(status: BudgetItemStatus = "upcoming") {
    setItemForm({
      ...EMPTY_ITEM_FORM,
      projectId: selectedProject?.id ?? "",
      status,
      sortOrder: selectedItems.length,
    });
    setEstimatedCostInput("");
    setActualSpentInput("");
    setItemError(null);
    setItemFieldErrors({});
  }

  function closeItemModal() {
    setItemModalOpen(false);
    setItemError(null);
  }

  function openNewItemModal(status: BudgetItemStatus = "upcoming") {
    if (!canManageProjects) return;

    resetItemForm(status);
    setItemModalOpen(true);
  }

  function openEditItemModal(item: BudgetItemRow) {
    if (!canManageProjects) return;

    setItemForm({
      id: item.id,
      projectId: item.project_id,
      name: item.name,
      status: item.status,
      category: item.category,
      estimatedCost: item.estimated_cost ?? 0,
      actualSpent: item.actual_spent ?? 0,
      notes: item.notes ?? "",
      sortOrder: item.sort_order ?? 0,
    });
    setEstimatedCostInput(formatBudgetNumberForInput(item.estimated_cost ?? 0));
    setActualSpentInput(formatBudgetNumberForInput(item.actual_spent ?? 0));
    setItemError(null);
    setItemFieldErrors({});
    setItemModalOpen(true);
  }

  function validateItemForm(form: BudgetItemFormInput) {
    const errors: Partial<
      Record<"name" | "status" | "category" | "estimatedCost", string>
    > = {};

    if (!form.name.trim()) {
      errors.name = "Cost name is required.";
    }

    if (!form.status) {
      errors.status = "Status is required.";
    }

    if (!form.category) {
      errors.category = "Category is required.";
    }

    if (!estimatedCostInput.trim()) {
      errors.estimatedCost = "Estimated cost is required.";
    }

    return errors;
  }

  function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageProjects) {
      setProjectError("Payroll managers can view project tracking only.");
      return;
    }

    setProjectError(null);
    setPendingAction("project");

    startTransition(async () => {
      try {
        const { project } = await createBudgetProjectAction(projectForm);
        setLocalProjects((current) => [project, ...current]);
        setSelectedProjectId(project.id);
        setProjectSetupOpen(false);
        resetProjectForm();
        toast.success("Budget project created.");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create project.";
        setProjectError(message);
        toast.error(message);
      } finally {
        setPendingAction(null);
      }
    });
  }

  function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageProjects) {
      setItemError("Payroll managers can view project tracking only.");
      return;
    }

    setItemError(null);
    const nextErrors = validateItemForm(itemForm);
    if (Object.keys(nextErrors).length > 0) {
      setItemFieldErrors(nextErrors);
      return;
    }

    setItemFieldErrors({});
    setPendingAction("item");

    startTransition(async () => {
      try {
        const savedItem = await saveBudgetItemAction(itemForm);
        setLocalItems((current) => {
          const hasExistingItem = current.some(
            (entry) => entry.id === savedItem.id,
          );
          if (hasExistingItem) {
            return current.map((entry) =>
              entry.id === savedItem.id ? savedItem : entry,
            );
          }
          return [...current, savedItem];
        });
        closeItemModal();
        toast.success(itemForm.id ? "Cost updated." : "Cost added.");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to save cost.";
        setItemError(message);
        toast.error(message);
      } finally {
        setPendingAction(null);
      }
    });
  }

  function removeItem() {
    if (!canManageProjects) return;

    const itemId = itemForm.id;
    if (!itemId) return;

    setPendingAction("delete-item");
    startTransition(async () => {
      try {
        await deleteBudgetItemAction(itemId);
        setLocalItems((current) =>
          current.filter((entry) => entry.id !== itemId),
        );
        closeItemModal();
        toast.success("Cost deleted.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete cost.",
        );
      } finally {
        setPendingAction(null);
      }
    });
  }

  function removeProject() {
    if (!canManageProjects) return;

    if (!selectedProject) return;

    setPendingAction("delete-project");
    startTransition(async () => {
      try {
        await deleteBudgetProjectAction(selectedProject.id);
        setLocalProjects((current) =>
          current.filter((project) => project.id !== selectedProject.id),
        );
        setLocalItems((current) =>
          current.filter((item) => item.project_id !== selectedProject.id),
        );
        setDeleteProjectModalOpen(false);
        toast.success("Project deleted.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete project.",
        );
      } finally {
        setPendingAction(null);
      }
    });
  }

  function dragEnd() {
    setDraggedItemId(null);
    setActiveDropStatus(null);
  }

  function reorderProjectItems(
    currentSelectedItems: BudgetItemRow[],
    activeId: string,
    overId: string | null,
    nextStatus: BudgetItemStatus,
  ) {
    const movingItem = currentSelectedItems.find(
      (entry) => entry.id === activeId,
    );
    if (!movingItem) return null;

    const currentStatusItems = currentSelectedItems.filter(
      (entry) => entry.status === movingItem.status,
    );
    const targetStatusItems = currentSelectedItems.filter(
      (entry) => entry.status === nextStatus,
    );

    if (movingItem.status === nextStatus) {
      const oldIndex = currentStatusItems.findIndex(
        (entry) => entry.id === activeId,
      );
      const targetIndex = overId
        ? currentStatusItems.findIndex((entry) => entry.id === overId)
        : currentStatusItems.length - 1;

      if (oldIndex < 0 || targetIndex < 0 || oldIndex === targetIndex) {
        return null;
      }

      const reorderedWithinStatus = arrayMove(
        currentStatusItems,
        oldIndex,
        targetIndex,
      );

      const reorderedIds = reorderedWithinStatus.map((entry) => entry.id);
      const merged = currentSelectedItems.map((entry) => {
        if (entry.status !== nextStatus) return entry;
        const nextEntry = reorderedWithinStatus.find(
          (item) => item.id === entry.id,
        );
        return nextEntry ?? entry;
      });

      return merged
        .sort((a, b) => {
          if (a.status !== b.status) {
            return (
              BUDGET_ITEM_STATUS_OPTIONS.findIndex(
                (status) => status.value === a.status,
              ) -
              BUDGET_ITEM_STATUS_OPTIONS.findIndex(
                (status) => status.value === b.status,
              )
            );
          }

          return reorderedIds.indexOf(a.id) - reorderedIds.indexOf(b.id);
        })
        .map((entry, index) => ({
          ...entry,
          sort_order: index,
        }));
    }

    const remainingItems = currentSelectedItems.filter(
      (entry) => entry.id !== activeId,
    );
    const grouped = Object.fromEntries(
      BUDGET_ITEM_STATUS_OPTIONS.map((statusOption) => [
        statusOption.value,
        remainingItems.filter((entry) => entry.status === statusOption.value),
      ]),
    ) as Record<BudgetItemStatus, BudgetItemRow[]>;

    const targetItems = grouped[nextStatus] ?? [];
    const insertIndex = overId
      ? Math.max(
          0,
          targetItems.findIndex((entry) => entry.id === overId),
        )
      : targetItems.length;

    grouped[nextStatus] = [
      ...targetItems.slice(0, insertIndex),
      { ...movingItem, status: nextStatus },
      ...targetItems.slice(insertIndex),
    ];

    return BUDGET_ITEM_STATUS_OPTIONS.flatMap((statusOption) =>
      (grouped[statusOption.value] ?? []).map((entry) => entry),
    ).map((entry, index) => ({
      ...entry,
      sort_order: index,
    }));
  }

  function applyReorder(
    activeId: string,
    overId: string | null,
    nextStatus: BudgetItemStatus,
  ) {
    if (!selectedProject) return;

    const nextProjectItems = reorderProjectItems(
      selectedItems,
      activeId,
      overId,
      nextStatus,
    );
    if (!nextProjectItems) return;

    const previousItems = localItems;
    const changedIds = new Set(nextProjectItems.map((entry) => entry.id));

    setLocalItems((current) => [
      ...current.filter((entry) => !changedIds.has(entry.id)),
      ...nextProjectItems,
    ]);
    queueReorderSave(selectedProject.id, nextProjectItems);

    return previousItems;
  }

  function handleDragStart(event: DragStartEvent) {
    if (!canManageProjects) return;

    setDraggedItemId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    if (!canManageProjects) return;

    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    const overStatus =
      (event.over?.data.current?.sortable?.containerId as
        | BudgetItemStatus
        | undefined) ??
      (event.over?.data.current?.status as BudgetItemStatus | undefined);

    if (!overStatus) return;
    setActiveDropStatus(overStatus);
    applyReorder(activeId, overId, overStatus);
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!canManageProjects) return;

    const overStatus =
      (event.over?.data.current?.sortable?.containerId as
        | BudgetItemStatus
        | undefined) ??
      (event.over?.data.current?.status as BudgetItemStatus | undefined) ??
      null;

    dragEnd();

    if (!event.over || !overStatus) return;

    const activeId = String(event.active.id);
    const overId = String(event.over.id);
    applyReorder(activeId, overId, overStatus);
  }

  return {
    isPending,
    localProjects,
    localItems,
    selectedProject,
    selectedItems,
    groups,
    summary,
    budgetHealthMessage,
    projectSetupOpen,
    itemModalOpen,
    itemPanelVisible,
    deleteProjectModalOpen,
    projectForm,
    itemForm,
    projectBudgetInput,
    estimatedCostInput,
    actualSpentInput,
    projectError,
    itemError,
    itemFieldErrors,
    activeDropStatus,
    draggedItemId,
    pendingAction,
    saveState,
    saveMessage,
    canManageProjects,
    hasUnsavedChanges: canManageProjects && saveState === "dirty",
    handleSaveDraft,
    setSelectedProjectId,
    setProjectSetupOpen,
    setDeleteProjectModalOpen,
    setProjectForm,
    setItemForm,
    updateFormattedProjectBudget,
    updateFormattedEstimatedCost,
    updateFormattedActualSpent,
    resetProjectForm,
    closeItemModal,
    openNewItemModal,
    openEditItemModal,
    submitProject,
    submitItem,
    removeItem,
    removeProject,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}

export type BudgetTrackerPageState = ReturnType<typeof useBudgetTrackerPage>;

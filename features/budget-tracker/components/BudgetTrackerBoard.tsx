"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useMemo } from "react";
import {
  type BudgetItemGroup,
  type BudgetItemRow,
  type BudgetProjectRow,
} from "@/features/budget-tracker/types";
import {
  formatBudgetMoney,
  getBudgetCategoryColorClasses,
  getBudgetCategoryLabel,
} from "@/features/budget-tracker/utils/budgetTrackerFormatters";
import { cn } from "@/lib/utils";
import type { BudgetItemStatus } from "@/types/database";

function BudgetTrackerCardContent({
  item,
  label,
  currencyCode,
}: {
  item: BudgetItemRow;
  label: string;
  currencyCode: string;
}) {
  const variance =
    Math.round(((item.estimated_cost ?? 0) - (item.actual_spent ?? 0)) * 100) /
    100;

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold tracking-[-0.02em] text-apple-charcoal">
            {item.name}
          </p>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.22em] text-apple-steel">
            {label}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            getBudgetCategoryColorClasses(item.category).badge,
          )}
        >
          {getBudgetCategoryLabel(item.category)}
        </span>
      </div>

      <div className="mt-5 space-y-3 text-sm">
        <div className="flex items-center justify-between text-apple-smoke">
          <span>Estimated cost</span>
          <span className="font-semibold text-apple-charcoal">
            {formatBudgetMoney(item.estimated_cost ?? 0, currencyCode)}
          </span>
        </div>
        <div className="flex items-center justify-between text-apple-smoke">
          <span>Actual spent</span>
          <span className="font-semibold text-apple-charcoal">
            {formatBudgetMoney(item.actual_spent ?? 0, currencyCode)}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-apple-mist pt-3">
          <span className="text-apple-smoke">
            {variance >= 0 ? "Under budget" : "Over budget"}
          </span>
          <span
            className={cn(
              "font-semibold",
              variance >= 0 ? "text-emerald-600" : "text-rose-600",
            )}
          >
            {formatBudgetMoney(Math.abs(variance), currencyCode)}
          </span>
        </div>
      </div>
    </>
  );
}

function SortableBudgetItem({
  item,
  groupLabel,
  currencyCode,
  isDragging,
  isBoardDragging,
  onEditItem,
  canManageProjects,
}: {
  item: BudgetItemRow;
  groupLabel: string;
  currencyCode: string;
  isDragging: boolean;
  isBoardDragging: boolean;
  onEditItem: (item: BudgetItemRow) => void;
  canManageProjects: boolean;
}) {
  const categoryColors = getBudgetCategoryColorClasses(item.category);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableDragging,
  } = useSortable({
    id: item.id,
    data: {
      type: "item",
      itemId: item.id,
      status: item.status,
    },
  });

  return (
    <motion.button
      ref={setNodeRef}
      layout
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      type="button"
      onClick={() => {
        if (canManageProjects && !sortableDragging) {
          onEditItem(item);
        }
      }}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "group w-full rounded-[12px] border border-apple-mist p-4 text-left shadow-[0_8px_20px_rgba(24,83,43,0.06)] transition-[border-color,box-shadow,background-color] duration-200 focus-visible:shadow-[0_16px_36px_rgba(24,83,43,0.14)] focus-visible:outline-none",
        canManageProjects
          ? "cursor-grab hover:shadow-[0_16px_36px_rgba(24,83,43,0.12)] active:cursor-grabbing"
          : "cursor-default",
        categoryColors.cardBg,
        categoryColors.cardHoverBorder,
        isBoardDragging &&
          "shadow-none hover:shadow-none focus-visible:shadow-none",
        (isDragging || sortableDragging) &&
          cn(
            "border-[#1f6a37]/20 opacity-55 shadow-none",
            categoryColors.cardActiveBg,
          ),
      )}
      {...(canManageProjects ? attributes : {})}
      {...(canManageProjects ? listeners : {})}
    >
      <BudgetTrackerCardContent
        item={item}
        label={groupLabel}
        currencyCode={currencyCode}
      />
    </motion.button>
  );
}

function BudgetTrackerColumn({
  group,
  selectedProject,
  activeDropStatus,
  draggedItemId,
  onAddItem,
  onEditItem,
  canManageProjects,
}: {
  group: BudgetItemGroup;
  selectedProject: BudgetProjectRow;
  activeDropStatus: BudgetItemStatus | null;
  draggedItemId: string | null;
  onAddItem: (status: BudgetItemStatus) => void;
  onEditItem: (item: BudgetItemRow) => void;
  canManageProjects: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: group.value,
    data: {
      type: "column",
      status: group.value,
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={cn("h-2.5 w-2.5 rounded-full", group.dotClassName)}
            />
            <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-apple-charcoal">
              {group.label}
            </h2>
          </div>
          <p className="mt-2 text-sm text-apple-smoke">
            {group.items.length} item{group.items.length === 1 ? "" : "s"} |{" "}
            {formatBudgetMoney(
              group.items.reduce(
                (sum, item) => sum + (item.estimated_cost ?? 0),
                0,
              ),
              selectedProject.currency_code,
            )}
          </p>
        </div>
        {canManageProjects ? (
          <button
            type="button"
            onClick={() => onAddItem(group.value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-apple-mist text-apple-smoke hover:bg-apple-mist/40 hover:text-apple-charcoal"
          >
            <Plus size={18} />
          </button>
        ) : null}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[520px] rounded-[14px] border border-apple-mist bg-[rgb(var(--apple-snow))] p-3",
          (isOver || activeDropStatus === group.value) &&
            "ring-2 ring-[#1f6a37]/20",
        )}
      >
        <SortableContext
          id={group.value}
          items={group.items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {group.items.length === 0 ? (
            <div className="flex min-h-[470px] items-center justify-center rounded-[12px] px-6 text-center text-sm leading-8 text-apple-steel">
              {group.value === "upcoming"
                ? "Add items you expect to pay."
                : group.value === "ongoing"
                  ? "Move items here when payments begin."
                  : "Move items here once fully paid."}
            </div>
          ) : (
            <motion.div layout className="space-y-3">
              {group.items.map((item) => (
                <SortableBudgetItem
                  key={item.id}
                  item={item}
                  groupLabel={group.label}
                  currencyCode={selectedProject.currency_code}
                  isDragging={draggedItemId === item.id}
                  isBoardDragging={draggedItemId !== null}
                  onEditItem={onEditItem}
                  canManageProjects={canManageProjects}
                />
              ))}
            </motion.div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export default function BudgetTrackerBoard({
  groups,
  selectedProject,
  draggedItemId,
  activeDropStatus,
  onAddItem,
  onDragStart,
  onDragOver,
  onDragEnd,
  onEditItem,
  canManageProjects,
}: {
  groups: BudgetItemGroup[];
  selectedProject: BudgetProjectRow;
  draggedItemId: string | null;
  activeDropStatus: BudgetItemStatus | null;
  onAddItem: (status: BudgetItemStatus) => void;
  onDragStart: (event: DragStartEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onEditItem: (item: BudgetItemRow) => void;
  canManageProjects: boolean;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 8,
      },
    }),
  );

  const activeItem = useMemo(
    () =>
      draggedItemId
        ? (groups
            .flatMap((group) => group.items)
            .find((item) => item.id === draggedItemId) ?? null)
        : null,
    [draggedItemId, groups],
  );

  const activeGroupLabel = groups.find(
    (group) => group.value === activeItem?.status,
  )?.label;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={canManageProjects ? onDragStart : undefined}
      onDragOver={canManageProjects ? onDragOver : undefined}
      onDragEnd={canManageProjects ? onDragEnd : undefined}
    >
      <div className="grid gap-5 p-4 xl:grid-cols-3">
        {groups.map((group) => (
          <BudgetTrackerColumn
            key={group.value}
            group={group}
            selectedProject={selectedProject}
            activeDropStatus={activeDropStatus}
            draggedItemId={draggedItemId}
            onAddItem={onAddItem}
            onEditItem={onEditItem}
            canManageProjects={canManageProjects}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="rotate-[2deg] rounded-[12px] border border-[#1f6a37]/25 bg-white p-4 text-left">
            <BudgetTrackerCardContent
              item={activeItem}
              label={activeGroupLabel ?? "Item"}
              currencyCode={selectedProject.currency_code}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

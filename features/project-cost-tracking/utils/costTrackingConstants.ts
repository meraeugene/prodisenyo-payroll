import type { BudgetItemStatus } from "@/types/database";

export const COST_CATEGORY_OPTIONS = [
  "Materials",
  "Labor",
  "Equipment",
  "Permits",
  "Services",
  "Utilities",
  "Transportation",
  "Miscellaneous",
] as const;

export const COST_COLUMNS: Array<{
  value: BudgetItemStatus;
  label: string;
  dotClassName: string;
  emptyMessage: string;
}> = [
  {
    value: "upcoming",
    label: "Upcoming",
    dotClassName: "bg-amber-400",
    emptyMessage: "No pending material or expense costs.",
  },
  {
    value: "ongoing",
    label: "Ongoing",
    dotClassName: "bg-orange-500",
    emptyMessage: "No purchases are currently in progress.",
  },
  {
    value: "completed",
    label: "Completed",
    dotClassName: "bg-emerald-600",
    emptyMessage: "No accepted materials or approved expenses yet.",
  },
];
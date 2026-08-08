import type { BudgetItemStatus } from "@/types/database";

export type MaterialCostRequest = {
  id: string;
  material_name: string;
  quantity: number;
  unit: string;
  needed_by: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at?: string;
};

export type ProjectPurchaseOrder = {
  id: string;
  material_request_id: string | null;
  item_name: string;
  quantity: number;
  unit: string;
  estimated_unit_cost: number;
  actual_unit_cost: number;
  supplier_name: string | null;
  quotation_reference: string | null;
  receipt_invoice_reference: string | null;
  status: string;
  delivery_status: string | null;
  ordered_at: string | null;
  received_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  receipt_evidence: {
    id: string;
    fileName: string;
    contentType: string;
    createdAt: string;
  } | null;
};

export type ProjectMaterialReceipt = {
  id: string;
  purchase_order_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  total_cost: number;
  accepted_at: string;
};

export type ProjectExpenseRecord = {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  status: "draft" | "submitted" | "approved" | "rejected";
};

export type TrackedProjectCost = {
  id: string;
  source: "material" | "expense";
  name: string;
  category: string;
  estimatedCost: number;
  actualSpent: number;
  status: BudgetItemStatus;
  workflowLabel: string;
  date: string | null;
  dateLabel: string;
  notes: string | null;
};

export type CostTrackingSummary = {
  startingBudget: number;
  estimatedCosts: number;
  actualExpenses: number;
  remainingBudget: number;
  upcomingCount: number;
  ongoingCount: number;
  completedCount: number;
};

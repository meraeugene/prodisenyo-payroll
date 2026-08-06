import type {
  CostTrackingSummary,
  MaterialCostRequest,
  ProjectExpenseRecord,
  ProjectMaterialReceipt,
  ProjectPurchaseOrder,
  TrackedProjectCost,
} from "@/features/project-cost-tracking/types";
import type { BudgetItemStatus } from "@/types/database";

const EXCLUDED_MATERIAL_STATUSES = new Set(["rejected", "cancelled"]);

function materialStage(
  purchase: ProjectPurchaseOrder | undefined,
  receipt: ProjectMaterialReceipt | undefined,
): BudgetItemStatus {
  if (
    receipt ||
    purchase?.status === "received" ||
    purchase?.delivery_status === "accepted"
  ) {
    return "completed";
  }
  if (
    purchase?.status === "ordered" ||
    ["in_transit", "delivered", "verification_required"].includes(
      purchase?.delivery_status ?? "",
    )
  ) {
    return "ongoing";
  }
  return "upcoming";
}

function materialWorkflowLabel(
  requestStatus: string,
  purchase: ProjectPurchaseOrder | undefined,
  stage: BudgetItemStatus,
) {
  if (stage === "completed") return "Accepted";
  if (stage === "ongoing") return "In progress";
  if (purchase?.status === "approved" || requestStatus === "approved") {
    return "Approved";
  }
  if (purchase) return "Purchasing";
  return "Pending";
}

function mapMaterialCost(
  request: MaterialCostRequest | null,
  purchase: ProjectPurchaseOrder | undefined,
  receipt: ProjectMaterialReceipt | undefined,
): TrackedProjectCost {
  const quantity = Number(purchase?.quantity ?? request?.quantity ?? 0);
  const estimatedUnitCost = Number(
    purchase?.estimated_unit_cost || purchase?.actual_unit_cost || 0,
  );
  const estimatedCost = quantity * estimatedUnitCost;
  const stage = materialStage(purchase, receipt);
  const receivedCost = Number(
    receipt?.total_cost ||
      (purchase?.actual_unit_cost
        ? Number(purchase.actual_unit_cost) * quantity
        : estimatedCost),
  );
  const requestStatus = request?.status ?? purchase?.status ?? "submitted";

  return {
    id: `material:${request?.id ?? purchase?.id}`,
    source: "material",
    name: purchase?.item_name ?? request?.material_name ?? "Material cost",
    category: "Materials",
    estimatedCost,
    actualSpent: stage === "completed" ? receivedCost : 0,
    status: stage,
    workflowLabel: materialWorkflowLabel(requestStatus, purchase, stage),
    date:
      stage === "completed"
        ? receipt?.accepted_at ?? purchase?.received_at ?? purchase?.updated_at ?? null
        : stage === "ongoing"
          ? purchase?.ordered_at ?? purchase?.updated_at ?? null
          : request?.needed_by ?? purchase?.updated_at ?? null,
    dateLabel:
      stage === "completed" ? "Received" : stage === "ongoing" ? "Ordered" : "Needed",
    notes: purchase?.notes ?? request?.notes ?? null,
  };
}

function mapExpenseCost(expense: ProjectExpenseRecord): TrackedProjectCost {
  const completed = expense.status === "approved";
  return {
    id: `expense:${expense.id}`,
    source: "expense",
    name: expense.description,
    category: expense.category,
    estimatedCost: Number(expense.amount || 0),
    actualSpent: completed ? Number(expense.amount || 0) : 0,
    status: completed ? "completed" : "upcoming",
    workflowLabel: completed ? "Approved" : "Pending",
    date: expense.expense_date,
    dateLabel: completed ? "Recorded" : "Expected",
    notes: null,
  };
}

export function buildTrackedProjectCosts(
  materialRequests: MaterialCostRequest[],
  purchaseOrders: ProjectPurchaseOrder[],
  materialReceipts: ProjectMaterialReceipt[],
  expenses: ProjectExpenseRecord[],
) {
  const purchaseByRequestId = new Map(
    purchaseOrders
      .filter((purchase) => purchase.material_request_id)
      .map((purchase) => [purchase.material_request_id as string, purchase]),
  );
  const receiptByPurchaseId = new Map(
    materialReceipts.map((receipt) => [receipt.purchase_order_id, receipt]),
  );
  const linkedPurchaseIds = new Set<string>();
  const costs: TrackedProjectCost[] = [];

  for (const request of materialRequests) {
    if (EXCLUDED_MATERIAL_STATUSES.has(request.status)) continue;
    const purchase = purchaseByRequestId.get(request.id);
    if (purchase?.status === "cancelled") continue;
    if (purchase) linkedPurchaseIds.add(purchase.id);
    costs.push(
      mapMaterialCost(
        request,
        purchase,
        purchase ? receiptByPurchaseId.get(purchase.id) : undefined,
      ),
    );
  }

  for (const purchase of purchaseOrders) {
    if (linkedPurchaseIds.has(purchase.id) || purchase.status === "cancelled") continue;
    costs.push(mapMaterialCost(null, purchase, receiptByPurchaseId.get(purchase.id)));
  }

  for (const expense of expenses) {
    if (expense.status === "rejected") continue;
    costs.push(mapExpenseCost(expense));
  }

  return costs.sort((left, right) => {
    const leftDate = left.date ? new Date(left.date).getTime() : 0;
    const rightDate = right.date ? new Date(right.date).getTime() : 0;
    return rightDate - leftDate;
  });
}

export function buildCostTrackingSummary(
  startingBudget: number,
  costs: TrackedProjectCost[],
): CostTrackingSummary {
  const estimatedCosts = costs.reduce(
    (total, cost) => total + Number(cost.estimatedCost || 0),
    0,
  );
  const actualExpenses = costs
    .filter((cost) => cost.status === "completed")
    .reduce((total, cost) => total + Number(cost.actualSpent || 0), 0);

  return {
    startingBudget,
    estimatedCosts,
    actualExpenses,
    remainingBudget: startingBudget - actualExpenses,
    upcomingCount: costs.filter((cost) => cost.status === "upcoming").length,
    ongoingCount: costs.filter((cost) => cost.status === "ongoing").length,
    completedCount: costs.filter((cost) => cost.status === "completed").length,
  };
}

export function costColumnTotal(
  status: BudgetItemStatus,
  costs: TrackedProjectCost[],
) {
  return costs
    .filter((cost) => cost.status === status)
    .reduce(
      (total, cost) =>
        total + (status === "completed" ? cost.actualSpent : cost.estimatedCost),
      0,
    );
}
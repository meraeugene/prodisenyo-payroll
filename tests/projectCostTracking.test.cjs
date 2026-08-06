const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

function loadModule(relativePath) {
  const filePath = path.join(process.cwd(), relativePath);
  const source = fs.readFileSync(filePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(compiled, {
    module: loadedModule,
    exports: loadedModule.exports,
    require,
  });
  return loadedModule.exports;
}

const {
  buildCostTrackingSummary,
  buildTrackedProjectCosts,
  costColumnTotal,
} = loadModule("features/project-cost-tracking/utils/costTracking.ts");

const request = {
  id: "request-1",
  material_name: "Steel bars",
  quantity: 10,
  unit: "pcs",
  needed_by: "2026-08-20",
  status: "submitted",
  notes: null,
  created_at: "2026-08-01T00:00:00Z",
};

const purchase = {
  id: "purchase-1",
  material_request_id: "request-1",
  item_name: "Steel bars",
  quantity: 10,
  unit: "pcs",
  estimated_unit_cost: 100,
  actual_unit_cost: 110,
  status: "approved",
  delivery_status: "pending",
  ordered_at: null,
  received_at: null,
  notes: null,
  created_at: "2026-08-02T00:00:00Z",
  updated_at: "2026-08-03T00:00:00Z",
};

test("pending material requests appear in Upcoming even before pricing", () => {
  const costs = buildTrackedProjectCosts([request], [], [], []);
  assert.equal(costs.length, 1);
  assert.equal(costs[0].status, "upcoming");
  assert.equal(costs[0].workflowLabel, "Pending");
  assert.equal(costs[0].estimatedCost, 0);
});

test("approved material purchases stay Upcoming with their quoted cost", () => {
  const costs = buildTrackedProjectCosts(
    [{ ...request, status: "approved" }],
    [purchase],
    [],
    [],
  );
  assert.equal(costs[0].status, "upcoming");
  assert.equal(costs[0].workflowLabel, "Approved");
  assert.equal(costs[0].estimatedCost, 1000);
});

test("ordered purchases move to Ongoing", () => {
  const costs = buildTrackedProjectCosts(
    [request],
    [{ ...purchase, status: "ordered", ordered_at: "2026-08-04T00:00:00Z" }],
    [],
    [],
  );
  assert.equal(costs[0].status, "ongoing");
  assert.equal(costs[0].workflowLabel, "In progress");
});

test("accepted material receipts move to Completed with actual cost", () => {
  const receipt = {
    id: "receipt-1",
    purchase_order_id: "purchase-1",
    item_name: "Steel bars",
    quantity: 10,
    unit: "pcs",
    total_cost: 1150,
    accepted_at: "2026-08-05T00:00:00Z",
  };
  const costs = buildTrackedProjectCosts([request], [purchase], [receipt], []);
  assert.equal(costs[0].status, "completed");
  assert.equal(costs[0].actualSpent, 1150);
});

test("approved expenses complete while submitted expenses remain Upcoming", () => {
  const costs = buildTrackedProjectCosts([], [], [], [
    { id: "e1", category: "Labor", description: "Site payroll", amount: 500, expense_date: "2026-08-05", status: "submitted" },
    { id: "e2", category: "Permits", description: "Permit fee", amount: 200, expense_date: "2026-08-04", status: "approved" },
  ]);
  assert.equal(costs.find((cost) => cost.id === "expense:e1").status, "upcoming");
  assert.equal(costs.find((cost) => cost.id === "expense:e2").status, "completed");
});

test("summary and columns use completed costs as actual expenses", () => {
  const costs = buildTrackedProjectCosts([], [], [], [
    { id: "e1", category: "Labor", description: "Site payroll", amount: 500, expense_date: "2026-08-05", status: "submitted" },
    { id: "e2", category: "Permits", description: "Permit fee", amount: 200, expense_date: "2026-08-04", status: "approved" },
  ]);
  const summary = buildCostTrackingSummary(1000, costs);
  assert.equal(summary.estimatedCosts, 700);
  assert.equal(summary.actualExpenses, 200);
  assert.equal(summary.remainingBudget, 800);
  assert.equal(costColumnTotal("upcoming", costs), 500);
  assert.equal(costColumnTotal("completed", costs), 200);
});
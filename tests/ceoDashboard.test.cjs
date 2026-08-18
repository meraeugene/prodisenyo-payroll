const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const test = require("node:test");
const ts = require("typescript");

function loadTypeScriptModule(relativePath) {
  const sourcePath = path.resolve(__dirname, relativePath);
  const compiledSource = ts.transpileModule(fs.readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
  }).outputText;
  const compiledModule = new Module(sourcePath, module);
  compiledModule.filename = sourcePath;
  compiledModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
  compiledModule._compile(compiledSource, sourcePath);
  return compiledModule.exports;
}

const {
  buildCeoApprovalQueue,
  buildCeoAttentionItems,
  buildCeoRecentActivity,
  getCeoReviewApprovalsHref,
  getCeoDashboardTotals,
} = loadTypeScriptModule("../features/ceo-dashboard/utils/ceoDashboard.ts");

function dashboardData(overrides = {}) {
  return {
    projects: [],
    materialRequests: [],
    estimates: [],
    progressUpdates: [],
    documents: [],
    payrollApprovalCount: 0,
    overtimeApprovalCount: 0,
    ...overrides,
  };
}

test("calculates CEO totals from live project and approval data", () => {
  const totals = getCeoDashboardTotals(dashboardData({
    projects: [
      { status: "active", budget: 1000, estimatedCost: 800, spent: 400 },
      { status: "completed", budget: 500, estimatedCost: 450, spent: 500 },
    ],
    materialRequests: [{ status: "submitted" }, { status: "received" }],
    estimates: [{ status: "submitted" }, { status: "approved" }],
    payrollApprovalCount: 2,
    overtimeApprovalCount: 1,
  }));
  assert.equal(totals.activeProjects, 1);
  assert.equal(totals.totalBudget, 1500);
  assert.equal(totals.estimatedCost, 1250);
  assert.equal(totals.totalSpent, 900);
  assert.equal(totals.pendingApprovals, 5);
});

test("approval queue uses actual material, estimate, payroll, and overtime counts", () => {
  const queue = buildCeoApprovalQueue(dashboardData({
    materialRequests: [{ status: "submitted" }, { status: "submitted" }],
    estimates: [{ status: "submitted" }],
    payrollApprovalCount: 3,
    overtimeApprovalCount: 4,
  }));
  assert.deepEqual(queue.map((item) => item.count), [2, 1, 3, 4]);
});

test("review approvals opens the only pending workflow or the aggregate queue", () => {
  const estimateOnly = buildCeoApprovalQueue(dashboardData({
    estimates: [{ status: "submitted" }],
  }));
  assert.equal(getCeoReviewApprovalsHref(estimateOnly), "/estimate-approvals");

  const multipleWorkflows = buildCeoApprovalQueue(dashboardData({
    materialRequests: [{ status: "submitted" }],
    payrollApprovalCount: 1,
  }));
  assert.equal(getCeoReviewApprovalsHref(multipleWorkflows), "#approval-queue");

  const noPendingApprovals = buildCeoApprovalQueue(dashboardData());
  assert.equal(getCeoReviewApprovalsHref(noPendingApprovals), "#approval-queue");
});

test("flags only persisted overdue and over-budget project conditions", () => {
  const base = {
    id: "p1",
    name: "Family Villa",
    status: "active",
    progress: 40,
    endDate: "2026-07-01",
    budget: 100,
    spent: 120,
  };
  const items = buildCeoAttentionItems([base], new Date("2026-08-06T00:00:00Z"));
  assert.deepEqual(items.map((item) => item.id), ["schedule-p1", "budget-p1"]);
  assert.equal(
    buildCeoAttentionItems(
      [{ ...base, status: "completed", progress: 100, spent: 90 }],
      new Date("2026-08-06T00:00:00Z"),
    ).length,
    0,
  );
});

test("combines and sorts persisted CEO workflow activity", () => {
  const items = buildCeoRecentActivity(dashboardData({
    progressUpdates: [{
      id: "u1", projectId: "p1", projectName: "Villa", engineer: "Engineer",
      overallPercent: 60, summary: "Second floor complete", createdAt: "2026-08-06T01:00:00Z",
    }],
    materialRequests: [{
      id: "m1", projectId: "p1", projectName: "Villa", materialName: "Steel",
      status: "approved", createdAt: "2026-08-04T01:00:00Z", updatedAt: "2026-08-05T01:00:00Z",
    }],
  }));
  assert.deepEqual(items.map((item) => item.type), ["progress", "material"]);
  assert.match(items[0].title, /60%/);
});

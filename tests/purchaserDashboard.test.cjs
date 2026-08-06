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
  buildPurchaserActivity,
  buildPurchaserSummary,
  filterPurchaserRecords,
  purchaseOrderCode,
} = loadTypeScriptModule("../features/purchaser-dashboard/utils/purchaserDashboard.ts");

function record(overrides = {}) {
  return {
    id: "12345678-aaaa-bbbb-cccc-123456789012",
    projectId: "p1",
    projectName: "Family Villa",
    itemName: "Steel Bars",
    supplierName: "",
    actualUnitCost: 0,
    estimatedUnitCost: 100,
    status: "draft",
    deliveryStatus: "pending",
    updatedAt: "2026-08-06T01:00:00Z",
    ...overrides,
  };
}

test("builds purchaser summary from persisted purchase and delivery states", () => {
  const summary = buildPurchaserSummary([
    record(),
    record({ id: "2", status: "ordered", supplierName: "ABC", actualUnitCost: 120 }),
    record({ id: "3", status: "received", deliveryStatus: "delivered" }),
    record({ id: "4", status: "cancelled" }),
  ]);
  assert.deepEqual(summary, {
    approvedRequests: 3,
    needPricing: 2,
    activeOrders: 2,
    deliveriesAwaitingUpdate: 1,
  });
});

test("filters purchaser records by selected project", () => {
  const records = [record(), record({ id: "2", projectId: "p2" })];
  assert.equal(filterPurchaserRecords(records, "all").length, 2);
  assert.deepEqual(filterPurchaserRecords(records, "p2").map((item) => item.id), ["2"]);
});

test("describes and orders recent procurement state", () => {
  const activity = buildPurchaserActivity([
    record({ id: "older", updatedAt: "2026-08-04T00:00:00Z" }),
    record({ id: "priced", supplierName: "ABC", actualUnitCost: 90, updatedAt: "2026-08-05T00:00:00Z" }),
    record({ id: "received", status: "received", updatedAt: "2026-08-06T00:00:00Z" }),
  ]);
  assert.deepEqual(activity.map((item) => item.id), ["received", "priced", "older"]);
  assert.equal(activity[0].title, "Purchase received");
  assert.equal(activity[1].title, "Supplier pricing recorded");
});

test("creates a stable display code without inventing a stored PO number", () => {
  assert.equal(purchaseOrderCode("12345678-aaaa-bbbb-cccc"), "PO-12345678");
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const test = require("node:test");
const ts = require("typescript");

function loadTypeScriptModule(relativePath) {
  const sourcePath = path.resolve(__dirname, relativePath);
  const compiledSource = ts.transpileModule(fs.readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  const compiledModule = new Module(sourcePath, module);
  compiledModule.filename = sourcePath;
  compiledModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
  compiledModule._compile(compiledSource, sourcePath);
  return compiledModule.exports;
}

const {
  buildEngineerDashboardAlerts,
  calculateActualSpending,
  calculateWeightedProgress,
} = loadTypeScriptModule("../features/engineer-dashboard/utils/engineerDashboard.ts");

test("calculates weighted project progress from persisted activities", () => {
  assert.equal(calculateWeightedProgress([
    { weight_percent: 40, progress_percent: 100 },
    { weight_percent: 60, progress_percent: 50 },
  ]), 70);
  assert.equal(calculateWeightedProgress([]), 0);
});

test("sums actual spending across linked budget records", () => {
  assert.equal(calculateActualSpending([
    { budget_items: [{ actual_spent: 1200 }, { actual_spent: 800 }] },
    { budget_items: [{ actual_spent: 500 }] },
  ]), 2500);
  assert.equal(calculateActualSpending(null), 0);
});

test("builds only real rejected and overdue workflow alerts", () => {
  const alerts = buildEngineerDashboardAlerts({
    today: new Date("2026-08-05T00:00:00Z"),
    projects: [{ id: "p1", name: "Villa", location: "Site", status: "active", progress: 60, budget: 1, spent: 0, startDate: "2026-01-01", endDate: "2026-07-01" }],
    requests: [{ id: "r1", projectId: "p1", projectName: "Villa", materialName: "Steel", quantity: 4, unit: "pcs", status: "rejected", createdAt: "2026-08-02" }],
    estimates: [{ id: "e1", projectId: "p1", projectName: "Villa", status: "rejected", rejectionReason: "Revise quantities", updatedAt: "2026-08-03" }],
  });
  assert.deepEqual(alerts.map((alert) => alert.kind), ["estimate", "material", "schedule"]);
  assert.equal(alerts[0].detail, "Revise quantities");
});

test("does not report completed or on-time projects as overdue", () => {
  const base = { location: "Site", progress: 50, budget: 1, spent: 0, startDate: "2026-01-01" };
  const alerts = buildEngineerDashboardAlerts({
    today: new Date("2026-08-05T00:00:00Z"),
    projects: [
      { ...base, id: "p1", name: "Done", status: "completed", endDate: "2026-01-01" },
      { ...base, id: "p2", name: "Current", status: "active", endDate: "2026-09-01" },
    ],
    requests: [],
    estimates: [],
  });
  assert.equal(alerts.length, 0);
});

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
  buildProjectScheduleSummary,
  buildProjectWorkflowActivity,
} = loadTypeScriptModule("../features/projects/utils/engineerProjectOverview.ts");

test("reports completed, overdue, and remaining schedule states", () => {
  const now = new Date("2026-08-05T00:00:00Z");
  assert.equal(buildProjectScheduleSummary({ status: "completed", progress: 100, endDate: "2026-07-01", now }).state, "completed");
  const overdue = buildProjectScheduleSummary({ status: "active", progress: 80, endDate: "2026-08-02", now });
  assert.equal(overdue.state, "overdue");
  assert.match(overdue.label, /days? overdue/);
  const remaining = buildProjectScheduleSummary({ status: "active", progress: 80, endDate: "2026-08-10", now });
  assert.equal(remaining.state, "remaining");
  assert.match(remaining.label, /days? remaining/);
});

test("handles an invalid project target date explicitly", () => {
  assert.equal(buildProjectScheduleSummary({ status: "active", progress: 20, endDate: "invalid" }).state, "unavailable");
});

test("combines and sorts persisted progress and material activity", () => {
  const activity = buildProjectWorkflowActivity({
    submissions: [{ id: "s1", activity_count: 3, submitted_at: "2026-08-02T00:00:00Z" }],
    requests: [{ id: "m1", material_name: "Cement", status: "approved", created_at: "2026-08-03T00:00:00Z" }],
  });
  assert.deepEqual(activity.map((item) => item.type), ["material", "progress"]);
  assert.equal(activity[0].detail, "Cement");
  assert.match(activity[1].detail, /3 weighted activities/);
});

test("returns an empty recent activity list when no records exist", () => {
  assert.deepEqual(buildProjectWorkflowActivity({ submissions: [], requests: [] }), []);
});

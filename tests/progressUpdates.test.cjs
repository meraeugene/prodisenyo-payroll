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
  getLatestProgressUpdatePercentage,
  normalizeProgressUpdateInput,
  selectLatestProgressUpdate,
} = loadTypeScriptModule("../features/projects/utils/progressUpdates.ts");

test("normalizes a separate overall progress update", () => {
  assert.deepEqual(normalizeProgressUpdateInput({
    projectId: " project-1 ",
    overallPercent: 48.126,
    completedWorkSummary: " Footing completed. ",
    remarks: " Next: columns. ",
  }), {
    projectId: "project-1",
    overallPercent: 48.13,
    completedWorkSummary: "Footing completed.",
    remarks: "Next: columns.",
  });
});

test("rejects invalid percentage and missing completed-work summary", () => {
  assert.throws(() => normalizeProgressUpdateInput({ projectId: "p1", overallPercent: 101, completedWorkSummary: "Work" }), /between 0 and 100/);
  assert.throws(() => normalizeProgressUpdateInput({ projectId: "p1", overallPercent: 50, completedWorkSummary: " " }), /summary is required/);
});

test("stores blank remarks as null", () => {
  assert.equal(normalizeProgressUpdateInput({ projectId: "p1", overallPercent: 0, completedWorkSummary: "Mobilization", remarks: " " }).remarks, null);
});
test("uses the newest persisted progress update for the CEO overview", () => {
  const updates = [
    { id: "older", overall_percent: 88, created_at: "2026-08-04T00:00:00Z" },
    { id: "newer", overall_percent: 42.4, created_at: "2026-08-06T00:00:00Z" },
  ];
  assert.equal(selectLatestProgressUpdate(updates).id, "newer");
  assert.equal(getLatestProgressUpdatePercentage(updates), 42);
});

test("shows no overall percentage when a project has no progress update", () => {
  assert.equal(selectLatestProgressUpdate([]), null);
  assert.equal(getLatestProgressUpdatePercentage([]), null);
});
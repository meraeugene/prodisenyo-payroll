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
  getMaterialApprovalBucket,
  getMaterialWorkflowLabel,
  mapMaterialApprovalDialogRequest,
} = loadTypeScriptModule("../features/material-approvals/utils/materialApproval.ts");

test("groups persisted material workflow statuses for CEO filters", () => {
  assert.equal(getMaterialApprovalBucket("submitted"), "pending");
  assert.equal(getMaterialApprovalBucket("purchasing"), "approved");
  assert.equal(getMaterialApprovalBucket("received"), "approved");
  assert.equal(getMaterialApprovalBucket("rejected"), "rejected");
});

test("maps a live project request into the existing CEO review dialog", () => {
  const mapped = mapMaterialApprovalDialogRequest({
    projectName: "Gakutno",
    requestedBy: "Project Engineer",
    request: {
      id: "r1",
      material_name: "Cement",
      quantity: 50,
      unit: "bags",
      needed_by: "2026-08-20",
      priority: "high",
      notes: "Footings",
      status: "submitted",
      created_at: "2026-08-07T00:00:00Z",
    },
  });
  assert.equal(mapped.materialName, "Cement");
  assert.equal(mapped.status, "pending");
  assert.equal(mapped.requestedBy, "Project Engineer");
});

test("uses explicit labels for downstream purchasing states", () => {
  assert.equal(getMaterialWorkflowLabel("purchasing"), "Sent to purchasing");
  assert.equal(getMaterialWorkflowLabel("ordered"), "Ordered");
});


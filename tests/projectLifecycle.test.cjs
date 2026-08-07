const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadModule(relativePath) {
  const filename = path.join(process.cwd(), relativePath);
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const compiledModule = { exports: {} };
  Function("module", "exports", "require", output)(
    compiledModule,
    compiledModule.exports,
    require,
  );
  return compiledModule.exports;
}

const {
  getProjectEntryHref,
  getProjectEntryLabel,
  canUseOperationalMutations,
} = loadModule("features/projects/utils/projectLifecycle.ts");

test("routes engineer planning records to cost estimation instead of project details", () => {
  assert.equal(
    getProjectEntryHref({ role: "engineer", projectId: "p1", status: "planning" }),
    "/cost-estimator?projectId=p1",
  );
  assert.equal(getProjectEntryLabel("engineer", "planning"), "Cost Estimate");
});

test("routes CEO planning records to estimate review and activation", () => {
  assert.equal(
    getProjectEntryHref({ role: "ceo", projectId: "p1", status: "planning" }),
    "/projects/p1",
  );
  assert.equal(getProjectEntryLabel("ceo", "planning"), "Review Estimate");
});

test("unlocks operational mutations only after activation", () => {
  assert.equal(canUseOperationalMutations("planning"), false);
  assert.equal(canUseOperationalMutations("active"), true);
  assert.equal(canUseOperationalMutations("on_hold"), true);
  assert.equal(canUseOperationalMutations("completed"), false);
});

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
  CEO_PROJECT_WORKSPACE_TABS,
  ENGINEER_PROJECT_WORKSPACE_TABS,
  resolveProjectWorkspaceTab,
} = loadTypeScriptModule("../features/projects/utils/workspaceTabs.ts");

test("project workspaces do not expose a purchasing tab", () => {
  assert.equal(CEO_PROJECT_WORKSPACE_TABS.includes("purchasing"), false);
  assert.equal(ENGINEER_PROJECT_WORKSPACE_TABS.includes("purchasing"), false);
});

test("legacy purchasing links resolve to materials", () => {
  assert.equal(
    resolveProjectWorkspaceTab("purchasing", CEO_PROJECT_WORKSPACE_TABS),
    "materials",
  );
  assert.equal(
    resolveProjectWorkspaceTab("purchasing", ENGINEER_PROJECT_WORKSPACE_TABS),
    "materials",
  );
});

test("unknown project tabs fall back to overview", () => {
  assert.equal(
    resolveProjectWorkspaceTab("unsupported", CEO_PROJECT_WORKSPACE_TABS),
    "overview",
  );
});

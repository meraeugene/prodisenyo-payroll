const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");

function loadUtility() {
  const file = path.join(process.cwd(), "features/project-activity-log/utils/activityLog.ts");
  const source = fs.readFileSync(file, "utf8").replace(/^import type .*;\r?\n/gm, "");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(output, { module: compiledModule, exports: compiledModule.exports, Date, Number });
  return compiledModule.exports;
}

const utility = loadUtility();

test("combines and sorts only persisted project activity sources", () => {
  const events = utility.buildProjectActivityLog({
    engineerName: "Engineer One",
    progressUpdates: [{ id: "p", overall_percent: 40, completed_work_summary: "Footings done", created_at: "2026-08-04T10:00:00Z" }],
    progressSubmissions: [{ id: "s", activity_count: 2, submitted_at: "2026-08-03T10:00:00Z" }],
    materialRequests: [{ id: "m", material_name: "Cement", status: "approved", created_at: "2026-08-02T10:00:00Z" }],
    documents: [{ id: "d", uploader_name: "Engineer One", file_name: "Plan.pdf", category: "plans", created_at: "2026-08-05T10:00:00Z" }],
  });
  assert.deepEqual(Array.from(events, (event) => event.type), ["document-upload", "progress-update", "activity-submission", "material-request"]);
});

test("counts supported project activity types", () => {
  const counts = utility.countProjectActivityTypes([
    { type: "progress-update" }, { type: "progress-update" }, { type: "document-upload" },
  ]);
  assert.equal(counts["progress-update"], 2);
  assert.equal(counts["document-upload"], 1);
  assert.equal(counts["material-request"], 0);
});


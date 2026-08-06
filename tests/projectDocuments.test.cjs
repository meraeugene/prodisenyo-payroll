const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");

function loadUtility() {
  const file = path.join(process.cwd(), "features/project-documents/utils/documentValidation.ts");
  let source = fs.readFileSync(file, "utf8").replace(/import[\s\S]*?from "\.\.\/types";\n/, "const PROJECT_DOCUMENT_CATEGORIES = ['plans','reports','permits','contracts','photos','forms','other'];\n");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(output, { module: compiledModule, exports: compiledModule.exports, Set, Error });
  return compiledModule.exports;
}

const utility = loadUtility();

test("accepts supported project documents", () => {
  assert.equal(utility.validateProjectDocument({ name: "plan.pdf", size: 1024, type: "application/pdf" }), "plan.pdf");
});

test("rejects oversized and unsupported project documents", () => {
  assert.throws(() => utility.validateProjectDocument({ name: "plan.pdf", size: 11 * 1024 * 1024, type: "application/pdf" }), /10 MB/);
  assert.throws(() => utility.validateProjectDocument({ name: "script.exe", size: 100, type: "application/octet-stream" }), /PDF/);
});

test("normalizes categories and storage file names", () => {
  assert.equal(utility.parseProjectDocumentCategory("plans"), "plans");
  assert.equal(utility.parseProjectDocumentCategory("unknown"), "other");
  assert.equal(utility.sanitizeStorageFileName(" Site Plan (Final).pdf "), "Site-Plan-Final-.pdf");
});


const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");

function loadUtility(relativePath) {
  const source = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(output, {
    module: loadedModule,
    exports: loadedModule.exports,
    Set,
    Map,
    Error,
  });
  return loadedModule.exports;
}

const validation = loadUtility(
  "features/purchasing-approvals/utils/receiptValidation.ts",
);
const evidence = loadUtility(
  "features/purchasing-approvals/utils/receiptEvidence.ts",
);

test("accepts supported receipt files", () => {
  assert.equal(
    validation.validatePurchaseReceipt({
      name: "invoice-204.pdf",
      size: 2048,
      type: "application/pdf",
    }),
    "invoice-204.pdf",
  );
});

test("rejects unsafe and oversized receipt files", () => {
  assert.throws(
    () =>
      validation.validatePurchaseReceipt({
        name: "invoice.exe",
        size: 100,
        type: "application/octet-stream",
      }),
    /PDF/,
  );
  assert.throws(
    () =>
      validation.validatePurchaseReceipt({
        name: "invoice.pdf",
        size: 11 * 1024 * 1024,
        type: "application/pdf",
      }),
    /10 MB/,
  );
});

test("uses the newest receipt evidence for each purchase order", () => {
  const map = evidence.buildPurchaseReceiptEvidenceMap([
    {
      id: "new",
      entity_id: "order-1",
      file_name: "new.pdf",
      content_type: "application/pdf",
      created_at: "2026-08-08T02:00:00Z",
    },
    {
      id: "old",
      entity_id: "order-1",
      file_name: "old.pdf",
      content_type: "application/pdf",
      created_at: "2026-08-07T02:00:00Z",
    },
  ]);

  assert.equal(map.get("order-1").id, "new");
  assert.equal(map.get("order-1").fileName, "new.pdf");
});

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadModule(relativePath) {
  const filename = path.join(process.cwd(), relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
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

const { buildPlannedMaterialRows, validatePlannedRequestQuantity } = loadModule(
  "features/material-requests/utils/plannedMaterials.ts",
);

test("builds remaining planned quantity from non-cancelled linked requests", () => {
  const rows = buildPlannedMaterialRows(
    "estimate-1",
    [{
      id: "item-1", estimate_id: "estimate-1", item_name_snapshot: "Structural steel",
      material_name_snapshot: "Steel bars", category_snapshot: "materials",
      unit_label_snapshot: "pcs", unit_cost_snapshot: 100, quantity: 120,
      line_total: 12000, pricing_basis: "supplier_quote",
      reference_supplier: "Steel Co", reference_quotation: "Q-100",
    }],
    [
      { estimate_item_id: "item-1", quantity: 40, status: "submitted" },
      { estimate_item_id: "item-1", quantity: 10, status: "rejected" },
    ],
  );
  assert.equal(rows[0].requestedQuantity, 40);
  assert.equal(rows[0].remainingQuantity, 80);
  assert.equal(rows[0].referenceQuotation, "Q-100");
});

test("excludes non-material and inactive-estimate lines", () => {
  const base = {
    id: "item", estimate_id: "estimate-1", item_name_snapshot: "Labor",
    material_name_snapshot: "Crew", category_snapshot: "labor", unit_label_snapshot: "day",
    unit_cost_snapshot: 1, quantity: 1, line_total: 1,
  };
  assert.deepEqual(buildPlannedMaterialRows("estimate-1", [base], []), []);
  assert.deepEqual(buildPlannedMaterialRows("estimate-2", [{ ...base, category_snapshot: "materials" }], []), []);
});

test("rejects planned quantities above the remaining approved amount", () => {
  assert.match(validatePlannedRequestQuantity(11, 10), /exceeds/);
  assert.equal(validatePlannedRequestQuantity(10, 10), null);
});

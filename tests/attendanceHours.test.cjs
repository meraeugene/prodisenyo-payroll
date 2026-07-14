const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const test = require("node:test");
const ts = require("typescript");

function loadTypeScriptModule(relativePath) {
  const sourcePath = path.resolve(__dirname, relativePath);
  const source = fs.readFileSync(sourcePath, "utf8");
  const compiledSource = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2017,
    },
  }).outputText;
  const compiledModule = new Module(sourcePath, module);

  compiledModule.filename = sourcePath;
  compiledModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
  compiledModule._compile(compiledSource, sourcePath);

  return compiledModule.exports;
}

const { calculateDailyWorkMinutes } = loadTypeScriptModule("../lib/utils.ts");
const {
  calculatePaidRegularHours,
  DEFAULT_REGULAR_PAID_HOURS,
} = loadTypeScriptModule("../features/payroll/utils/branchRateConfig.ts");

test("keeps attendance regular hours as the actual shift span", () => {
  assert.deepEqual(
    calculateDailyWorkMinutes({ time1In: "07:49", time2Out: "16:29" }),
    { regularMinutes: 520, overtimeMinutes: 0, totalMinutes: 520 },
  );
});

test("keeps recorded lunch time in the actual attendance span", () => {
  assert.equal(
    calculateDailyWorkMinutes({
      time1In: "07:30",
      time1Out: "12:00",
      time2In: "13:00",
      time2Out: "16:30",
    }).regularMinutes,
    540,
  );
});

test("deducts one unpaid hour for each worked day in payroll", () => {
  assert.equal(
    calculatePaidRegularHours(8.67, DEFAULT_REGULAR_PAID_HOURS),
    7.67,
  );
  assert.equal(
    Array.from({ length: 5 }, () =>
      calculatePaidRegularHours(8.67, DEFAULT_REGULAR_PAID_HOURS),
    ).reduce((sum, hours) => sum + hours, 0),
    38.35,
  );
});

test("keeps overtime separate from actual and paid regular hours", () => {
  assert.deepEqual(
    calculateDailyWorkMinutes({
      time1In: "07:30",
      time2Out: "16:30",
      otIn: "18:00",
      otOut: "20:00",
    }),
    { regularMinutes: 540, overtimeMinutes: 120, totalMinutes: 660 },
  );
});

test("does not calculate negative hours for incomplete or invalid regular punches", () => {
  assert.deepEqual(
    calculateDailyWorkMinutes({ time1In: "07:30" }),
    { regularMinutes: 0, overtimeMinutes: 0, totalMinutes: 0 },
  );
  assert.deepEqual(
    calculateDailyWorkMinutes({ time1In: "16:30", time2Out: "07:30" }),
    { regularMinutes: 0, overtimeMinutes: 0, totalMinutes: 0 },
  );
});

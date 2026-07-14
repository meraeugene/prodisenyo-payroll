const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const test = require("node:test");
const ts = require("typescript");

function loadAttendanceCalculator() {
  const sourcePath = path.resolve(__dirname, "../lib/utils.ts");
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

  return compiledModule.exports.calculateDailyWorkMinutes;
}

const calculateDailyWorkMinutes = loadAttendanceCalculator();

test("deducts the mandatory unpaid hour when lunch punches are missing", () => {
  assert.deepEqual(
    calculateDailyWorkMinutes({ time1In: "07:49", time2Out: "16:29" }),
    { regularMinutes: 460, overtimeMinutes: 0, totalMinutes: 460 },
  );
});

test("deducts a precisely one-hour recorded lunch break", () => {
  assert.equal(
    calculateDailyWorkMinutes({
      time1In: "07:30",
      time1Out: "12:00",
      time2In: "13:00",
      time2Out: "16:30",
    }).regularMinutes,
    480,
  );
});

test("deducts a longer recorded lunch break in full", () => {
  assert.equal(
    calculateDailyWorkMinutes({
      time1In: "07:30",
      time1Out: "12:00",
      time2In: "13:30",
      time2Out: "16:30",
    }).regularMinutes,
    450,
  );
});

test("enforces the one-hour minimum when the recorded lunch is shorter", () => {
  assert.equal(
    calculateDailyWorkMinutes({
      time1In: "07:30",
      time1Out: "12:00",
      time2In: "12:30",
      time2Out: "16:30",
    }).regularMinutes,
    480,
  );
});

test("keeps overtime separate from the unpaid regular break", () => {
  assert.deepEqual(
    calculateDailyWorkMinutes({
      time1In: "07:30",
      time2Out: "16:30",
      otIn: "18:00",
      otOut: "20:00",
    }),
    { regularMinutes: 480, overtimeMinutes: 120, totalMinutes: 600 },
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

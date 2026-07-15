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
const { calculateRegularPay } = loadTypeScriptModule("../lib/payrollHours.ts");

test("deducts lunch from the biometric span before displaying payable hours", () => {
  assert.deepEqual(
    calculateDailyWorkMinutes({ time1In: "07:49", time2Out: "16:29" }),
    {
      rawRegularMinutes: 520,
      lunchDeductionMinutes: 60,
      regularMinutes: 460,
      overtimeMinutes: 0,
      totalMinutes: 460,
    },
  );
});

test("produces exactly eight payable regular hours", () => {
  const result = calculateDailyWorkMinutes({
    time1In: "07:29",
    time2Out: "16:29",
  });
  assert.equal(result.regularMinutes, 480);
  assert.equal(result.overtimeMinutes, 0);
  assert.equal(result.totalMinutes, 480);
});

test("classifies payable main-shift time above eight hours as overtime", () => {
  const result = calculateDailyWorkMinutes({
    time1In: "07:39",
    time2Out: "16:42",
  });
  assert.equal(result.rawRegularMinutes, 543);
  assert.equal(result.regularMinutes, 480);
  assert.equal(result.overtimeMinutes, 3);
  assert.equal(result.totalMinutes, 483);
});

test("deducts one fixed hour even when lunch punches are recorded", () => {
  const result = calculateDailyWorkMinutes({
    time1In: "07:30",
    time1Out: "12:00",
    time2In: "13:00",
    time2Out: "16:30",
  });
  assert.equal(result.rawRegularMinutes, 540);
  assert.equal(result.regularMinutes, 480);
  assert.equal(result.totalMinutes, 480);
});

test("adds separate explicit overtime after derived main-shift overtime", () => {
  const result = calculateDailyWorkMinutes({
    time1In: "07:30",
    time2Out: "17:30",
    otIn: "18:00",
    otOut: "20:00",
  });
  assert.equal(result.regularMinutes, 480);
  assert.equal(result.overtimeMinutes, 180);
  assert.equal(result.totalMinutes, 660);
});

test("does not double-count an explicit OT interval overlapping the main shift", () => {
  const result = calculateDailyWorkMinutes({
    time1In: "07:30",
    time2Out: "17:30",
    otIn: "16:00",
    otOut: "18:00",
  });
  assert.equal(result.regularMinutes, 480);
  assert.equal(result.overtimeMinutes, 60);
});

test("applies the selected lunch rule to short valid shifts", () => {
  assert.equal(
    calculateDailyWorkMinutes({ time1In: "08:00", time2Out: "12:00" })
      .totalMinutes,
    180,
  );
  const underOneHour = calculateDailyWorkMinutes({
    time1In: "08:00",
    time2Out: "08:30",
  });
  assert.equal(underOneHour.lunchDeductionMinutes, 30);
  assert.equal(underOneHour.totalMinutes, 0);
});

test("does not calculate negative hours for incomplete or invalid regular punches", () => {
  assert.deepEqual(
    calculateDailyWorkMinutes({ time1In: "07:30" }),
    {
      rawRegularMinutes: 0,
      lunchDeductionMinutes: 0,
      regularMinutes: 0,
      overtimeMinutes: 0,
      totalMinutes: 0,
    },
  );
  assert.deepEqual(
    calculateDailyWorkMinutes({ time1In: "16:30", time2Out: "07:30" }),
    {
      rawRegularMinutes: 0,
      lunchDeductionMinutes: 0,
      regularMinutes: 0,
      overtimeMinutes: 0,
      totalMinutes: 0,
    },
  );
});

test("uses adjusted attendance hours directly for multi-day regular pay", () => {
  const shifts = [
    ["07:49", "16:29"],
    ["07:29", "16:29"],
    ["07:39", "16:42"],
  ];
  const regularHours = shifts.reduce(
    (sum, [time1In, time2Out]) =>
      sum + calculateDailyWorkMinutes({ time1In, time2Out }).regularMinutes / 60,
    0,
  );
  assert.equal(Math.round(regularHours * 100) / 100, 23.67);
  assert.equal(
    Math.round(calculateRegularPay(600, regularHours, 8) * 100) / 100,
    1775,
  );
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const test = require("node:test");
const ts = require("typescript");

function loadTypeScriptModule(relativePath, dependencies = {}) {
  const sourcePath = path.resolve(__dirname, relativePath);
  const source = fs.readFileSync(sourcePath, "utf8");
  const compiledSource = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const compiledModule = new Module(sourcePath, module);
  compiledModule.filename = sourcePath;
  compiledModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
  const defaultRequire = compiledModule.require.bind(compiledModule);
  compiledModule.require = (request) =>
    Object.prototype.hasOwnProperty.call(dependencies, request)
      ? dependencies[request]
      : defaultRequire(request);
  compiledModule._compile(compiledSource, sourcePath);
  return compiledModule.exports;
}

const engine = loadTypeScriptModule(
  "../features/payroll/utils/payrollAttendanceEngine.ts",
);
const reconciliation = loadTypeScriptModule(
  "../features/payroll/utils/payrollReconciliation.ts",
  {
    "@/features/payroll/utils/payrollAttendanceEngine": engine,
  },
);

const fullWeekSchedule = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  isWorkday: dayOfWeek !== 0,
  standardSeconds: 8 * 3600,
  breakSeconds: 3600,
}));

function oneDay(overrides = {}) {
  return engine.buildCutoffAttendance({
    periodStart: "2026-06-16",
    periodEnd: "2026-06-16",
    schedule: fullWeekSchedule,
    ...overrides,
  })[0];
}

function decision(date, classification, hours, extra = {}) {
  return {
    date,
    classification,
    approvedRegularSeconds: engine.decimalHoursToSeconds(hours),
    approvedOvertimeSeconds: 0,
    overtimeStatus: "rejected",
    reason: "Payroll review",
    source: "manual",
    ...extra,
  };
}

test("normal biometric workday preserves evidence and calculated payable time", () => {
  const day = oneDay({
    biometricDays: [{
      date: "2026-06-16",
      timeIn: "07:57",
      timeOut: "16:34",
      rawWorkedSeconds: 517 * 60,
      breakSeconds: 3600,
      calculatedRegularSeconds: 457 * 60,
      detectedOvertimeSeconds: 0,
    }],
  });
  assert.equal(day.classification, "WORKED");
  assert.equal(day.biometricWorkedSeconds, 517 * 60);
  assert.equal(day.approvedRegularSeconds, 457 * 60);
});

test("no biometric remains reviewable and is not automatically absent", () => {
  const day = oneDay();
  assert.equal(day.classification, "NO_BIOMETRIC");
  assert.equal(day.needsReview, true);
});

test("absent and unpaid leave are explicitly unpaid", () => {
  for (const classification of ["ABSENT", "UNPAID_LEAVE"]) {
    const day = oneDay({
      decisions: { "2026-06-16": decision("2026-06-16", classification, 0) },
    });
    assert.equal(day.approvedRegularSeconds, 0);
  }
});

test("configured rest day is generated without biometric data", () => {
  const day = engine.buildCutoffAttendance({
    periodStart: "2026-06-14",
    periodEnd: "2026-06-14",
    schedule: fullWeekSchedule,
  })[0];
  assert.equal(day.classification, "REST_DAY");
  assert.equal(day.needsReview, false);
});

test("regular holiday and paid leave receive configured payable time", () => {
  const holiday = oneDay({
    holidays: [{
      date: "2026-06-16",
      classification: "REGULAR_HOLIDAY",
      payableSeconds: 8 * 3600,
    }],
  });
  const leave = oneDay({
    leaves: [{
      date: "2026-06-16",
      classification: "PAID_LEAVE",
      payableSeconds: 8 * 3600,
    }],
  });
  assert.equal(holiday.approvedRegularSeconds, 8 * 3600);
  assert.equal(leave.approvedRegularSeconds, 8 * 3600);
});

test("manual attendance and forgot-to-log preserve raw biometric evidence", () => {
  for (const classification of ["MANUAL_ATTENDANCE", "FORGOT_TO_LOG"]) {
    const day = oneDay({
      biometricDays: [{
        date: "2026-06-16",
        rawWorkedSeconds: 444 * 60,
        breakSeconds: 3600,
        calculatedRegularSeconds: 384 * 60,
        detectedOvertimeSeconds: 0,
      }],
      decisions: {
        "2026-06-16": decision("2026-06-16", classification, 8),
      },
    });
    assert.equal(day.biometricWorkedSeconds, 444 * 60);
    assert.equal(day.approvedRegularSeconds, 8 * 3600);
    assert.equal(day.isManualOverride, true);
  }
});

test("manual overrides require a reason", () => {
  assert.throws(
    () => engine.validateAttendanceDecision("MANUAL_ATTENDANCE", 8 * 3600, ""),
    /reason is required/i,
  );
});

test("approved overtime is payable while rejected overtime is not", () => {
  const baseBiometric = [{
    date: "2026-06-16",
    rawWorkedSeconds: 9 * 3600,
    breakSeconds: 3600,
    calculatedRegularSeconds: 8 * 3600,
    detectedOvertimeSeconds: 3600,
  }];
  const approved = oneDay({
    biometricDays: baseBiometric,
    decisions: {
      "2026-06-16": decision("2026-06-16", "WORKED", 8, {
        approvedOvertimeSeconds: 3600,
        overtimeStatus: "approved",
      }),
    },
  });
  const rejected = oneDay({
    biometricDays: baseBiometric,
    decisions: {
      "2026-06-16": decision("2026-06-16", "WORKED", 8),
    },
  });
  assert.equal(approved.approvedOvertimeSeconds, 3600);
  assert.equal(rejected.approvedOvertimeSeconds, 0);
});

test("allowance, cash advance, and deduction remain separate records", () => {
  const calculation = engine.calculateReviewedPayroll({
    days: [oneDay({ decisions: { "2026-06-16": decision("2026-06-16", "WORKED", 8) } })],
    dailyRateCentavos: 50_000,
    standardDaySeconds: 8 * 3600,
    adjustments: [
      { category: "allowance", amountCentavos: 10_000 },
      { category: "cash_advance", amountCentavos: 5_000 },
      { category: "deduction", amountCentavos: 2_500 },
    ],
  });
  assert.equal(calculation.grossPayCentavos, 60_000);
  assert.equal(calculation.netPayCentavos, 52_500);
});

test("mixed cutoff contains every date including dates without biometric rows", () => {
  const days = engine.buildCutoffAttendance({
    periodStart: "2026-06-11",
    periodEnd: "2026-06-25",
    schedule: fullWeekSchedule,
  });
  assert.equal(days.length, 15);
  assert.equal(days[0].date, "2026-06-11");
  assert.equal(days[14].date, "2026-06-25");
});

test("money rounds once from precise integer seconds", () => {
  const days = [oneDay({
    decisions: {
      "2026-06-16": decision("2026-06-16", "WORKED", 7.59),
    },
  })];
  const calculation = engine.calculateReviewedPayroll({
    days,
    dailyRateCentavos: 50_000,
    standardDaySeconds: 8 * 3600,
  });
  assert.equal(calculation.netPayCentavos, 47_438);
});

test("approved payroll cannot silently change", () => {
  assert.throws(() => engine.assertPayrollMutable("approved"), /locked/i);
  assert.doesNotThrow(() => engine.assertPayrollMutable("draft"));
});

test("Shawn fixture exposes the unsupported centavo discrepancy", () => {
  const visible = [8, 8, 0, 0, 8, 7.6, 7.5, 7.3, 7.5, 7.6, 0, 8, 7.1, 8, 8];
  const classifications = [
    "MANUAL_ATTENDANCE", "REGULAR_HOLIDAY", "ABSENT", "REST_DAY",
    "MANUAL_ATTENDANCE", "WORKED", "WORKED", "WORKED", "WORKED",
    "WORKED", "REST_DAY", "WORKED", "WORKED", "WORKED", "WORKED",
  ];
  const decisions = {};
  visible.forEach((hours, index) => {
    const date = `2026-06-${String(index + 11).padStart(2, "0")}`;
    decisions[date] = decision(date, classifications[index], hours);
  });
  const days = engine.buildCutoffAttendance({
    periodStart: "2026-06-11",
    periodEnd: "2026-06-25",
    schedule: fullWeekSchedule,
    decisions,
  });
  const calculation = engine.calculateReviewedPayroll({
    days,
    dailyRateCentavos: 50_000,
    standardDaySeconds: 8 * 3600,
    regularHolidayMultiplierBasisPoints: 10_000,
  });
  assert.equal(calculation.netPayCentavos, 578_750);
  const result = reconciliation.reconcilePayroll({
    calculation,
    manualExpectedPayCentavos: 578_688,
  });
  assert.equal(result.differenceCentavos, -62);
  assert.equal(result.categories[0].category, "Unexplained precision / rounding");
});

test("the engine reproduces the manual net when approved precision totals 92.59 hours", () => {
  const day = oneDay({
    decisions: {
      "2026-06-16": decision("2026-06-16", "WORKED", 92.59),
    },
  });
  const calculation = engine.calculateReviewedPayroll({
    days: [day],
    dailyRateCentavos: 50_000,
    standardDaySeconds: 8 * 3600,
  });
  assert.equal(calculation.netPayCentavos, 578_688);
});

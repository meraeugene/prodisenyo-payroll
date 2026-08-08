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
  buildAttendanceBatches,
  buildPayrollActivity,
  buildPayrollDashboardSummary,
  calculateApprovedPayrollOverview,
  getAttendanceBatchStatus,
} = loadTypeScriptModule("../features/payroll-dashboard/utils/payrollDashboard.ts");

function payrollRun(overrides = {}) {
  return {
    id: "run-1",
    attendanceImportId: "import-1",
    siteName: "Family Villa",
    periodLabel: "Aug 1 - Aug 7, 2026",
    status: "approved",
    grossTotal: 1200,
    netTotal: 1000,
    createdBy: "manager-1",
    submittedBy: "manager-1",
    approvedBy: "ceo-1",
    createdAt: "2026-08-07T01:00:00Z",
    submittedAt: "2026-08-07T02:00:00Z",
    approvedAt: "2026-08-07T03:00:00Z",
    rejectedAt: null,
    rejectionReason: null,
    updatedAt: "2026-08-07T03:00:00Z",
    ...overrides,
  };
}

test("maps attendance batches to supported workflow states", () => {
  assert.equal(getAttendanceBatchStatus(undefined), "ready");
  assert.equal(getAttendanceBatchStatus(payrollRun({ status: "draft" })), "draft");
  assert.equal(getAttendanceBatchStatus(payrollRun({ status: "submitted" })), "awaiting_ceo");
  assert.equal(getAttendanceBatchStatus(payrollRun({ status: "approved" })), "approved");
  assert.equal(getAttendanceBatchStatus(payrollRun({ status: "rejected" })), "returned");
});

test("counts all batches but only approved payroll in summary totals", () => {
  const imports = [
    { id: "import-1" },
    { id: "import-2" },
    { id: "import-3" },
  ];
  const summary = buildPayrollDashboardSummary(48, imports, [
    payrollRun(),
    payrollRun({ id: "run-2", attendanceImportId: "import-2", status: "submitted", netTotal: 999 }),
  ]);
  assert.deepEqual(summary, {
    totalEmployees: 48,
    attendanceBatches: 3,
    readyForPayroll: 1,
    awaitingCeo: 1,
    approvedNetPayroll: 1000,
  });
});

test("calculates approved payroll breakdown without submitted or rejected runs", () => {
  const overview = calculateApprovedPayrollOverview(
    [
      payrollRun(),
      payrollRun({ id: "submitted", status: "submitted", grossTotal: 9000, netTotal: 8000 }),
    ],
    [
      {
        payrollRunId: "run-1",
        regularPay: 800,
        overtimePay: 150,
        holidayPay: 50,
        deductionsTotal: 200,
        totalPay: 800,
      },
      {
        payrollRunId: "submitted",
        regularPay: 8000,
        overtimePay: 0,
        holidayPay: 0,
        deductionsTotal: 1000,
        totalPay: 7000,
      },
    ],
  );
  assert.equal(overview.approvedRunCount, 1);
  assert.equal(overview.grossPay, 1200);
  assert.equal(overview.regularPay, 800);
  assert.equal(overview.overtimePay, 150);
  assert.equal(overview.deductions, 200);
  assert.equal(overview.netPay, 1000);
  assert.equal(overview.hasPartialItemData, false);
});

test("builds batch counts and allows continuation only for the manager's latest batch", () => {
  const imports = [
    {
      id: "import-2", siteName: "South Villa", periodLabel: "Latest", uploadedBy: "manager-1",
      periodStart: null, periodEnd: null, createdAt: "2026-08-08T01:00:00Z",
    },
    {
      id: "import-1", siteName: "Family Villa", periodLabel: "Older", uploadedBy: "manager-1",
      periodStart: null, periodEnd: null, createdAt: "2026-08-01T01:00:00Z",
    },
  ];
  const batches = buildAttendanceBatches(imports, [], [
    { importId: "import-2", employeeId: "employee-1", employeeName: "A" },
    { importId: "import-2", employeeId: "employee-1", employeeName: "A" },
    { importId: "import-2", employeeId: null, employeeName: "B" },
  ], "manager-1");
  assert.equal(batches[0].employeeCount, 2);
  assert.equal(batches[0].recordCount, 3);
  assert.equal(batches[0].isLatestOwnedBatch, true);
  assert.equal(batches[1].isLatestOwnedBatch, false);
  assert.equal(batches[1].recordCount, null);
});

test("combines persisted attendance and payroll timestamps into recent activity", () => {
  const imports = [{
    id: "import-1", siteName: "Family Villa", periodLabel: "Week 1", uploadedBy: "manager-1",
    createdAt: "2026-08-06T01:00:00Z",
  }];
  const activity = buildPayrollActivity(
    imports,
    [payrollRun()],
    new Map([["manager-1", "Maria Santos"], ["ceo-1", "Company CEO"]]),
  );
  assert.equal(activity[0].type, "approved");
  assert.deepEqual(
    activity.map((item) => item.type),
    ["approved", "submitted", "created", "attendance"],
  );
  assert.equal(activity[0].actor, "Company CEO");
});

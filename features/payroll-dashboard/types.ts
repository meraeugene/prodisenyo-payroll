export type PayrollDashboardRunStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

export type AttendanceBatchStatus =
  | "ready"
  | "draft"
  | "awaiting_ceo"
  | "approved"
  | "returned";

export type PayrollDashboardImportRecord = {
  id: string;
  siteName: string;
  periodLabel: string;
  periodStart: string | null;
  periodEnd: string | null;
  uploadedBy: string;
  createdAt: string;
};

export type PayrollDashboardRunRecord = {
  id: string;
  attendanceImportId: string | null;
  siteName: string;
  periodLabel: string;
  periodStart: string | null;
  periodEnd: string | null;
  status: PayrollDashboardRunStatus;
  grossTotal: number;
  netTotal: number;
  createdBy: string;
  submittedBy: string | null;
  approvedBy: string | null;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  updatedAt: string;
};

export type PayrollDashboardItemRecord = {
  payrollRunId: string;
  regularPay: number;
  overtimePay: number;
  holidayPay: number;
  deductionsTotal: number;
  totalPay: number;
};

export type PayrollDashboardAttendanceRecord = {
  importId: string;
  employeeId: string | null;
  employeeName: string;
};

export type PayrollDashboardSummary = {
  totalEmployees: number;
  attendanceBatches: number;
  readyForPayroll: number;
  awaitingCeo: number;
  approvedNetPayroll: number;
};

export type PayrollDashboardBatch = {
  id: string;
  siteName: string;
  periodLabel: string;
  periodStart: string | null;
  periodEnd: string | null;
  employeeCount: number | null;
  recordCount: number | null;
  status: AttendanceBatchStatus;
  payrollRunId: string | null;
  isLatestOwnedBatch: boolean;
  createdAt: string;
};

export type PayrollDashboardOverview = {
  approvedRunCount: number;
  grossPay: number;
  regularPay: number;
  overtimePay: number;
  holidayPay: number;
  deductions: number;
  netPay: number;
  hasPartialItemData: boolean;
};

export type PayrollApprovalRow = {
  id: string;
  siteName: string;
  periodLabel: string;
  periodStart: string | null;
  periodEnd: string | null;
  submittedAt: string | null;
  netTotal: number;
};

export type ReturnedPayrollRow = PayrollApprovalRow & {
  rejectedAt: string | null;
  rejectionReason: string | null;
};

export type PayrollActivityType =
  | "attendance"
  | "created"
  | "submitted"
  | "approved"
  | "rejected";

export type PayrollActivityItem = {
  id: string;
  type: PayrollActivityType;
  title: string;
  detail: string;
  actor: string;
  createdAt: string;
};

export type PayrollDashboardData = {
  summary: PayrollDashboardSummary;
  recentBatches: PayrollDashboardBatch[];
  payrollOverview: PayrollDashboardOverview;
  awaitingApprovals: PayrollApprovalRow[];
  returnedSubmissions: ReturnedPayrollRow[];
  recentActivity: PayrollActivityItem[];
  hasOwnedAttendance: boolean;
};

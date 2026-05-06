import * as XLSX from "xlsx";
import type { PayrollRow } from "@/lib/payrollEngine";

function buildExportFilename(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `payroll-${yyyy}-${mm}-${dd}.xlsx`;
}

export function exportPayrollToExcel(rows: PayrollRow[], filename?: string): void {
  const records = rows.map((row) => ({
    Worker: row.worker,
    Role: row.role,
    Site: row.site,
    Date: row.date,
    Hours: row.hoursWorked,
    Rate: row.rate,
    "Overtime Hours": row.overtimeHours,
    "Regular Pay": row.regularPay,
    "Overtime Pay": row.overtimePay,
    Allowance: row.allowance ?? 0,
    "Gross Pay": row.grossPay ?? row.regularPay + row.overtimePay + (row.allowance ?? 0),
    Deductions: row.totalDeductions ?? 0,
    "Net Pay": row.totalPay,
  }));

  const worksheet = XLSX.utils.json_to_sheet(records);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll");
  XLSX.writeFile(workbook, filename || buildExportFilename());
}

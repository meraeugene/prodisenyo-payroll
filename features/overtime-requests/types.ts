import type { AdjustmentStatus, AppRole } from "@/types/database";

export interface OvertimeRequestRecord {
  id: string;
  requester_role: AppRole;
  requested_by: string;
  approved_by: string | null;
  employee_name: string;
  site_name: string;
  period_label: string | null;
  request_date: string;
  overtime_hours: number;
  amount: number;
  reason: string | null;
  status: AdjustmentStatus;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function formatOvertimeRequesterRole(role: AppRole): string {
  if (role === "payroll_manager") return "Payroll Manager";
  if (role === "engineer") return "Engineer";
  if (role === "employee") return "Employee";
  return "CEO";
}

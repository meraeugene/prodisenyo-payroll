export type WorkerRole = "D" | "L" | "E" | "PL" | "PA" | "FORE" | "S" | "UNK";
export type UserRole = "hr" | "finance";

export type LogType = "IN" | "OUT";
export type LogSource = "Time1" | "Time2" | "OT";

export interface AttendanceRecord {
  date: string;
  employee: string;
  workerName: string;
  role: WorkerRole;
  roleLabel: string;
  mergeKey: string;
  isShortName: boolean;
  logTime: string;
  type: LogType;
  site: string;
  source: LogSource;
}

export interface Employee {
  id: number;
  name: string;
  role: WorkerRole;
  roleLabel: string;
  label: string;
  mergeKey: string;
  site?: string;
  days: number;
  regularHours: number;
  overtimeHours: number;
  otHours: number;
  customRateDay: number | null;
  customRateHour: number | null;
}

export interface DailyLogRow {
  date: string;
  employee: string;
  workerName: string;
  role: WorkerRole;
  roleLabel: string;
  mergeKey: string;
  site: string;
  timeIn: string;
  timeOut: string;
  overtimeIn: string;
  overtimeOut: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
}

export interface RoleRateSetting {
  role: WorkerRole;
  label: string;
  dailyRate: number;
  hoursPerDay: number;
}

export interface PayrollSettingsState {
  roleRates: RoleRateSetting[];
}

export interface PayrollEntry {
  id: string;
  workerName: string;
  role: WorkerRole;
  roleLabel: string;
  mergeKey: string;
  site: string;
  date: string;
  hoursWorked: number;
  overtimeHours: number;
  rate: number;
  bonuses: number;
  deductions: number;
  regularPay: number;
  overtimePay: number;
  netPay: number;
  customRate: boolean;
}

export interface PayrollSummaryRow {
  workerName: string;
  role: WorkerRole;
  roleLabel: string;
  site: string;
  mergeKey: string;
  days: number;
  totalHours: number;
  rate: number;
  totalPay: number;
}

export interface PayrollSummary {
  totalEmployees: number;
  totalWorkers: number;
  totalDays: number;
  totalHours: number;
  totalGross: number;
  totalNetPay: number;
}

export interface EmployeeCalculated extends Employee {
  rateDay: number;
  rateHour: number;
  dayPay: number;
  hourPay: number;
  otPay: number;
  grossPay: number;
}

export interface PayrollConfig {
  defaultRateDay: number;
  defaultRateHour: number;
  otMultiplier: number;
  periodLabel: string;
}

export interface AuditLogEntry {
  id: string;
  user: string;
  worker: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedAt: string;
}

export type Step = 1 | 2 | 3;
export type Step2View = "daily" | "detailed";
export type Step2Sort = "date-asc" | "date-desc" | "name-asc" | "name-desc";

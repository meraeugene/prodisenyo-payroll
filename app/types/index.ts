export interface Employee {
  id: number;
  name: string;
  // dept: string;
  days: number;
  regularHours: number;
  otHours: number;
  customRateDay: number | null;
  customRateHour: number | null;
}

export type LogType = "IN" | "OUT";
export type LogSource = "Time1" | "Time2" | "OT";

export interface AttendanceRecord {
  date: string;
  employee: string;
  logTime: string;
  type: LogType;
  site: string;
  source: LogSource;
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

export interface PayrollSummary {
  totalEmployees: number;
  totalDays: number;
  totalHours: number;
  totalGross: number;
}

export type Step = 1 | 2 | 3 | 4;

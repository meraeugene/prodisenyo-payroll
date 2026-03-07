export interface EmployeeDailyLog {
  dateWeek: string;
  time1In: string;
  time1Out: string;
  time2In: string;
  time2Out: string;
  otIn: string;
  otOut: string;
}

export interface EmployeeCalcDetails {
  sourceSheet?: string;
  absencesDay?: number;
  leaveDay?: number;
  businessTripDay?: number;
  attendanceDay?: number;
  otNormalRaw?: string;
  otSpecialRaw?: string;
  otNormalHours?: number;
  otSpecialHours?: number;
  dailyLogs?: EmployeeDailyLog[];
}

export interface Employee {
  id: number;
  name: string;
  branch?: string;
  days: number;
  regularHours: number;
  otHours: number;
  customRateDay: number | null;
  customRateHour: number | null;
  calcDetails?: EmployeeCalcDetails;
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

export type Step = 1 | 2 | 3;

import { formatPayrollNumber } from "@/features/payroll/utils/payrollFormatters";

export const OVERTIME_ALERT_HOURS = 10;

export type AdjustmentFormType =
  | "cashAdvance"
  | "overtime"
  | "paidLeave"
  | null;

export function parseNonNegativeValue(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function createEntryId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function formatPeso(value: number): string {
  return `\u20B1${formatPayrollNumber(value)}`;
}

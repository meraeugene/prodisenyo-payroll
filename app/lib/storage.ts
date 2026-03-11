import type {
  AttendanceRecord,
  PayrollSettingsState,
  UserRole,
  WorkerRole,
} from "@/types";
import { ROLE_LABELS } from "@/app/lib/workers";

const ATTENDANCE_KEY = "prodisenyo.attendance.snapshot.v1";
const PAYROLL_SETTINGS_KEY = "prodisenyo.payroll.settings.v1";
const USER_ROLE_KEY = "prodisenyo.user.role.v1";

export interface AttendanceSnapshot {
  period: string;
  site: string;
  records: AttendanceRecord[];
  savedAt: string;
}

export const DEFAULT_DAILY_RATES: Record<string, number> = {
  D: 500,
  L: 450,
  E: 500,
  PL: 450,
  PA: 430,
  FORE: 625,
  S: 650,
  UNK: 450,
};

export function defaultPayrollSettings(): PayrollSettingsState {
  return {
    roleRates: [
      "D",
      "L",
      "E",
      "PL",
      "PA",
      "FORE",
      "S",
      "UNK",
    ].map((roleCode) => ({
      role: roleCode as WorkerRole,
      label: ROLE_LABELS[roleCode as WorkerRole],
      dailyRate: DEFAULT_DAILY_RATES[roleCode],
      hoursPerDay: 8,
    })),
  };
}

export function saveAttendanceSnapshot(snapshot: AttendanceSnapshot): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(snapshot));
}

export function loadAttendanceSnapshot(): AttendanceSnapshot | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ATTENDANCE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AttendanceSnapshot;
    if (!Array.isArray(parsed.records)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePayrollSettings(settings: PayrollSettingsState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PAYROLL_SETTINGS_KEY, JSON.stringify(settings));
}

export function loadPayrollSettings(): PayrollSettingsState {
  if (typeof window === "undefined") return defaultPayrollSettings();
  const raw = localStorage.getItem(PAYROLL_SETTINGS_KEY);
  if (!raw) return defaultPayrollSettings();

  try {
    const parsed = JSON.parse(raw) as PayrollSettingsState;
    if (!Array.isArray(parsed.roleRates)) return defaultPayrollSettings();
    const defaults = defaultPayrollSettings();
    const merged = defaults.roleRates.map((defaultRate) => {
      const custom = parsed.roleRates.find((item) => item.role === defaultRate.role);
      if (!custom) return defaultRate;
      return {
        ...defaultRate,
        dailyRate: Number.isFinite(custom.dailyRate)
          ? Math.max(0, custom.dailyRate)
          : defaultRate.dailyRate,
        hoursPerDay: Number.isFinite(custom.hoursPerDay)
          ? Math.max(1, custom.hoursPerDay)
          : defaultRate.hoursPerDay,
      };
    });

    return { roleRates: merged };
  } catch {
    return defaultPayrollSettings();
  }
}

export function saveUserRole(role: UserRole): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_ROLE_KEY, role);
}

export function loadUserRole(): UserRole {
  if (typeof window === "undefined") return "finance";
  const raw = localStorage.getItem(USER_ROLE_KEY);
  return raw === "hr" ? "hr" : "finance";
}

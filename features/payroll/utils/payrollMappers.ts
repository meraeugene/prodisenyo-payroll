import { normalizeRoleCode } from "@/lib/payrollConfig";
import type { DailyLogRow } from "@/types";

export function parsePayrollIdentity(employeeText: string): {
  role: string;
  name: string;
} {
  const normalizedEmployee = employeeText.replace(/\s+/g, " ").trim();
  const [firstToken, ...rest] = normalizedEmployee.split(" ");
  const roleFromPrefix = normalizeRoleCode(firstToken);

  if (roleFromPrefix && rest.length > 0) {
    return {
      role: roleFromPrefix,
      name: rest.join(" ").trim(),
    };
  }

  return {
    role: "UNKNOWN",
    name: normalizedEmployee,
  };
}

export function getLogOverrideKey(log: DailyLogRow): string {
  return `${log.date}|||${log.employee}|||${log.site}`;
}

export function parseTimeToDecimal(timeText: string): number | null {
  const match = timeText.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return Math.round((hours + minutes / 60) * 100) / 100;
}


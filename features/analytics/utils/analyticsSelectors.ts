import type { AttendanceRecord, Employee } from "@/types";

export interface BranchOvertimeRow {
  branch: string;
  hours: number;
}

export interface WorkforceByBranchRow {
  branch: string;
  employees: number;
}

export interface DailyLaborHoursRow {
  date: string;
  hours: number;
}

export interface TopOTEmployeeRow {
  name: string;
  hours: number;
}

export function selectOvertimeByBranch(
  employees: Employee[],
  records: AttendanceRecord[],
): BranchOvertimeRow[] {
  const map = new Map<string, number>();

  employees.forEach((employee) => {
    const rec = records.find(
      (record) =>
        record.employee.trim().toLowerCase() === employee.name.trim().toLowerCase(),
    );

    const branch = rec?.site?.split(" ")[0] ?? "Unknown";
    map.set(branch, (map.get(branch) ?? 0) + employee.otHours);
  });

  return Array.from(map.entries())
    .map(([branch, hours]) => ({
      branch,
      hours: Number(hours.toFixed(2)),
    }))
    .sort((a, b) => b.hours - a.hours);
}

export function selectWorkforceByBranch(
  records: AttendanceRecord[],
): WorkforceByBranchRow[] {
  const map = new Map<string, Set<string>>();

  records.forEach((record) => {
    const branch = record.site.split(" ")[0];
    if (!map.has(branch)) map.set(branch, new Set<string>());
    map.get(branch)?.add(record.employee);
  });

  return Array.from(map.entries())
    .map(([branch, set]) => ({
      branch,
      employees: set.size,
    }))
    .sort((a, b) => b.employees - a.employees);
}

export function selectDailyLaborHours(
  records: AttendanceRecord[],
): DailyLaborHoursRow[] {
  const map = new Map<string, number>();

  records.forEach((record) => {
    map.set(record.date, (map.get(record.date) ?? 0) + 1);
  });

  return Array.from(map.entries())
    .map(([date, logs]) => ({
      date,
      hours: logs / 2,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function selectTopOTEmployees(
  employees: Employee[],
): TopOTEmployeeRow[] {
  return [...employees]
    .sort((a, b) => b.otHours - a.otHours)
    .slice(0, 5)
    .map((employee) => ({
      name: employee.name,
      hours: employee.otHours,
    }));
}


"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartTooltip from "@/components/charts/ChartTooltip";
import type { AttendanceRecord, Employee } from "@/types";
import {
  selectDailyLaborHours,
  selectOvertimeByBranch,
  selectTopOTEmployees,
  selectWorkforceByBranch,
} from "@/features/analytics/utils/analyticsSelectors";

interface AttendanceAnalyticsSectionProps {
  employees: Employee[];
  records: AttendanceRecord[];
}

const BLUE_BRANCH_COLORS = [
  "#1D4ED8",
  "#2563EB",
  "#3B82F6",
  "#60A5FA",
  "#93C5FD",
  "#0EA5E9",
  "#38BDF8",
  "#0284C7",
  "#1E40AF",
  "#1D4ED8",
];

function getBranchColor(index: number) {
  return BLUE_BRANCH_COLORS[index % BLUE_BRANCH_COLORS.length];
}

function extractBranchName(value: string): string {
  if (!value) return "";
  return value.trim().split(/\s+/)[0].toUpperCase();
}

function shorten(value: string, max = 18): string {
  if (!value) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export default function AttendanceAnalyticsSection({
  employees,
  records,
}: AttendanceAnalyticsSectionProps) {
  const overtimeByBranch = useMemo(
    () =>
      selectOvertimeByBranch(employees, records).map((item, index) => ({
        ...item,
        shortBranch: extractBranchName(item.branch),
        fill: getBranchColor(index),
      })),
    [employees, records],
  );

  const workforceByBranch = useMemo(
    () =>
      selectWorkforceByBranch(records).map((item, index) => ({
        ...item,
        shortBranch: extractBranchName(item.branch),
        fill: getBranchColor(index),
      })),
    [records],
  );

  const dailyLaborHours = useMemo(
    () => selectDailyLaborHours(records),
    [records],
  );

  const topOTEmployees = useMemo(
    () =>
      selectTopOTEmployees(employees).map((item, index) => ({
        ...item,
        name: shorten(item.name, 22),
        fill: getBranchColor(index),
      })),
    [employees],
  );

  if (employees.length === 0 || records.length === 0) return null;

  return (
    <section
      className="animate-fade-up"
      style={{ animationFillMode: "both", animationDelay: "40ms" }}
    >
      <div className="overflow-hidden rounded-3xl border border-[#F5F5F7] bg-white shadow-sm">
        <div className="border-b border-[#F5F5F7] px-5 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-8">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#86868B]">
              Data Analytics
            </span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-[#1D1D1F] sm:text-2xl">
            Visualized Attendance Data
          </h2>

          <p className="mt-1 text-sm text-[#86868B]">
            Overview of labor distribution and overtime trends across all sites.
          </p>
        </div>

        <div className="space-y-10 px-5 py-6 sm:px-8 sm:py-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1D1D1F]">
                Overtime Hours by Branch
              </h3>

              <div className="min-h-[280px] rounded-2xl border border-[#F5F5F7] bg-white p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={overtimeByBranch}
                    barCategoryGap="28%"
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#F1F5F9"
                    />
                    <XAxis
                      dataKey="shortBranch"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tick={{ fill: "#010101", fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#010101", fontSize: 11 }}
                    />
                    <Tooltip
                      cursor={{ fill: "#EFF6FF" }}
                      content={(props) => (
                        <ChartTooltip {...props} unit="OT hours" />
                      )}
                    />
                    <Bar dataKey="hours" radius={[4, 4, 0, 0]} barSize={44}>
                      {overtimeByBranch.map((entry, index) => (
                        <Cell
                          key={`ot-branch-${entry.shortBranch}-${index}`}
                          fill={entry.fill}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1D1D1F]">
                Employees per Branch
              </h3>

              <div className="min-h-[280px] rounded-2xl border border-[#F5F5F7] bg-white p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={workforceByBranch}
                    barCategoryGap="28%"
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#F1F5F9"
                    />
                    <XAxis
                      dataKey="shortBranch"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tick={{ fill: "#010101", fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#010101", fontSize: 11 }}
                    />
                    <Tooltip
                      cursor={{ fill: "#EFF6FF" }}
                      content={(props) => (
                        <ChartTooltip {...props} unit="employees" />
                      )}
                    />
                    <Bar dataKey="employees" radius={[6, 6, 6, 6]} barSize={44}>
                      {workforceByBranch.map((entry, index) => (
                        <Cell
                          key={`workforce-branch-${entry.shortBranch}-${index}`}
                          fill={entry.fill}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1D1D1F]">
                  Daily Labor Attendance
                </h3>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-[#2563EB]" />
                    <span className="text-[10px] font-medium text-[#2563EB]">
                      Current Period
                    </span>
                  </div>
                </div>
              </div>

              <div className="min-h-[320px] rounded-2xl border border-[#F5F5F7] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] sm:min-h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dailyLaborHours}
                    margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="attendanceBlueHours"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3B82F6"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3B82F6"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#F1F5F9"
                    />

                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#010101",
                        fontSize: 10,
                      }}
                      dy={10}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#010101", fontSize: 10 }}
                    />

                    <Tooltip
                      cursor={{
                        stroke: "#3B82F6",
                        strokeWidth: 2,
                        strokeDasharray: "6 6",
                      }}
                      content={(props) => (
                        <ChartTooltip {...props} unit="hrs utilized" />
                      )}
                    />

                    <Area
                      type="monotone"
                      dataKey="hours"
                      stroke="#2563EB"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#attendanceBlueHours)"
                      dot={{
                        r: 3,
                        fill: "#2563EB",
                        stroke: "#fff",
                        strokeWidth: 1,
                      }}
                      activeDot={{
                        r: 5,
                        fill: "#2563EB",
                        stroke: "#fff",
                        strokeWidth: 2,
                        style: {
                          filter:
                            "drop-shadow(0px 2px 4px rgba(37,99,235,0.25))",
                        },
                      }}
                      animationBegin={200}
                      animationDuration={1200}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4 lg:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1D1D1F]">
                Top Overtime Performers
              </h3>

              <div className="min-h-[320px] rounded-2xl border border-[#F5F5F7] bg-white p-6 sm:min-h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topOTEmployees}
                    layout="vertical"
                    barCategoryGap={18}
                    barGap={4}
                    margin={{ top: 10, right: 20, left: 52, bottom: 10 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#010101",
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                      width={140}
                    />
                    <Tooltip
                      cursor={{ fill: "#DBEAFE" }}
                      content={(props) => (
                        <ChartTooltip {...props} unit="overtime hrs" />
                      )}
                    />
                    <Bar dataKey="hours" radius={[6, 6, 6, 6]} barSize={36}>
                      {topOTEmployees.map((entry, index) => (
                        <Cell
                          key={`top-ot-${entry.name}-${index}`}
                          fill={entry.fill}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

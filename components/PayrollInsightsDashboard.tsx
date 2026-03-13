"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  type TooltipProps,
} from "recharts";
import type { AttendanceRecordInput, PayrollRow } from "@/lib/payrollEngine";
import { buildPayrollInsightsData } from "@/lib/payrollInsights";

interface PayrollInsightsDashboardProps {
  payrollRows: PayrollRow[];
  attendanceRows: AttendanceRecordInput[];
}

const PIE_COLORS = [
  "#2563EB",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function shorten(value: string, max = 16): string {
  if (!value) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

type ChartTooltipProps = TooltipProps<number, string> & {
  valueFormatter?: (value: number) => string;
  unit?: string;
};

function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
  unit,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      {label ? (
        <p className="mb-2 text-[11px] font-semibold text-[#111827]">
          {String(label)}
        </p>
      ) : null}

      <div className="space-y-1.5">
        {payload.map((entry, index) => {
          const rawValue =
            typeof entry.value === "number"
              ? entry.value
              : Number(entry.value ?? 0);

          return (
            <div
              key={`${String(entry.dataKey)}-${index}`}
              className="flex items-center gap-2"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color || "#2563EB" }}
              />
              <span className="text-[11px] text-[#6B7280]">
                {String(entry.name || entry.dataKey || "")}
              </span>
              <span className="ml-auto text-[11px] font-semibold text-[#111827]">
                {valueFormatter ? valueFormatter(rawValue) : rawValue}
                {unit ? ` ${unit}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111827]">
          {title}
        </h3>
        {actions}
      </div>

      <div className="h-[320px] w-full rounded-2xl border border-[#F3F4F6] bg-white p-4 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        {children}
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[#F3F4F6] bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold tracking-tight text-[#111827] sm:text-xl">
        {value}
      </p>
    </div>
  );
}

export default function PayrollInsightsDashboard({
  payrollRows,
  attendanceRows,
}: PayrollInsightsDashboardProps) {
  const insights = useMemo(
    () => buildPayrollInsightsData(payrollRows, attendanceRows),
    [payrollRows, attendanceRows],
  );

  if (payrollRows.length === 0) return null;

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
            Payroll Insights Dashboard
          </h2>

          <p className="mt-1 text-sm text-[#86868B]">
            Financial analytics and workforce payroll overview for the selected
            pay period.
          </p>
        </div>

        <div className="space-y-10 px-5 py-6 sm:px-8 sm:py-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Total Payroll"
              value={formatCurrency(insights.kpis.totalPayroll)}
            />
            <KpiCard
              label="Employees Paid"
              value={insights.kpis.employeesPaid}
            />
            <KpiCard
              label="Total Overtime Cost"
              value={formatCurrency(insights.kpis.totalOvertimeCost)}
            />
            <KpiCard
              label="Average Salary"
              value={formatCurrency(insights.kpis.averageSalary)}
            />
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <ChartCard title="Payroll Distribution by Project">
              {insights.payrollDistributionByProject.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-[#86868B]">
                    No project distribution data.
                  </p>
                </div>
              ) : (
                <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-[1fr_180px]">
                  <div className="h-full min-h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={insights.payrollDistributionByProject}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={90}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {insights.payrollDistributionByProject.map(
                            (entry, index) => (
                              <Cell
                                key={`${entry.name}-${index}`}
                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            ),
                          )}
                        </Pie>
                        <Tooltip
                          content={
                            <ChartTooltip valueFormatter={formatCurrency} />
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex flex-col justify-center gap-3">
                    {insights.payrollDistributionByProject.map(
                      (item, index) => (
                        <div
                          key={`${item.name}-${index}`}
                          className="flex items-start gap-2"
                        >
                          <span
                            className="mt-1 h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                PIE_COLORS[index % PIE_COLORS.length],
                            }}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-[#111827]">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-[#6B7280]">
                              {formatCurrency(item.value)}
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </ChartCard>

            <ChartCard title="Top 10 Highest Paid Employees">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={insights.topPaidEmployees}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="employeeName"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    width={140}
                    tick={{
                      fill: "#111827",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                    tickFormatter={(value: string) =>
                      shorten(String(value), 18)
                    }
                  />
                  <Tooltip
                    cursor={{ fill: "#EFF6FF" }}
                    content={<ChartTooltip valueFormatter={formatCurrency} />}
                  />
                  <Bar
                    dataKey="salary"
                    name="Salary"
                    fill="#2563EB"
                    radius={[0, 4, 4, 0]}
                    barSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="lg:col-span-2">
              <ChartCard
                title="Payroll Cost per Project"
                actions={
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-[#2563EB]" />
                      <span className="text-[10px] font-medium text-[#2563EB]">
                        Regular
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                      <span className="text-[10px] font-medium text-[#F59E0B]">
                        Overtime
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-[#8B5CF6]" />
                      <span className="text-[10px] font-medium text-[#8B5CF6]">
                        Allowance
                      </span>
                    </div>
                  </div>
                }
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={insights.payrollCostPerProject}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#F3F4F6"
                    />
                    <XAxis
                      dataKey="project"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6B7280", fontSize: 11 }}
                      tickFormatter={(value: string) =>
                        shorten(String(value), 14)
                      }
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6B7280", fontSize: 11 }}
                    />
                    <Tooltip
                      cursor={{ fill: "#F9FAFB" }}
                      content={<ChartTooltip valueFormatter={formatCurrency} />}
                    />
                    <Bar
                      dataKey="regularPay"
                      name="Regular Pay"
                      stackId="payrollCost"
                      fill="#2563EB"
                      radius={[4, 4, 0, 0]}
                      barSize={42}
                    />
                    <Bar
                      dataKey="overtimePay"
                      name="Overtime Pay"
                      stackId="payrollCost"
                      fill="#F59E0B"
                    />
                    <Bar
                      dataKey="allowance"
                      name="Allowance"
                      stackId="payrollCost"
                      fill="#8B5CF6"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

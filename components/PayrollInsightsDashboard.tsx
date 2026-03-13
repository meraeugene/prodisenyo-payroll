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

const STACK_COLORS = {
  regular: "#2563EB",
  overtime: "#60A5FA",
  allowance: "#BFDBFE",
};

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

function extractBranchName(value: string): string {
  if (!value) return "";
  return value.trim().split(/\s+/)[0].toUpperCase();
}

function getBranchColor(index: number) {
  return BLUE_BRANCH_COLORS[index % BLUE_BRANCH_COLORS.length];
}

type CustomChartTooltipProps = TooltipProps<number, string> & {
  valueFormatter?: (value: number) => string;
  unit?: string;
};

function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
  unit,
}: CustomChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      {label ? (
        <p className="mb-2 text-[14px] font-semibold text-[#1D1D1F]">
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
              <span className="text-[12px] text-[#6B7280]">
                {String(entry.name || entry.dataKey || "")}
              </span>
              <span className="ml-auto text-[12px] font-semibold text-[#1D1D1F]">
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
  height = "h-[320px]",
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  height?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1D1D1F]">
          {title}
        </h3>
        {actions}
      </div>

      <div
        className={`${height} w-full rounded-2xl border border-[#F5F5F7] bg-white p-4 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]`}
      >
        {children}
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[#F5F5F7] bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold tracking-tight text-[#1D1D1F] sm:text-xl">
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

  const projectDistributionData = useMemo(() => {
    return insights.payrollDistributionByProject.map((item, index) => ({
      ...item,
      shortName: extractBranchName(item.name),
      fill: getBranchColor(index),
    }));
  }, [insights.payrollDistributionByProject]);

  const topPaidEmployeesData = useMemo(() => {
    return insights.topPaidEmployees.map((item, index) => ({
      ...item,
      employeeName: shorten(item.employeeName, 20),
      fill: getBranchColor(index),
    }));
  }, [insights.topPaidEmployees]);

  const payrollCostPerProjectData = useMemo(() => {
    return insights.payrollCostPerProject.map((item, index) => ({
      ...item,
      shortProject: extractBranchName(item.project),
      fill: getBranchColor(index),
    }));
  }, [insights.payrollCostPerProject]);

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

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <ChartCard
              title="Payroll Distribution by Project"
              height="h-[400px]"
            >
              {projectDistributionData.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-[#86868B]">
                    No project distribution data.
                  </p>
                </div>
              ) : (
                <div className="grid h-full grid-cols-1 gap-5 md:grid-cols-[1fr_190px]">
                  <div className="h-full min-h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={projectDistributionData}
                          dataKey="value"
                          nameKey="shortName"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={90}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {projectDistributionData.map((entry, index) => (
                            <Cell
                              key={`${entry.name}-${index}`}
                              fill={entry.fill}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={
                            <ChartTooltip valueFormatter={formatCurrency} />
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex min-h-0 flex-col justify-center gap-3 ">
                    {projectDistributionData.map((item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        className="flex items-start gap-2 "
                      >
                        <span
                          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.fill }}
                        />
                        <div className="min-w-0 flex-1 ">
                          <p className="truncate text-2xs font-medium text-[#6B7280]">
                            {item.shortName}
                          </p>
                          <p className="truncate text-sm font-medium  text-[#1D1D1F] ">
                            {formatCurrency(item.value)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ChartCard>

            <ChartCard title="Top 10 Highest Paid Employees" height="h-[550px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topPaidEmployeesData}
                  layout="vertical"
                  barCategoryGap={18}
                  barGap={4}
                  margin={{ top: 10, right: 20, left: 92, bottom: 10 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="employeeName"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    width={140}
                    tick={{
                      fill: "#1D1D1F",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: "#DBEAFE" }}
                    content={<ChartTooltip valueFormatter={formatCurrency} />}
                  />
                  <Bar
                    dataKey="salary"
                    name="Salary"
                    radius={[6, 6, 6, 6]}
                    barSize={34}
                  >
                    {topPaidEmployeesData.map((entry, index) => (
                      <Cell
                        key={`top-paid-cell-${entry.employeeName}-${index}`}
                        fill={entry.fill}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="lg:col-span-2">
              <ChartCard
                title="Payroll Cost per Project"
                height="h-[380px]"
                actions={
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-[#2563EB]" />
                      <span className="text-[11px] font-medium text-[#2563EB]">
                        Regular
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-[#60A5FA]" />
                      <span className="text-[11px] font-medium text-[#60A5FA]">
                        Overtime
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-[#BFDBFE]" />
                      <span className="text-[11px] font-medium text-[#93C5FD]">
                        Allowance
                      </span>
                    </div>
                  </div>
                }
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={payrollCostPerProjectData}
                    barCategoryGap="30%"
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#F1F5F9"
                    />
                    <XAxis
                      dataKey="shortProject"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tick={{ fill: "#010101", fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#010101", fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: "#EFF6FF" }}
                      content={<ChartTooltip valueFormatter={formatCurrency} />}
                    />
                    <Bar
                      dataKey="regularPay"
                      name="Regular Pay"
                      stackId="payrollCost"
                      radius={[6, 6, 6, 6]}
                      barSize={46}
                    >
                      {payrollCostPerProjectData.map((entry, index) => (
                        <Cell
                          key={`regular-cell-${entry.shortProject}-${index}`}
                          fill={entry.fill}
                        />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="overtimePay"
                      name="Overtime Pay"
                      stackId="payrollCost"
                      fill={STACK_COLORS.overtime}
                    />
                    <Bar
                      dataKey="allowance"
                      name="Allowance"
                      stackId="payrollCost"
                      fill={STACK_COLORS.allowance}
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

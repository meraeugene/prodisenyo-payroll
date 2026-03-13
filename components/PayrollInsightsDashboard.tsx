"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
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

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <h4 className="text-sm font-semibold text-apple-charcoal mb-3">{title}</h4>
      {children}
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function shorten(value: string, max = 12): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}...`;
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
    <section className="space-y-5">
      <div>
        <h3 className="text-xl sm:text-2xl font-bold text-apple-charcoal tracking-tight">
          Payroll Insights
        </h3>
        <p className="text-sm text-apple-smoke mt-1">
          Financial analytics and workforce payroll overview for the selected pay
          period.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-apple-steel uppercase tracking-wider">
            Total Payroll
          </p>
          <p className="mt-2 text-lg font-bold text-apple-charcoal">
            {formatCurrency(insights.kpis.totalPayroll)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-apple-steel uppercase tracking-wider">
            Employees Paid
          </p>
          <p className="mt-2 text-lg font-bold text-apple-charcoal">
            {insights.kpis.employeesPaid}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-apple-steel uppercase tracking-wider">
            Total Overtime Cost
          </p>
          <p className="mt-2 text-lg font-bold text-apple-charcoal">
            {formatCurrency(insights.kpis.totalOvertimeCost)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-apple-steel uppercase tracking-wider">
            Average Salary
          </p>
          <p className="mt-2 text-lg font-bold text-apple-charcoal">
            {formatCurrency(insights.kpis.averageSalary)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ChartCard title="Payroll Cost Trend">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={insights.payrollCostTrend}
                margin={{ top: 10, right: 10, left: -15, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="period"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748B", fontSize: 11 }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line type="monotone" dataKey="regular" stroke="#2563EB" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="overtime" stroke="#F59E0B" strokeWidth={2} dot={false} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#10B981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Payroll Distribution by Project">
          <div className="h-[260px]">
            {insights.payrollDistributionByProject.length === 0 ? (
              <p className="text-sm text-apple-smoke">No project distribution data.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={insights.payrollDistributionByProject}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={82}
                    paddingAngle={2}
                  >
                    {insights.payrollDistributionByProject.map((entry, index) => (
                      <Cell
                        key={`${entry.name}-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Overtime Cost by Employee">
          <div className="h-[260px]">
            {insights.overtimeCostByEmployee.length === 0 ? (
              <p className="text-sm text-apple-smoke">No overtime cost data.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={insights.overtimeCostByEmployee}
                  margin={{ top: 10, right: 10, left: -15, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="employeeName"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                    tick={{ fill: "#64748B", fontSize: 10 }}
                    tickFormatter={(value) => shorten(String(value), 10)}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="overtimePay" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Top 10 Highest Paid Employees">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={insights.topPaidEmployees}
                layout="vertical"
                margin={{ top: 10, right: 8, left: 20, bottom: 10 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  dataKey="employeeName"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  width={88}
                  tick={{ fill: "#64748B", fontSize: 10 }}
                  tickFormatter={(value) => shorten(String(value), 12)}
                />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="salary" fill="#2563EB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Payroll Cost per Project">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={insights.payrollCostPerProject}
                layout="vertical"
                margin={{ top: 10, right: 8, left: 20, bottom: 10 }}
              >
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <YAxis
                  dataKey="project"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  width={88}
                  tick={{ fill: "#64748B", fontSize: 10 }}
                  tickFormatter={(value) => shorten(String(value), 12)}
                />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="regularPay" stackId="payrollCost" fill="#2563EB" />
                <Bar dataKey="overtimePay" stackId="payrollCost" fill="#F59E0B" />
                <Bar dataKey="allowance" stackId="payrollCost" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </section>
  );
}

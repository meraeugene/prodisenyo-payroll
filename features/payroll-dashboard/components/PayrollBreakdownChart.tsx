"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatPayrollCurrency } from "@/features/payroll-dashboard/utils/payrollDashboard";

const COLORS = ["#15803d", "#f59e0b", "#e11d48"];

export default function PayrollBreakdownChart({
  regularPay,
  supplementalPay,
  deductions,
}: {
  regularPay: number;
  supplementalPay: number;
  deductions: number;
}) {
  const data = [
    { name: "Regular pay", value: regularPay },
    { name: "Overtime & holiday", value: supplementalPay },
    { name: "Deductions", value: deductions },
  ].filter((item) => item.value > 0);

  if (!data.length) {
    return (
      <div className="flex h-44 items-center justify-center rounded-xl bg-slate-50 text-center text-xs text-slate-500">
        Payroll composition will appear after an approved run has item details.
      </div>
    );
  }

  return (
    <div className="h-44 w-full" aria-label="Approved payroll composition chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={46}
            outerRadius={68}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((item, index) => (
              <Cell key={item.name} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatPayrollCurrency(Number(value))}
            contentStyle={{
              borderRadius: 10,
              borderColor: "#e2e8f0",
              fontSize: 12,
              boxShadow: "0 8px 24px rgba(15,23,42,.08)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, Banknote, Calculator, ReceiptText, Wallet } from "lucide-react";
import PayrollBreakdownChart from "@/features/payroll-dashboard/components/PayrollBreakdownChart";
import type { PayrollDashboardOverview } from "@/features/payroll-dashboard/types";
import { formatPayrollCurrency } from "@/features/payroll-dashboard/utils/payrollDashboard";

export default function PayrollOverviewPanel({
  overview,
  hasOwnedAttendance,
}: {
  overview: PayrollDashboardOverview;
  hasOwnedAttendance: boolean;
}) {
  const metrics = [
    { label: "Total Gross Pay", value: overview.grossPay, icon: Banknote, tone: "text-emerald-700 bg-emerald-50" },
    { label: "Total Deductions", value: overview.deductions, icon: ReceiptText, tone: "text-rose-700 bg-rose-50" },
    { label: "Total Net Pay", value: overview.netPay, icon: Wallet, tone: "text-emerald-700 bg-emerald-50" },
    { label: "Approved Runs", value: overview.approvedRunCount, icon: Calculator, tone: "text-sky-700 bg-sky-50", count: true },
  ];
  const chartRows = [
    { label: "Regular pay", value: overview.regularPay, color: "bg-emerald-700" },
    { label: "Overtime & holiday", value: overview.overtimePay + overview.holidayPay, color: "bg-amber-500" },
    { label: "Deductions", value: overview.deductions, color: "bg-rose-600" },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-950">Payroll Overview</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            All-time approved payroll only
          </p>
        </div>
        <Link
          href="/payroll-analytics"
          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          View report <ArrowRight size={13} />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center gap-2">
                <span className={"flex h-8 w-8 items-center justify-center rounded-full " + metric.tone}>
                  <Icon size={14} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                    {metric.label}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-bold text-slate-950">
                    {metric.count
                      ? metric.value.toLocaleString("en-PH")
                      : formatPayrollCurrency(metric.value)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 grid items-center gap-1 sm:grid-cols-[160px_minmax(0,1fr)]">
        <PayrollBreakdownChart
          regularPay={overview.regularPay}
          supplementalPay={overview.overtimePay + overview.holidayPay}
          deductions={overview.deductions}
        />
        <div className="space-y-3">
          {chartRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex min-w-0 items-center gap-2 text-slate-600">
                <span className={"h-2.5 w-2.5 shrink-0 rounded-full " + row.color} />
                <span className="truncate">{row.label}</span>
              </span>
              <span className="shrink-0 font-bold text-slate-900">
                {formatPayrollCurrency(row.value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {overview.hasPartialItemData ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-800">
          Some approved payroll runs do not have item-level breakdowns. Run totals remain included in gross and net pay.
        </p>
      ) : null}

      <Link
        href={hasOwnedAttendance ? "/generate-payroll" : "/upload-attendance"}
        className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-emerald-700 px-4 text-xs font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
      >
        {hasOwnedAttendance ? "Open Payroll Workspace" : "Upload Attendance"}
      </Link>
    </section>
  );
}

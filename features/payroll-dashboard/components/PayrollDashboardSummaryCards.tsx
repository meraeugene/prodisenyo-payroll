import {
  CalendarDays,
  ClipboardClock,
  FileCheck2,
  Users,
  WalletCards,
} from "lucide-react";
import type { PayrollDashboardSummary } from "@/features/payroll-dashboard/types";
import { formatPayrollCurrency } from "@/features/payroll-dashboard/utils/payrollDashboard";

const TONES = [
  "bg-emerald-50 text-emerald-700",
  "bg-sky-50 text-sky-700",
  "bg-amber-50 text-amber-700",
  "bg-violet-50 text-violet-700",
  "bg-rose-50 text-rose-700",
];

export default function PayrollDashboardSummaryCards({
  summary,
}: {
  summary: PayrollDashboardSummary;
}) {
  const cards = [
    {
      label: "Total Employees",
      value: summary.totalEmployees.toLocaleString("en-PH"),
      helper: "Employees in the workforce directory",
      icon: Users,
    },
    {
      label: "Attendance Batches",
      value: summary.attendanceBatches.toLocaleString("en-PH"),
      helper: "All persisted attendance imports",
      icon: CalendarDays,
    },
    {
      label: "Payroll to Process",
      value: summary.readyForPayroll.toLocaleString("en-PH"),
      helper: "Attendance batches without payroll",
      icon: ClipboardClock,
    },
    {
      label: "Pending CEO Approval",
      value: summary.awaitingCeo.toLocaleString("en-PH"),
      helper: "Submitted payroll reports",
      icon: FileCheck2,
    },
    {
      label: "Approved Payroll",
      value: formatPayrollCurrency(summary.approvedNetPayroll),
      helper: "All-time finalized net pay",
      icon: WalletCards,
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <article
            key={card.label}
            className="min-h-32 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]"
          >
            <div className="flex items-start gap-3">
              <div
                className={
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full " +
                  TONES[index]
                }
              >
                <Icon size={21} strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {card.label}
                </p>
                <p className="mt-1 truncate text-2xl font-bold tracking-[-0.035em] text-slate-950">
                  {card.value}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {card.helper}
            </p>
          </article>
        );
      })}
    </section>
  );
}

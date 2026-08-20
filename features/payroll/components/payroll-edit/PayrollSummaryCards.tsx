import {
  CalendarCheck2,
  CalendarDays,
  Clock3,
  Fingerprint,
  Timer,
  WalletCards,
} from "lucide-react";
import { formatPeso } from "@/features/payroll/utils/payrollEditModalHelpers";
import { formatPayrollNumber } from "@/features/payroll/utils/payrollFormatters";

interface PayrollSummaryCardsProps {
  attendanceDays: number;
  daysWorked: number;
  actualWorkedHours: number;
  regularWorkedHours: number;
  overtimeHours: number;
  adjustedTotalPay: number;
}

export function PayrollSummaryCards(props: PayrollSummaryCardsProps) {
  const cards = [
    {
      label: "Attendance",
      value: String(props.attendanceDays),
      suffix: "days",
      icon: Fingerprint,
    },
    {
      label: "Days Worked",
      value: String(props.daysWorked),
      suffix: "days",
      icon: CalendarCheck2,
    },
    {
      label: "Actual Hours",
      value: formatPayrollNumber(props.actualWorkedHours),
      suffix: "hrs",
      icon: Clock3,
    },
    {
      label: "Regular Hours",
      value: formatPayrollNumber(props.regularWorkedHours),
      suffix: "hrs",
      icon: CalendarDays,
    },
    {
      label: "OT Hours",
      value: formatPayrollNumber(props.overtimeHours),
      suffix: "hrs",
      icon: Timer,
      accent: props.overtimeHours > 0,
    },
    {
      label: "Adjusted Pay",
      value: formatPeso(props.adjustedTotalPay),
      suffix: "total",
      icon: WalletCards,
      strong: true,
    },
  ];

  return (
    <section
      aria-label="Payroll totals"
      className="grid shrink-0 grid-cols-2 gap-2 border-b border-slate-200 bg-white px-3 py-2.5 sm:grid-cols-3 sm:px-4 xl:grid-cols-6"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`flex min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
              card.strong
                ? "border-emerald-200 bg-emerald-50/70"
                : card.accent
                  ? "border-amber-200 bg-amber-50/60"
                  : "border-slate-200 bg-white"
            }`}
          >
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                card.accent
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              <Icon size={16} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold text-slate-500">
                {card.label}
              </p>
              <p
                className={`truncate font-mono font-black leading-5 ${
                  card.strong ? "text-base text-emerald-700" : "text-sm text-slate-950"
                }`}
              >
                {card.value}{" "}
                <span className="font-sans text-[10px] font-medium text-slate-400">
                  {card.suffix}
                </span>
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}

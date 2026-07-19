import { ArrowUp, BadgeCheck, Receipt, Wallet } from "lucide-react";
import type {
  PayrollSummaryCardDefinition,
  PayrollSummaryCardKey,
} from "@/features/dashboard/types";
import { formatPayrollNumber } from "@/features/payroll/utils/payrollFormatters";

const PESO_SIGN = "\u20B1";

export default function DashboardSummaryCardsSection({
  cards,
  onSelectCard,
}: {
  cards: PayrollSummaryCardDefinition[];
  onSelectCard: (key: PayrollSummaryCardKey) => void;
}) {
  return (
    <section className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
      {cards.map((card) => {
        const iconWrapClass =
          card.key === "gross"
            ? "bg-emerald-50 text-emerald-700"
            : card.key === "deductions"
              ? "bg-red-50 text-red-700"
              : "bg-sky-50 text-sky-700";
        const Icon =
          card.key === "gross"
            ? Wallet
            : card.key === "deductions"
              ? Receipt
              : BadgeCheck;

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelectCard(card.key)}
            className="rounded-[22px] bg-white p-6 text-left shadow-[0_18px_40px_rgba(24,83,43,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgba(24,83,43,0.12)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconWrapClass}`}
                >
                  <Icon size={18} />
                </div>
                <p className="text-sm font-medium text-apple-steel">
                  {card.title}
                </p>
              </div>
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs text-green-600">
                  Updated <ArrowUp size={12} />
                </span>
              </div>
            </div>
            <p className="mt-6 text-[32px] font-semibold tracking-[-0.03em] text-apple-charcoal">
              {PESO_SIGN} {formatPayrollNumber(card.amount)}
            </p>
            <p className="mt-3 text-sm font-medium text-apple-charcoal">
              {card.badge}
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600">
              View Details
            </p>
          </button>
        );
      })}
    </section>
  );
}

"use client";

import { Users, Calendar, Clock, Banknote } from "lucide-react";
import type { PayrollSummary } from "@/types";
import { formatNumber } from "@/lib/payroll";

interface SummaryCardsProps {
  summary: PayrollSummary;
  period: string;
}

export default function SummaryCards({ summary, period }: SummaryCardsProps) {
  const cards = [
    {
      label: "Employees Processed",
      value: summary.totalEmployees.toString(),
      sub: "Included in this payroll",
      icon: Users,
    },
    {
      label: "Total Days",
      value: formatNumber(summary.totalDays, 0),
      sub: "Across all staff",
      icon: Calendar,
    },
    {
      label: "Total Hours",
      value: formatNumber(summary.totalHours, 1),
      sub: "Regular + overtime",
      icon: Clock,
    },
    {
      label: "Gross Payroll",
      value: `₱${formatNumber(summary.totalGross, 2)}`,
      sub: period,
      icon: Banknote,
      highlight: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div
          key={i}
          className={`
            rounded-3xl p-5 border transition-all duration-200
            animate-fade-up
            ${
              card.highlight
                ? "bg-apple-charcoal border-apple-charcoal text-white shadow-apple-lg"
                : "bg-white border-apple-mist text-apple-charcoal shadow-apple-xs "
            }
          `}
          style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
        >
          <div className="flex items-start justify-between mb-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center
                ${card.highlight ? "bg-white/10" : "bg-apple-snow"}`}
            >
              <card.icon
                size={17}
                className={
                  card.highlight ? "text-white" : "text-apple-charcoal"
                }
                strokeWidth={1.75}
              />
            </div>
          </div>
          <p
            className={`text-2xl font-bold tracking-tight mb-0.5
              ${card.highlight ? "text-white" : "text-apple-charcoal"}`}
          >
            {card.value}
          </p>
          <p
            className={`text-xs font-medium
              ${card.highlight ? "text-white/60" : "text-apple-steel"}`}
          >
            {card.sub}
          </p>
        </div>
      ))}
    </div>
  );
}

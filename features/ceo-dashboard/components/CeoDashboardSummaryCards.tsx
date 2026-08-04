import {
  BriefcaseBusiness,
  CircleCheckBig,
  ClipboardCheck,
  WalletCards,
} from "lucide-react";
import type { CeoDashboardData } from "@/features/ceo-dashboard/types";

export default function CeoDashboardSummaryCards({
  data,
}: {
  data: CeoDashboardData;
}) {
  const budgetUsed = data.totalBudget
    ? Math.round((data.totalSpent / data.totalBudget) * 100)
    : 0;
  const cards = [
    {
      label: "Active Projects",
      value: data.activeProjects,
      helper: "Across all project sites",
      icon: BriefcaseBusiness,
    },
    {
      label: "Pending Approvals",
      value: data.pendingApprovals,
      helper: "Needs your action",
      icon: ClipboardCheck,
    },
    {
      label: "Budget Used",
      value: `${budgetUsed}%`,
      helper: "Of total project budget",
      icon: WalletCards,
    },
    {
      label: "Completed Projects",
      value: data.completedProjects,
      helper: "Closed project records",
      icon: CircleCheckBig,
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article
            key={card.label}
            className="flex min-h-32 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
              <Icon size={25} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-slate-950">
                {card.value}
              </p>
              <p className="mt-1 text-sm text-slate-500">{card.helper}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}

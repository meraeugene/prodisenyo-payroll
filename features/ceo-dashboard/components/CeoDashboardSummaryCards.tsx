import {
  AlertTriangle,
  Boxes,
  BriefcaseBusiness,
  ClipboardCheck,
  WalletCards,
} from "lucide-react";
import type { CeoDashboardData } from "@/features/ceo-dashboard/types";
import {
  buildCeoAttentionItems,
  formatCeoCurrency,
  getCeoDashboardTotals,
} from "@/features/ceo-dashboard/utils/ceoDashboard";

const TONES = [
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-emerald-50 text-emerald-700",
  "bg-sky-50 text-sky-700",
  "bg-rose-50 text-rose-700",
];

export default function CeoDashboardSummaryCards({ data }: { data: CeoDashboardData }) {
  const totals = getCeoDashboardTotals(data);
  const attentionCount = buildCeoAttentionItems(data.projects).length;
  const budgetPercent = totals.totalBudget
    ? Math.min(100, Math.round((totals.totalSpent / totals.totalBudget) * 100))
    : 0;
  const cards = [
    {
      label: "Active Projects",
      value: totals.activeProjects,
      helper: totals.completedProjects + " completed",
      icon: BriefcaseBusiness,
    },
    {
      label: "Pending Approvals",
      value: totals.pendingApprovals,
      helper: "Across live approval workflows",
      icon: ClipboardCheck,
    },
    {
      label: "Budget Used",
      value: formatCeoCurrency(totals.totalSpent),
      helper: budgetPercent + "% of " + formatCeoCurrency(totals.totalBudget),
      icon: WalletCards,
      progress: budgetPercent,
    },
    {
      label: "Material Requests",
      value: data.materialRequests.length,
      helper: totals.materialApprovalCount + " awaiting CEO action",
      icon: Boxes,
    },
    {
      label: "Needs Attention",
      value: attentionCount,
      helper: "Overdue or over-budget projects",
      icon: AlertTriangle,
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
              <div className={"flex h-12 w-12 shrink-0 items-center justify-center rounded-full " + TONES[index]}>
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
            <p className="mt-3 text-xs text-slate-500">{card.helper}</p>
            {typeof card.progress === "number" ? (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-700"
                  style={{ width: card.progress + "%" }}
                />
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}

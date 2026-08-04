import Link from "next/link";
import { Bell } from "lucide-react";
import CeoBudgetSnapshot from "@/features/ceo-dashboard/components/CeoBudgetSnapshot";
import CeoDashboardApprovalQueue from "@/features/ceo-dashboard/components/CeoDashboardApprovalQueue";
import CeoDashboardProjectsPanel from "@/features/ceo-dashboard/components/CeoDashboardProjectsPanel";
import CeoDashboardSummaryCards from "@/features/ceo-dashboard/components/CeoDashboardSummaryCards";
import type { CeoDashboardData } from "@/features/ceo-dashboard/types";

export default function CeoDashboardPage({
  data,
  fullName,
}: {
  data: CeoDashboardData;
  fullName: string | null;
}) {
  const displayName = fullName?.trim() || "CEO";

  return (
    <main className="min-h-full bg-slate-50/40 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.035em] text-slate-950">
            CEO Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Overview of projects, approvals, and project finances.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/material-approvals"
            aria-label={`${data.pendingApprovals} pending approvals`}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            <Bell size={18} />
            {data.pendingApprovals > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-800 px-1 text-[10px] font-bold text-white">
                {data.pendingApprovals}
              </span>
            ) : null}
          </Link>
          <div className="hidden border-l border-slate-200 pl-4 text-right sm:block">
            <p className="text-sm font-semibold text-slate-900">Good day, {displayName}</p>
            <p className="text-xs text-slate-500">Chief Executive Officer</p>
          </div>
        </div>
      </header>

      <CeoDashboardSummaryCards data={data} />
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,.85fr)]">
        <CeoDashboardProjectsPanel projects={data.projects} />
        <CeoDashboardApprovalQueue items={data.approvalQueue} />
      </div>
      <div className="mt-5">
        <CeoBudgetSnapshot totalBudget={data.totalBudget} totalSpent={data.totalSpent} />
      </div>
    </main>
  );
}

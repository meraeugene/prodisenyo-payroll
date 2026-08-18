import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import CeoAttentionPanel from "@/features/ceo-dashboard/components/CeoAttentionPanel";
import CeoBudgetSnapshot from "@/features/ceo-dashboard/components/CeoBudgetSnapshot";
import CeoDashboardApprovalQueue from "@/features/ceo-dashboard/components/CeoDashboardApprovalQueue";
import CeoDashboardProjectsPanel from "@/features/ceo-dashboard/components/CeoDashboardProjectsPanel";
import CeoDashboardSummaryCards from "@/features/ceo-dashboard/components/CeoDashboardSummaryCards";
import CeoMaterialWorkflowPanel from "@/features/ceo-dashboard/components/CeoMaterialWorkflowPanel";
import CeoRecentActivityPanel from "@/features/ceo-dashboard/components/CeoRecentActivityPanel";
import CeoRecentProgressPanel from "@/features/ceo-dashboard/components/CeoRecentProgressPanel";
import type { CeoDashboardData } from "@/features/ceo-dashboard/types";
import {
  buildCeoApprovalQueue,
  buildCeoAttentionItems,
  buildCeoRecentActivity,
  getCeoReviewApprovalsHref,
  getCeoDashboardTotals,
} from "@/features/ceo-dashboard/utils/ceoDashboard";

export default function CeoDashboardPage({
  data,
  fullName,
}: {
  data: CeoDashboardData;
  fullName: string | null;
}) {
  const displayName = fullName?.trim() || "CEO";
  const totals = getCeoDashboardTotals(data);
  const approvalQueue = buildCeoApprovalQueue(data);
  const reviewApprovalsHref = getCeoReviewApprovalsHref(approvalQueue);
  const attentionItems = buildCeoAttentionItems(data.projects);
  const recentActivity = buildCeoRecentActivity(data);

  return (
    <main className="min-h-full bg-slate-50/40 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.04em] text-slate-950">CEO Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Live overview of project delivery, approvals, and recorded costs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={reviewApprovalsHref}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-700 bg-white px-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <ClipboardCheck size={16} />
            Review approvals
            {totals.pendingApprovals > 0 ? (
              <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] text-white">{totals.pendingApprovals}</span>
            ) : null}
          </Link>
          <div className="hidden border-l border-slate-200 pl-4 sm:block">
            <p className="text-sm font-semibold text-slate-900">{displayName}</p>
            <p className="text-xs text-slate-500">Chief Executive Officer</p>
          </div>
        </div>
      </header>

      <CeoDashboardSummaryCards data={data} />

      <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.72fr)_minmax(320px,.78fr)]">
        <CeoDashboardProjectsPanel projects={data.projects} />
        <CeoDashboardApprovalQueue items={approvalQueue} />
        <CeoRecentProgressPanel updates={data.progressUpdates} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,.72fr)_minmax(280px,.72fr)]">
        <CeoBudgetSnapshot
          totalBudget={totals.totalBudget}
          estimatedCost={totals.estimatedCost}
          totalSpent={totals.totalSpent}
        />
        <CeoMaterialWorkflowPanel requests={data.materialRequests} />
        <CeoAttentionPanel items={attentionItems} />
      </div>

      <div className="mt-5">
        <CeoRecentActivityPanel items={recentActivity} />
      </div>

      <div className="mt-5 flex justify-end">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800 hover:text-emerald-950">
          Open project portfolio <ArrowRight size={14} />
        </Link>
      </div>
    </main>
  );
}

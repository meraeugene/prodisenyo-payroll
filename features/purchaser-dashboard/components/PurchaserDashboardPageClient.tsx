"use client";

import Link from "next/link";
import { ArrowRight, FolderKanban } from "lucide-react";
import { useMemo, useState } from "react";
import PurchaserActivityPanel from "@/features/purchaser-dashboard/components/PurchaserActivityPanel";
import PurchaserDashboardSummary from "@/features/purchaser-dashboard/components/PurchaserDashboardSummary";
import PurchaserOrdersPanel from "@/features/purchaser-dashboard/components/PurchaserOrdersPanel";
import PurchaserPricingPanel from "@/features/purchaser-dashboard/components/PurchaserPricingPanel";
import PurchaserReceiptsPanel from "@/features/purchaser-dashboard/components/PurchaserReceiptsPanel";
import PurchaserRequestsPanel from "@/features/purchaser-dashboard/components/PurchaserRequestsPanel";
import type { PurchaserDashboardData } from "@/features/purchaser-dashboard/types";
import {
  buildPurchaserActivity,
  buildPurchaserSummary,
  filterPurchaserRecords,
} from "@/features/purchaser-dashboard/utils/purchaserDashboard";

export default function PurchaserDashboardPageClient({
  data,
  fullName,
}: {
  data: PurchaserDashboardData;
  fullName: string | null;
}) {
  const [projectId, setProjectId] = useState("all");
  const projects = useMemo(
    () =>
      Array.from(
        new Map(
          data.records.map((record) => [record.projectId, record.projectName]),
        ),
      ).sort((left, right) => left[1].localeCompare(right[1])),
    [data.records],
  );
  const records = useMemo(
    () => filterPurchaserRecords(data.records, projectId),
    [data.records, projectId],
  );
  const summary = useMemo(() => buildPurchaserSummary(records), [records]);
  const activity = useMemo(() => buildPurchaserActivity(records), [records]);

  return (
    <main className="min-h-full bg-slate-50/40 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.04em] text-slate-950">Purchaser Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Track approved requests, supplier pricing, purchase orders, deliveries, and receipt references.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative">
            <span className="sr-only">Filter by project</span>
            <FolderKanban size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="h-10 min-w-56 rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100">
              <option value="all">All projects</option>
              {projects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <Link href="/purchasing-approvals" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-200">
            Manage purchases <ArrowRight size={15} />
          </Link>
          <div className="hidden border-l border-slate-200 pl-4 xl:block">
            <p className="text-sm font-semibold text-slate-900">{fullName?.trim() || "Purchaser"}</p>
            <p className="text-xs text-slate-500">Purchaser</p>
          </div>
        </div>
      </header>

      <PurchaserDashboardSummary summary={summary} />
      <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,.8fr)]">
        <PurchaserRequestsPanel records={records} />
        <PurchaserPricingPanel records={records} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <PurchaserOrdersPanel records={records} />
        <PurchaserActivityPanel items={activity} />
        <PurchaserReceiptsPanel records={records} />
      </div>
    </main>
  );
}

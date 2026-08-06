"use client";

import { CalendarDays, Info, Search } from "lucide-react";
import { useMemo, useState } from "react";
import CostTrackingBoard from "@/features/project-cost-tracking/components/CostTrackingBoard";
import CostTrackingSummary from "@/features/project-cost-tracking/components/CostTrackingSummary";
import type {
  MaterialCostRequest,
  ProjectExpenseRecord,
  ProjectMaterialReceipt,
  ProjectPurchaseOrder,
} from "@/features/project-cost-tracking/types";
import {
  buildCostTrackingSummary,
  buildTrackedProjectCosts,
} from "@/features/project-cost-tracking/utils/costTracking";

export default function ProjectCostTrackingPanel({
  startingBudget,
  materialRequests,
  purchaseOrders,
  materialReceipts,
  expenses,
}: {
  startingBudget: number;
  materialRequests: MaterialCostRequest[];
  purchaseOrders: ProjectPurchaseOrder[];
  materialReceipts: ProjectMaterialReceipt[];
  expenses: ProjectExpenseRecord[];
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const costs = useMemo(
    () =>
      buildTrackedProjectCosts(
        materialRequests,
        purchaseOrders,
        materialReceipts,
        expenses,
      ),
    [expenses, materialReceipts, materialRequests, purchaseOrders],
  );
  const categories = useMemo(
    () => Array.from(new Set(costs.map((cost) => cost.category))).sort(),
    [costs],
  );
  const filteredCosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    return costs.filter((cost) => {
      if (
        query &&
        !`${cost.name} ${cost.category} ${cost.workflowLabel} ${cost.notes ?? ""}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      if (category !== "all" && cost.category !== category) return false;
      if (dateFilter === "all") return true;
      if (!cost.date) return false;
      const costDate = new Date(cost.date);
      if (dateFilter === "past-due") {
        return cost.status !== "completed" && costDate < now;
      }
      return costDate >= thirtyDaysAgo && costDate <= now;
    });
  }, [category, costs, dateFilter, search]);
  const summary = buildCostTrackingSummary(startingBudget, costs);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-950">Cost tracking</h1>
        <p className="mt-1 text-sm text-slate-500">
          A read-only view of material commitments and project expenses against the approved budget.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 text-sm leading-6 text-slate-600">
        <Info size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          Pending and approved material costs stay in Upcoming. Ordered purchases move to Ongoing. Accepted materials and approved project expenses appear in Completed automatically.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(15rem,1.25fr)_minmax(12rem,0.8fr)_minmax(12rem,0.8fr)]">
        <label className="relative">
          <span className="sr-only">Search costs</span>
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tracked costs..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
        </label>
        <label>
          <span className="sr-only">Filter by category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
            <option value="all">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="relative">
          <CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <span className="sr-only">Filter by date</span>
          <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
            <option value="all">All dates</option>
            <option value="recent">Past 30 days</option>
            <option value="past-due">Past due</option>
          </select>
        </label>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_19rem]">
        <CostTrackingBoard costs={filteredCosts} />
        <CostTrackingSummary summary={summary} />
      </div>
    </div>
  );
}
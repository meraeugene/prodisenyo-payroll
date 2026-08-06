import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PurchaserDashboardRecord } from "@/features/purchaser-dashboard/types";
import {
  formatPurchaserCurrency,
  purchaseOrderCode,
} from "@/features/purchaser-dashboard/utils/purchaserDashboard";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-sky-50 text-sky-700",
  approved: "bg-emerald-50 text-emerald-700",
  ordered: "bg-violet-50 text-violet-700",
  received: "bg-emerald-50 text-emerald-700",
};

export default function PurchaserOrdersPanel({ records }: { records: PurchaserDashboardRecord[] }) {
  const orders = records.filter((record) => record.status !== "cancelled");
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,.035)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-bold text-slate-950">Purchase Orders</h2>
        <p className="mt-0.5 text-xs text-slate-500">Current purchasing and delivery state</p>
      </div>
      <div className="divide-y divide-slate-100">
        {orders.slice(0, 5).map((record) => {
          const cost = record.quantity * (record.actualUnitCost || record.estimatedUnitCost);
          return (
            <Link key={record.id} href="/purchasing-approvals" className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-5 py-3.5 hover:bg-slate-50/70">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500">{purchaseOrderCode(record.id)}</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900">{record.itemName}</p>
                <p className="mt-0.5 truncate text-[11px] text-slate-500">{record.supplierName || "Supplier pending"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">{cost > 0 ? formatPurchaserCurrency(cost) : "Unpriced"}</p>
                <span className={"mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-bold capitalize " + (STATUS_STYLES[record.status] || STATUS_STYLES.draft)}>
                  {record.status}
                </span>
              </div>
            </Link>
          );
        })}
        {!orders.length ? <p className="px-5 py-10 text-center text-sm text-slate-500">No purchase orders are available.</p> : null}
      </div>
      <Link href="/purchasing-approvals" className="flex items-center justify-center gap-1 border-t border-slate-100 px-5 py-3 text-xs font-bold text-emerald-800">
        Manage purchase orders <ArrowRight size={13} />
      </Link>
    </section>
  );
}

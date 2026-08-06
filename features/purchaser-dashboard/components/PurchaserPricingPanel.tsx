import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PurchaserDashboardRecord } from "@/features/purchaser-dashboard/types";
import { formatPurchaserCurrency } from "@/features/purchaser-dashboard/utils/purchaserDashboard";

export default function PurchaserPricingPanel({ records }: { records: PurchaserDashboardRecord[] }) {
  const priced = records.filter((record) => record.supplierName && record.actualUnitCost > 0);
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,.035)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-bold text-slate-950">Recorded Supplier Pricing</h2>
        <p className="mt-0.5 text-xs text-slate-500">Supplier and actual cost saved on purchase orders</p>
      </div>
      <div className="divide-y divide-slate-100">
        {priced.slice(0, 5).map((record) => (
          <div key={record.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-5 py-3.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{record.supplierName}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{record.itemName} · {record.projectName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900">{formatPurchaserCurrency(record.quantity * record.actualUnitCost)}</p>
              <p className="mt-0.5 text-[10px] uppercase text-emerald-700">Recorded</p>
            </div>
          </div>
        ))}
        {!priced.length ? <p className="px-5 py-10 text-center text-sm text-slate-500">No supplier pricing has been recorded.</p> : null}
      </div>
      <Link href="/purchasing-approvals" className="flex items-center justify-center gap-1 border-t border-slate-100 px-5 py-3 text-xs font-bold text-emerald-800">
        View all purchases <ArrowRight size={13} />
      </Link>
    </section>
  );
}

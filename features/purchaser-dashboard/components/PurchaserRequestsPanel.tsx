import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProjectThumbnail from "@/features/projects/components/ProjectThumbnail";
import type { PurchaserDashboardRecord } from "@/features/purchaser-dashboard/types";
import {
  formatPurchaserCurrency,
  formatPurchaserDate,
} from "@/features/purchaser-dashboard/utils/purchaserDashboard";

export default function PurchaserRequestsPanel({ records }: { records: PurchaserDashboardRecord[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,.035)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-bold text-slate-950">Approved Material Requests</h2>
          <p className="mt-0.5 text-xs text-slate-500">Purchase records created from CEO approvals</p>
        </div>
        <Link href="/purchasing-approvals" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
          Open purchasing <ArrowRight size={13} />
        </Link>
      </div>
      <div className="hidden grid-cols-[minmax(180px,1fr)_minmax(160px,1fr)_90px_120px_110px] gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[.08em] text-slate-500 lg:grid">
        <span>Project</span><span>Material</span><span>Quantity</span><span>Recorded pricing</span><span>Needed by</span>
      </div>
      <div className="divide-y divide-slate-100">
        {records.slice(0, 5).map((record) => {
          const unitCost = record.actualUnitCost || record.estimatedUnitCost;
          return (
            <Link key={record.id} href="/purchasing-approvals" className="grid gap-3 px-5 py-3.5 transition hover:bg-slate-50/70 lg:grid-cols-[minmax(180px,1fr)_minmax(160px,1fr)_90px_120px_110px] lg:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <ProjectThumbnail src={record.projectImageUrl} name={record.projectName} className="h-10 w-14 shrink-0 rounded-lg object-cover" />
                <p className="truncate text-sm font-bold text-slate-900">{record.projectName}</p>
              </div>
              <div>
                <p className="truncate text-sm font-semibold text-slate-800">{record.itemName}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{record.supplierName || "Supplier not recorded"}</p>
              </div>
              <p className="text-sm text-slate-700">{record.quantity} {record.unit}</p>
              <p className="text-sm font-bold text-slate-900">
                {unitCost > 0 ? formatPurchaserCurrency(record.quantity * unitCost) : "Not recorded"}
              </p>
              <p className="text-xs text-slate-600">{formatPurchaserDate(record.neededBy)}</p>
            </Link>
          );
        })}
        {!records.length ? <p className="px-5 py-12 text-center text-sm text-slate-500">No approved material purchases are assigned yet.</p> : null}
      </div>
    </section>
  );
}

import { CheckCircle2, Clock3, FileText, Truck } from "lucide-react";
import type { PurchaserActivityItem } from "@/features/purchaser-dashboard/types";
import { formatPurchaserDate } from "@/features/purchaser-dashboard/utils/purchaserDashboard";

const PRESENTATION = {
  emerald: { icon: CheckCircle2, classes: "bg-emerald-50 text-emerald-700" },
  sky: { icon: Truck, classes: "bg-sky-50 text-sky-700" },
  amber: { icon: FileText, classes: "bg-amber-50 text-amber-700" },
  slate: { icon: Clock3, classes: "bg-slate-100 text-slate-600" },
};

export default function PurchaserActivityPanel({ items }: { items: PurchaserActivityItem[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,.035)]">
      <div>
        <h2 className="font-bold text-slate-950">Recent Procurement Activity</h2>
        <p className="mt-0.5 text-xs text-slate-500">Latest saved state for each purchase</p>
      </div>
      <div className="mt-4 divide-y divide-slate-100">
        {items.slice(0, 5).map((item) => {
          const presentation = PRESENTATION[item.tone];
          const Icon = presentation.icon;
          return (
            <div key={item.id} className="flex gap-3 py-3 first:pt-0">
              <div className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-full " + presentation.classes}><Icon size={15} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900">{item.title}</p>
                <p className="mt-0.5 truncate text-[11px] text-slate-500">{item.detail}</p>
              </div>
              <p className="shrink-0 text-[10px] text-slate-400">{formatPurchaserDate(item.createdAt)}</p>
            </div>
          );
        })}
        {!items.length ? <p className="py-8 text-center text-sm text-slate-500">No procurement activity is available.</p> : null}
      </div>
    </section>
  );
}

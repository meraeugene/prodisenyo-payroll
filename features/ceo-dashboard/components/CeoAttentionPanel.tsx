import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import type { CeoAttentionItem } from "@/features/ceo-dashboard/types";

export default function CeoAttentionPanel({ items }: { items: CeoAttentionItem[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <div>
        <h2 className="font-bold text-slate-950">Needs Attention</h2>
        <p className="mt-0.5 text-xs text-slate-500">Derived from project dates and recorded spending</p>
      </div>
      <div className="mt-4 divide-y divide-slate-100">
        {items.slice(0, 5).map((item) => (
          <Link key={item.id} href={item.href} className="flex items-center gap-3 py-3 first:pt-0 hover:text-emerald-800">
            <div className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-full " + (item.tone === "rose" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700")}>
              <AlertTriangle size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900">{item.label}</p>
              <p className="mt-0.5 truncate text-[11px] text-slate-500">{item.detail}</p>
            </div>
            <ArrowRight size={13} className="shrink-0 text-slate-400" />
          </Link>
        ))}
        {!items.length ? (
          <div className="py-8 text-center">
            <p className="text-sm font-semibold text-emerald-700">No derived alerts</p>
            <p className="mt-1 text-xs text-slate-500">No overdue or over-budget project was found.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

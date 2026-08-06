import Link from "next/link";
import { Calculator, FileUp, Package, TrendingUp } from "lucide-react";
import type { CeoActivityItem } from "@/features/ceo-dashboard/types";
import { formatCeoDate } from "@/features/ceo-dashboard/utils/ceoDashboard";

const PRESENTATION = {
  progress: { icon: TrendingUp, tone: "bg-emerald-50 text-emerald-700" },
  material: { icon: Package, tone: "bg-sky-50 text-sky-700" },
  estimate: { icon: Calculator, tone: "bg-amber-50 text-amber-700" },
  document: { icon: FileUp, tone: "bg-violet-50 text-violet-700" },
};

export default function CeoRecentActivityPanel({ items }: { items: CeoActivityItem[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <div>
        <h2 className="font-bold text-slate-950">Recent Workflow Activity</h2>
        <p className="mt-0.5 text-xs text-slate-500">Progress, material, estimate, and document records</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.slice(0, 8).map((item) => {
          const itemPresentation = PRESENTATION[item.type];
          const Icon = itemPresentation.icon;
          return (
            <Link key={item.id} href={item.href} className="flex gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-emerald-200 hover:bg-emerald-50/30">
              <div className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-full " + itemPresentation.tone}>
                <Icon size={15} />
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-xs font-bold leading-5 text-slate-900">{item.title}</p>
                <p className="mt-1 truncate text-[11px] text-slate-500">{item.detail}</p>
                <p className="mt-1 text-[10px] text-slate-400">{item.actor} · {formatCeoDate(item.createdAt)}</p>
              </div>
            </Link>
          );
        })}
        {!items.length ? (
          <p className="md:col-span-2 xl:col-span-4 py-8 text-center text-sm text-slate-500">No workflow activity is available yet.</p>
        ) : null}
      </div>
    </section>
  );
}

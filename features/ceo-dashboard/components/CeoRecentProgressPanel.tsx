import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import type { CeoProgressUpdate } from "@/features/ceo-dashboard/types";
import { formatCeoDate } from "@/features/ceo-dashboard/utils/ceoDashboard";

export default function CeoRecentProgressPanel({
  updates,
}: {
  updates: CeoProgressUpdate[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-bold text-slate-950">Recent Progress Updates</h2>
          <p className="mt-0.5 text-xs text-slate-500">Engineer-submitted overall progress</p>
        </div>
        <Link href="/projects" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
          View all <ArrowRight size={13} />
        </Link>
      </div>
      <div className="divide-y divide-slate-100">
        {updates.slice(0, 4).map((update) => (
          <Link key={update.id} href={"/projects/" + update.projectId} className="flex gap-3 px-5 py-4 hover:bg-slate-50/70">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <TrendingUp size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-bold text-slate-950">{update.projectName}</p>
                <span className="shrink-0 text-xs font-bold text-emerald-700">{update.overallPercent}%</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{update.summary}</p>
              <p className="mt-1 text-[10px] text-slate-400">{update.engineer} · {formatCeoDate(update.createdAt)}</p>
            </div>
          </Link>
        ))}
        {!updates.length ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">No progress updates have been submitted yet.</p>
        ) : null}
      </div>
    </section>
  );
}

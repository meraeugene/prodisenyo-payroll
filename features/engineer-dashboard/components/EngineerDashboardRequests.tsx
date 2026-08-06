import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import type { EngineerDashboardMaterialRequest } from "@/features/engineer-dashboard/types";
import { formatDashboardDate } from "@/features/engineer-dashboard/utils/engineerDashboard";
import { cn } from "@/lib/utils";

export default function EngineerDashboardRequests({ requests }: { requests: EngineerDashboardMaterialRequest[] }) {
  return (
    <section className="flex min-h-72 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_22px_rgba(15,23,42,0.04)]">
      <h2 className="text-lg font-semibold tracking-tight text-slate-950">Material Requests</h2>
      <div className="mt-4 flex-1 space-y-3">
        {requests.length === 0 ? <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No material requests for this project.</p> : requests.slice(0, 4).map((request) => (
          <div key={request.id} className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500"><Package size={17} /></div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{request.materialName}</p><p className="mt-0.5 truncate text-xs text-slate-500">{request.quantity} {request.unit} · {formatDashboardDate(request.createdAt)}</p></div>
            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize", request.status === "rejected" ? "bg-rose-50 text-rose-700" : request.status === "submitted" ? "bg-amber-50 text-amber-700" : request.status === "received" ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700")}>{request.status}</span>
          </div>
        ))}
      </div>
      <Link href="/request-material" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900">View all requests <ArrowRight size={15} /></Link>
    </section>
  );
}

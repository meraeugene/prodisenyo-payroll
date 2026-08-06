import Link from "next/link";
import { AlertTriangle, ArrowRight, Calculator, CalendarClock, PackageX } from "lucide-react";
import type { EngineerDashboardAlert } from "@/features/engineer-dashboard/types";

const icons = { estimate: Calculator, material: PackageX, schedule: CalendarClock };

export default function EngineerDashboardAlerts({ alerts }: { alerts: EngineerDashboardAlert[] }) {
  return (
    <section className="flex min-h-72 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_22px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold tracking-tight text-slate-950">Workflow Alerts</h2><AlertTriangle size={18} className="text-amber-500" /></div>
      <div className="mt-4 flex-1 space-y-3">
        {alerts.length === 0 ? <p className="rounded-xl bg-emerald-50 px-4 py-8 text-center text-sm text-emerald-700">No workflow items need attention.</p> : alerts.slice(0, 4).map((alert) => {
          const Icon = icons[alert.kind];
          return <Link key={alert.id} href={alert.href} className="group flex gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-amber-200 hover:bg-amber-50/40"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><Icon size={17} /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{alert.title}</p><p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">{alert.detail}</p></div><ArrowRight size={14} className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-amber-600" /></Link>;
        })}
      </div>
    </section>
  );
}

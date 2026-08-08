import {
  CalendarCheck2,
  CheckCircle2,
  CircleAlert,
  FileClock,
  FilePlus2,
} from "lucide-react";
import type {
  PayrollActivityItem,
  PayrollActivityType,
} from "@/features/payroll-dashboard/types";
import { formatPayrollDateTime } from "@/features/payroll-dashboard/utils/payrollDashboard";

const PRESENTATION: Record<
  PayrollActivityType,
  { icon: typeof CalendarCheck2; tone: string }
> = {
  attendance: { icon: CalendarCheck2, tone: "bg-sky-50 text-sky-700" },
  created: { icon: FilePlus2, tone: "bg-amber-50 text-amber-700" },
  submitted: { icon: FileClock, tone: "bg-violet-50 text-violet-700" },
  approved: { icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
  rejected: { icon: CircleAlert, tone: "bg-rose-50 text-rose-700" },
};

export default function PayrollRecentActivityPanel({
  items,
}: {
  items: PayrollActivityItem[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <h2 className="font-bold text-slate-950">Recent Activity</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Attendance and payroll workflow records
      </p>

      <div className="mt-4 divide-y divide-slate-100">
        {items.map((item) => {
          const presentation = PRESENTATION[item.type];
          const Icon = presentation.icon;
          return (
            <article key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <span
                className={
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full " +
                  presentation.tone
                }
              >
                <Icon size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-bold leading-5 text-slate-900">
                    {item.title}
                  </p>
                  <time className="shrink-0 text-[10px] text-slate-400">
                    {formatPayrollDateTime(item.createdAt)}
                  </time>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-slate-500">
                  {item.detail}
                </p>
                <p className="mt-1 text-[10px] font-medium text-slate-400">
                  {item.actor}
                </p>
              </div>
            </article>
          );
        })}
        {!items.length ? (
          <div className="rounded-xl bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-slate-800">No payroll activity yet</p>
            <p className="mt-1 text-xs text-slate-500">Saved workflow events will appear here.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

import { CircleAlert } from "lucide-react";
import type { ReturnedPayrollRow } from "@/features/payroll-dashboard/types";
import { formatPayrollDate } from "@/features/payroll-dashboard/utils/payrollDashboard";

export default function ReturnedSubmissionsPanel({
  submissions,
}: {
  submissions: ReturnedPayrollRow[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <div className="flex items-center gap-2">
        <CircleAlert size={17} className="text-rose-600" />
        <h2 className="font-bold text-slate-950">Returned Submissions</h2>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Persisted CEO correction notes
      </p>

      <div className="mt-4 space-y-3">
        {submissions.map((submission) => (
          <article key={submission.id} className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-900">{submission.siteName}</p>
                <p className="mt-0.5 truncate text-[11px] text-slate-500">{submission.periodLabel}</p>
              </div>
              <span className="shrink-0 text-[10px] font-semibold text-rose-700">
                {formatPayrollDate(submission.rejectedAt)}
              </span>
            </div>
            <p className="mt-2 line-clamp-3 text-[11px] leading-5 text-rose-800">
              {submission.rejectionReason?.trim() || "No correction note was recorded."}
            </p>
          </article>
        ))}
        {!submissions.length ? (
          <div className="rounded-xl bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-slate-800">No returned payroll reports</p>
            <p className="mt-1 text-xs text-slate-500">CEO correction notes will appear here.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

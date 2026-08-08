import Link from "next/link";
import { ArrowRight, Upload } from "lucide-react";
import type {
  AttendanceBatchStatus,
  PayrollDashboardBatch,
} from "@/features/payroll-dashboard/types";
import { formatPayrollDate } from "@/features/payroll-dashboard/utils/payrollDashboard";

const STATUS_PRESENTATION: Record<
  AttendanceBatchStatus,
  { label: string; className: string }
> = {
  ready: { label: "Ready for payroll", className: "bg-amber-50 text-amber-700" },
  draft: { label: "Draft", className: "bg-sky-50 text-sky-700" },
  awaiting_ceo: {
    label: "Awaiting CEO",
    className: "bg-violet-50 text-violet-700",
  },
  approved: { label: "Approved", className: "bg-emerald-50 text-emerald-700" },
  returned: { label: "Returned", className: "bg-rose-50 text-rose-700" },
};

function batchAction(batch: PayrollDashboardBatch) {
  if (!batch.isLatestOwnedBatch) {
    return { href: "/attendance-analytics", label: "View" };
  }
  if (batch.status === "ready") {
    return { href: "/review-attendance", label: "Review" };
  }
  if (batch.status === "draft" || batch.status === "returned") {
    return { href: "/generate-payroll", label: "Continue" };
  }
  return { href: "/attendance-analytics", label: "View" };
}

export default function AttendanceBatchesPanel({
  batches,
}: {
  batches: PayrollDashboardBatch[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-bold text-slate-950">Recent Attendance Batches</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Latest saved imports across all sites
          </p>
        </div>
        <Link
          href="/attendance-analytics"
          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          View all <ArrowRight size={13} />
        </Link>
      </div>

      {batches.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left">
            <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Site / Project</th>
                <th className="px-4 py-3">Pay Period</th>
                <th className="px-4 py-3 text-center">Employees</th>
                <th className="px-4 py-3 text-center">Records</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.map((batch) => {
                const status = STATUS_PRESENTATION[batch.status];
                const action = batchAction(batch);
                return (
                  <tr key={batch.id} className="text-xs text-slate-600">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900">{batch.siteName}</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Uploaded {formatPayrollDate(batch.createdAt)}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-800">
                        {batch.periodLabel}
                      </p>
                      {batch.periodStart && batch.periodEnd ? (
                        <p className="mt-1 text-[11px] text-slate-400">
                          {formatPayrollDate(batch.periodStart)} – {formatPayrollDate(batch.periodEnd)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 text-center font-semibold text-slate-800">
                      {batch.employeeCount ?? "Unavailable"}
                    </td>
                    <td className="px-4 py-3.5 text-center font-semibold text-slate-800">
                      {batch.recordCount ?? "Unavailable"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={
                          "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold " +
                          status.className
                        }
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={action.href}
                        className="inline-flex h-8 items-center rounded-lg border border-emerald-700 px-3 text-[11px] font-bold text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                      >
                        {action.label}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-semibold text-slate-800">
            No attendance batches yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Upload a biometric attendance file to start the payroll workflow.
          </p>
        </div>
      )}

      <div className="border-t border-slate-100 px-5 py-3.5">
        <Link
          href="/upload-attendance"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-700 px-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          <Upload size={14} /> Upload Attendance
        </Link>
      </div>
    </section>
  );
}

import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import type { PayrollApprovalRow } from "@/features/payroll-dashboard/types";
import {
  formatPayrollCurrency,
  formatPayrollDate,
} from "@/features/payroll-dashboard/utils/payrollDashboard";

export default function PayrollApprovalsPanel({
  approvals,
}: {
  approvals: PayrollApprovalRow[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-bold text-slate-950">Awaiting CEO Approval</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Submitted payroll reports awaiting a decision
          </p>
        </div>
        <Link
          href="/payroll-analytics"
          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          Analytics <ArrowRight size={13} />
        </Link>
      </div>

      {approvals.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[660px] text-left">
            <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Site / Project</th>
                <th className="px-4 py-3">Pay Period</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-5 py-3 text-right">Net Payroll</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {approvals.map((approval) => (
                <tr key={approval.id} className="text-xs text-slate-600">
                  <td className="px-5 py-3.5 font-bold text-slate-900">
                    {approval.siteName}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-800">{approval.periodLabel}</p>
                    {approval.periodStart && approval.periodEnd ? (
                      <p className="mt-1 text-[11px] text-slate-400">
                        {formatPayrollDate(approval.periodStart)} – {formatPayrollDate(approval.periodEnd)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-amber-700">
                      <Clock3 size={13} /> {formatPayrollDate(approval.submittedAt)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                    {formatPayrollCurrency(approval.netTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 py-10 text-center">
          <p className="text-sm font-semibold text-slate-800">Approval queue is clear</p>
          <p className="mt-1 text-xs text-slate-500">No submitted payroll reports are waiting for CEO review.</p>
        </div>
      )}
    </section>
  );
}

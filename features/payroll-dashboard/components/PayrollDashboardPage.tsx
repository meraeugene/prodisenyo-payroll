import Link from "next/link";
import { Clock3, Upload } from "lucide-react";
import AttendanceBatchesPanel from "@/features/payroll-dashboard/components/AttendanceBatchesPanel";
import PayrollApprovalsPanel from "@/features/payroll-dashboard/components/PayrollApprovalsPanel";
import PayrollDashboardSummaryCards from "@/features/payroll-dashboard/components/PayrollDashboardSummaryCards";
import PayrollOverviewPanel from "@/features/payroll-dashboard/components/PayrollOverviewPanel";
import PayrollRecentActivityPanel from "@/features/payroll-dashboard/components/PayrollRecentActivityPanel";
import ReturnedSubmissionsPanel from "@/features/payroll-dashboard/components/ReturnedSubmissionsPanel";
import type { PayrollDashboardData } from "@/features/payroll-dashboard/types";

export default function PayrollDashboardPage({
  data,
  fullName,
}: {
  data: PayrollDashboardData;
  fullName: string | null;
}) {
  const displayName = fullName?.trim() || "Payroll Manager";

  return (
    <main className="min-h-full bg-slate-50/40 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.04em] text-slate-950">
            Payroll / Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage attendance and payroll, then track reports submitted for CEO approval.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/request-overtime"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <Clock3 size={16} /> Request Overtime
          </Link>
          <Link
            href="/upload-attendance"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <Upload size={16} /> Upload Attendance
          </Link>
          <div className="hidden border-l border-slate-200 pl-4 xl:block">
            <p className="text-sm font-semibold text-slate-900">{displayName}</p>
            <p className="text-xs text-slate-500">Payroll Manager</p>
          </div>
        </div>
      </header>

      <PayrollDashboardSummaryCards summary={data.summary} />

      <div className="mt-5 grid items-start gap-5 2xl:grid-cols-[minmax(0,1.55fr)_minmax(370px,.75fr)]">
        <AttendanceBatchesPanel batches={data.recentBatches} />
        <PayrollOverviewPanel
          overview={data.payrollOverview}
          hasOwnedAttendance={data.hasOwnedAttendance}
        />
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,.64fr)_minmax(320px,.76fr)]">
        <PayrollApprovalsPanel approvals={data.awaitingApprovals} />
        <ReturnedSubmissionsPanel submissions={data.returnedSubmissions} />
        <PayrollRecentActivityPanel items={data.recentActivity} />
      </div>
    </main>
  );
}

"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import DashboardPageHero from "@/components/DashboardPageHero";
import PayrollInsightsDashboard from "@/components/PayrollInsightsDashboard";
import { useHistoricalDashboardData } from "@/features/dashboard/hooks/useHistoricalDashboardData";
import { PayrollAnalyticsLoadingState } from "./PayrollAnalyticsLoadingState";

export default function PayrollAnalyticsPageClient() {
  const searchParams = useSearchParams();
  const { data, loading, error, selectedPeriodKey, setSelectedPeriodKey } =
    useHistoricalDashboardData({
      includeEmployees: true,
      includeAttendance: true,
      includePayrollItems: true,
      includePayrollDailyTotals: true,
    });
  const runIdFromQuery = searchParams.get("runId");
  const payrollRows = data?.payrollRows ?? [];
  const attendanceRows = data?.payrollAttendanceInputs ?? [];
  const dailyPaidPoints = data?.payrollDailyPaidPoints ?? [];
  const periodOptions = data?.periodOptions ?? [];
  const hasPayrollAnalyticsData = payrollRows.length > 0;

  useEffect(() => {
    if (!runIdFromQuery) return;
    if (runIdFromQuery === selectedPeriodKey) return;
    setSelectedPeriodKey(runIdFromQuery);
  }, [runIdFromQuery, selectedPeriodKey, setSelectedPeriodKey]);

  return (
    <div className="space-y-4 p-0 sm:p-6">
      <DashboardPageHero
        eyebrow="Data Analytics"
        title="Payroll Analytics"
        description="Track payroll distribution, employee compensation, project costs, and payroll insights for the selected pay period."
      />
      {periodOptions.length > 0 ? (
        <section className="rounded-[14px] border border-apple-mist bg-white p-4 shadow-[0_10px_30px_rgba(24,83,43,0.07)]">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-apple-charcoal">
              Payroll Period
            </p>
            <select
              value={selectedPeriodKey ?? ""}
              onChange={(event) =>
                setSelectedPeriodKey(event.target.value || null)
              }
              className="h-11 min-w-[260px] rounded-[12px] border border-[#d9e2e6] bg-white px-3 text-sm text-[#334951] transition-all hover:border-[#0f6f74]/35 focus:border-[#0f6f74] focus:outline-none focus:ring-2 focus:ring-[#0f6f74]/10"
            >
              {periodOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label} - {option.siteName}
                </option>
              ))}
            </select>
          </div>
        </section>
      ) : null}
      {loading && !data && !error ? (
        <PayrollAnalyticsLoadingState />
      ) : hasPayrollAnalyticsData ? (
        <PayrollInsightsDashboard
          payrollRows={payrollRows}
          attendanceRows={attendanceRows}
          dailyPaidPoints={dailyPaidPoints}
        />
      ) : error ? (
        <section className="rounded-[14px] border border-red-100 bg-red-50 p-6 shadow-[0_10px_30px_rgba(24,83,43,0.07)]">
          <p className="text-sm text-red-700">{error}</p>
        </section>
      ) : (
        <section className="rounded-[14px] border border-apple-mist bg-white p-6 shadow-[0_10px_30px_rgba(24,83,43,0.07)]">
          <p className="text-sm text-apple-smoke">
            No saved payroll periods yet.
          </p>
        </section>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import type {
  HistoricalDashboardAttendanceLog,
  HistoricalDashboardDailyTotal,
  HistoricalDashboardPayrollItem,
} from "@/features/dashboard/hooks/useHistoricalDashboardData";
import {
  buildSiteCards,
  formatPeso,
} from "@/features/dashboard/utils/ceoDepartmentReviewHelpers";

interface CeoDepartmentReviewProps {
  attendancePeriod: string;
  payrollItems: HistoricalDashboardPayrollItem[];
  attendanceLogs: HistoricalDashboardAttendanceLog[];
  dailyTotals: HistoricalDashboardDailyTotal[];
}

export default function CeoDepartmentReview({
  payrollItems,
}: CeoDepartmentReviewProps) {
  const siteCards = useMemo(() => buildSiteCards(payrollItems), [payrollItems]);

  return (
    <section className="mb-5 sm:rounded-[12px] bg-white sm:p-5 shadow-[0_10px_30px_rgba(24,83,43,0.07)]">
      <div className="mb-4 hidden sm:flex items-center justify-between">
        <div>
          <p className="text-[15px] font-semibold text-apple-charcoal">
            Department Cards
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {siteCards.length > 0 ? (
          siteCards.map((card) => (
            <div
              key={card.siteName}
              className="rounded-[16px] bg-[linear-gradient(135deg,#112e1a,#1f4f2c,#245f34)] p-5 text-left text-white shadow-[0_18px_36px_rgba(22,101,52,0.16)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{card.shortSite}</p>
                </div>
                <span className="inline-flex rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/75">
                  Summary
                </span>
              </div>

              <p className="mt-6 text-[12px] uppercase tracking-[0.28em] text-white/55">
                Employees
              </p>
              <p className="mt-2 text-[28px] font-semibold tracking-[-0.03em]">
                {card.employees.toLocaleString("en-PH")}
              </p>

              <p className="mt-6 text-[12px] uppercase tracking-[0.28em] text-white/55">
                Total Payroll
              </p>
              <p className="mt-2 text-[30px] font-semibold tracking-[-0.03em]">
                {formatPeso(card.payrollTotal)}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-[16px] bg-[linear-gradient(135deg,#112e1a,#1f4f2c,#245f34)] p-5 text-white shadow-[0_18px_36px_rgba(22,101,52,0.16)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">OPERATIONS</p>
              <span className="text-[11px] text-white/65">DEPT</span>
            </div>
            <p className="mt-8 text-sm text-white/70">
              No approved payroll sites are available yet.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

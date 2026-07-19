import type { HistoricalDashboardSelectedRun } from "@/features/dashboard/hooks/useHistoricalDashboardData";

export default function DashboardSelectedRunSection({
  selectedRun,
  employeeCount,
}: {
  selectedRun: HistoricalDashboardSelectedRun | null;
  employeeCount: number;
}) {
  return (
    <section className="mb-5 rounded-[12px] bg-white p-5 shadow-[0_10px_30px_rgba(24,83,43,0.07)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
            CEO Payroll Review
          </p>
          <h2 className="mt-2 text-xl font-semibold text-apple-charcoal">
            {selectedRun
              ? "Selected Approved Payroll"
              : "No Approved Payroll Selected"}
          </h2>
        </div>

        {selectedRun ? (
          <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-700">
            {selectedRun.status}
          </span>
        ) : null}
      </div>

      {selectedRun ? (
        <div className="mt-4 grid gap-3 rounded-[18px] border border-apple-mist bg-[rgb(var(--apple-snow))] p-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
              Site
            </p>
            <p className="mt-1 text-sm font-semibold text-apple-charcoal">
              {selectedRun.siteName}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
              Payroll Period
            </p>
            <p className="mt-1 text-sm font-semibold text-apple-charcoal">
              {selectedRun.periodLabel}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
              Submitted
            </p>
            <p className="mt-1 text-sm font-semibold text-apple-charcoal">
              {selectedRun.submittedAt
                ? new Date(selectedRun.submittedAt).toLocaleString("en-PH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "Not submitted"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
              Employees
            </p>
            <p className="mt-1 text-sm font-semibold text-apple-charcoal">
              {employeeCount.toLocaleString("en-PH")}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-[18px] border border-dashed border-apple-mist bg-[rgb(var(--apple-snow))] p-4 text-sm text-apple-steel">
          No approved payroll report is available for review yet.
        </div>
      )}
    </section>
  );
}

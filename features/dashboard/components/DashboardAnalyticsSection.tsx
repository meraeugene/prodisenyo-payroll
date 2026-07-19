import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartTooltip from "@/components/charts/ChartTooltip";
import type { HistoricalDashboardPeriodOption } from "@/features/dashboard/hooks/useHistoricalDashboardData";
import type {
  DashboardPayrollDistributionDatum,
  DashboardWorkforceDatum,
} from "@/features/dashboard/types";
import { formatPayrollNumber } from "@/features/payroll/utils/payrollFormatters";

const PESO_SIGN = "\u20B1";

export default function DashboardAnalyticsSection({
  periodOptions,
  selectedPeriodKey,
  onSelectPeriod,
  workforceByBranch,
  payrollDistributionData,
}: {
  periodOptions: HistoricalDashboardPeriodOption[];
  selectedPeriodKey: string | null;
  onSelectPeriod: (value: string | null) => void;
  workforceByBranch: DashboardWorkforceDatum[];
  payrollDistributionData: DashboardPayrollDistributionDatum[];
}) {
  return (
    <section className="mb-5">
      <div className="rounded-[12px] bg-white p-5 shadow-[0_10px_30px_rgba(24,83,43,0.07)]">
        <div className="mb-5 flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[15px] font-semibold text-apple-charcoal">
              Analytics Overview
            </p>
          </div>
          {periodOptions.length > 0 ? (
            <div className="flex w-full flex-col items-start gap-2 md:w-auto md:flex-row md:flex-wrap md:items-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-apple-steel">
                Payroll Period
              </p>
              <select
                value={selectedPeriodKey ?? ""}
                onChange={(event) => onSelectPeriod(event.target.value || null)}
                className="h-10 w-full min-w-0 rounded-xl border border-apple-mist bg-white px-3 text-sm font-medium text-apple-charcoal outline-none transition hover:border-apple-steel focus:border-[#1f6a37] md:min-w-[300px] md:w-auto"
              >
                {periodOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label} - {option.siteName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="rounded-[12px] border border-apple-mist bg-[rgb(var(--apple-snow))] p-4">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-apple-charcoal">
                Employees per Branch
              </p>
            </div>

            <div className="h-[240px] sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={workforceByBranch}
                  barCategoryGap="28%"
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgb(var(--theme-chart-grid))"
                  />
                  <XAxis
                    dataKey="shortBranch"
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    tick={{
                      fill: "rgb(var(--theme-chart-axis))",
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "rgb(var(--theme-chart-axis))",
                      fontSize: 11,
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgb(var(--theme-chart-cursor))" }}
                    content={(props) => (
                      <ChartTooltip {...props} unit="employees" />
                    )}
                  />
                  <Bar dataKey="employees" radius={[6, 6, 6, 6]} barSize={38}>
                    {workforceByBranch.map((entry, index) => (
                      <Cell
                        key={`overview-workforce-${entry.shortBranch}-${index}`}
                        fill={entry.fill}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-[12px] border border-apple-mist bg-[rgb(var(--apple-snow))] p-4">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-apple-charcoal">
                Payroll Distribution by Project
              </p>
            </div>

            <div className="grid gap-4 md:h-[260px] md:grid-cols-[minmax(0,1fr)_160px]">
              <div className="h-[220px] md:h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={payrollDistributionData}
                      dataKey="value"
                      nameKey="shortName"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={76}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {payrollDistributionData.map((entry, index) => (
                        <Cell
                          key={`overview-payroll-distribution-${entry.name}-${index}`}
                          fill={entry.fill}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0]?.payload as
                          | {
                              shortName?: string;
                              name?: string;
                              value?: number;
                            }
                          | undefined;
                        return (
                          <div className="rounded-xl border border-apple-mist bg-white p-3 text-apple-charcoal shadow-xl backdrop-blur-md">
                            <p className="mb-1 text-[10px] uppercase tracking-widest opacity-60">
                              Branch
                            </p>
                            <p className="max-w-[160px] truncate text-xs font-semibold text-apple-smoke">
                              {item?.shortName ?? item?.name ?? "Unknown"}
                            </p>
                            <div className="mt-1 flex items-baseline gap-1">
                              <span className="text-lg font-bold">
                                {PESO_SIGN}{" "}
                                {formatPayrollNumber(item?.value ?? 0)}
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3 md:overflow-y-auto md:pr-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-apple-silver">
                  Branch
                </p>
                {payrollDistributionData.length > 0 ? (
                  payrollDistributionData.map((item, index) => (
                    <div
                      key={`overview-payroll-legend-${item.name}-${index}`}
                      className="flex items-start gap-2"
                    >
                      <span
                        className="mt-1 h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-medium text-apple-smoke">
                          {item.shortName}
                        </p>
                        <p className="truncate text-xs font-semibold text-apple-charcoal">
                          {PESO_SIGN} {formatPayrollNumber(item.value)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-apple-steel">
                    No saved payroll runs yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

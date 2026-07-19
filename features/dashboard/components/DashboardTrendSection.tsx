import { Loader2 } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint, TrendRange } from "@/lib/payrollTrend";
import {
  formatCompactDashboardCurrency,
  formatDashboardTrendPercent,
} from "@/features/dashboard/utils/dashboardFormatters";
import { formatPayrollNumber } from "@/features/payroll/utils/payrollFormatters";
import { cn } from "@/lib/utils";

const PESO_SIGN = "\u20B1";

export default function DashboardTrendSection({
  trendRange,
  onRangeChange,
  loading,
  trendPoints,
  trendPercent,
  latestTrendPoint,
}: {
  trendRange: TrendRange;
  onRangeChange: (range: TrendRange) => void;
  loading: boolean;
  trendPoints: TrendPoint[];
  trendPercent: number | null;
  latestTrendPoint: TrendPoint | null;
}) {
  return (
    <section className="mb-5 rounded-[12px] bg-white p-5 shadow-[0_10px_30px_rgba(24,83,43,0.07)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
            CEO Payroll Report Trend
          </p>
          <h2 className="mt-2 text-xl font-semibold text-apple-charcoal">
            Approved Payroll Movement
          </h2>

          {trendPercent !== null ? (
            <p
              className={cn(
                "mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                trendPercent >= 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700",
              )}
            >
              {formatDashboardTrendPercent(trendPercent)}
            </p>
          ) : null}
        </div>

        <div className="inline-flex rounded-xl border border-apple-mist bg-[rgb(var(--apple-snow))] p-1">
          {(["daily", "weekly", "monthly", "yearly"] as TrendRange[]).map(
            (range) => (
              <button
                key={range}
                type="button"
                onClick={() => onRangeChange(range)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition",
                  trendRange === range
                    ? "bg-[#1f6a37] text-white"
                    : "text-apple-steel hover:text-apple-charcoal",
                )}
              >
                {range}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="mt-5 h-[320px]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2
              size={26}
              className="animate-spin text-[#1f6a37]"
              aria-label="Loading trend data"
            />
          </div>
        ) : trendPoints.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-apple-steel">
            No approved payroll reports yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trendPoints}
              margin={{ top: 10, right: 10, left: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="ceoDashboardTrendFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgb(var(--theme-chart-grid))"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "rgb(var(--theme-chart-axis))", fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "rgb(var(--theme-chart-axis))", fontSize: 11 }}
                tickFormatter={(value) =>
                  formatCompactDashboardCurrency(Number(value))
                }
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0]?.payload as TrendPoint | undefined;
                  if (!point) return null;
                  return (
                    <div className="rounded-xl border border-apple-mist bg-white p-3 text-apple-charcoal shadow-xl">
                      <p className="text-xs font-semibold">{point.label}</p>
                      <p className="mt-1 text-sm font-semibold text-emerald-700">
                        {PESO_SIGN} {formatPayrollNumber(point.total)}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#16a34a"
                strokeWidth={3}
                fill="url(#ceoDashboardTrendFill)"
                dot={{ r: 0 }}
                activeDot={{
                  r: 5,
                  fill: "#16a34a",
                  stroke: "white",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {latestTrendPoint ? (
        <div className="mt-4 rounded-xl border border-apple-mist bg-[rgb(var(--apple-snow))] p-3">
          <p className=" text-apple-steel">
            Latest {trendRange} paid total:{" "}
            <span className="font-semibold text-apple-charcoal">
              {PESO_SIGN} {formatPayrollNumber(latestTrendPoint.total)}
            </span>
          </p>
        </div>
      ) : null}
    </section>
  );
}

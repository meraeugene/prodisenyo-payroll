import type { TooltipProps } from "recharts";
import { formatPayrollNumber } from "@/features/payroll/utils/payrollFormatters";
import { cn } from "@/lib/utils";

export function PayrollReportSummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-400/25 bg-[linear-gradient(135deg,#112e1a,#1f4f2c,#245f34)] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

export function PayrollReportSummaryChip({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-emerald-400/25 bg-[linear-gradient(135deg,#112e1a,#1f4f2c,#245f34)] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-white">
        {value.toLocaleString("en-PH")}
      </p>
    </div>
  );
}

export function PayrollReportMetricRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <tr>
      <td className="px-4 py-2 text-apple-steel">{label}</td>
      <td
        className={cn(
          "px-4 py-2 text-right font-semibold text-apple-charcoal",
          valueClass,
        )}
      >
        {value}
      </td>
    </tr>
  );
}

export function PayrollReportAnalyticsTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: TooltipProps<any, any> & {
  valueFormatter?: (value: number, name: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="min-w-[156px] rounded-xl border border-apple-mist bg-white px-3 py-2 shadow-[0_10px_28px_rgba(2,6,23,0.08)]">
      {label ? (
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-apple-smoke">
          {label}
        </p>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry, index) => {
          const numericValue =
            typeof entry.value === "number"
              ? entry.value
              : Number(entry.value ?? 0);
          const name = String(entry.name ?? entry.dataKey ?? "Value");

          return (
            <div key={`${name}-${index}`} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: entry.color ?? "rgb(var(--theme-chart-2))",
                }}
              />
              <span className="text-[11px] text-apple-smoke">{name}</span>
              <span className="ml-auto text-[12px] font-semibold text-apple-charcoal">
                {valueFormatter
                  ? valueFormatter(numericValue, name)
                  : formatPayrollNumber(numericValue)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PayrollReportDashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-2xl bg-[rgb(var(--apple-snow))]"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="h-[320px] animate-pulse rounded-2xl bg-[rgb(var(--apple-snow))]" />
        <div className="space-y-4">
          <div className="h-[152px] animate-pulse rounded-2xl bg-[rgb(var(--apple-snow))]" />
          <div className="h-[152px] animate-pulse rounded-2xl bg-[rgb(var(--apple-snow))]" />
        </div>
      </div>
      <div className="h-[420px] animate-pulse rounded-2xl bg-[rgb(var(--apple-snow))]" />
    </div>
  );
}

export function PayrollReportStatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-emerald-500/15 bg-[linear-gradient(135deg,#112e1a,#1f4f2c,#245f34)] px-3 py-3 text-white shadow-[0_14px_28px_rgba(17,46,26,0.18)] sm:px-4 sm:py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{value}</p>
    </div>
  );
}

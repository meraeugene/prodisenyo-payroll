import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE_STYLES = {
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-600",
  sky: "bg-sky-50 text-sky-600",
  green: "bg-green-50 text-green-700",
} as const;

export default function CostEstimatorOverviewMetric({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  tone: keyof typeof TONE_STYLES;
}) {
  return (
    <article className="flex min-h-[126px] items-center gap-5 rounded-[14px] border border-slate-200 bg-white px-7 py-6 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-14 shrink-0 items-center justify-center rounded-[14px]",
          TONE_STYLES[tone],
        )}
      >
        <Icon size={29} strokeWidth={1.8} />
      </span>
      <div>
        <p className="text-[30px] font-semibold leading-none tracking-[-0.03em] text-emerald-950">
          {value}
        </p>
        <p className="mt-2 text-[15px] text-slate-600">{label}</p>
      </div>
    </article>
  );
}

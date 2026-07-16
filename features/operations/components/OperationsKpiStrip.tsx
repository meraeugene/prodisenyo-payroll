import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Building2, ClipboardCheck, ShoppingBag } from "lucide-react";

type Kpi = {
  icon: LucideIcon;
  label: string;
  value: number | string;
  note: string;
  tone: "green" | "red" | "amber";
};

export default function OperationsKpiStrip({
  activeProjects,
  averageProgress,
  blockedProjects,
  pendingApprovals,
  siteCount,
}: {
  activeProjects: number;
  averageProgress: number;
  blockedProjects: number;
  pendingApprovals: number;
  siteCount: number;
}) {
  const metrics: Kpi[] = [
    { icon: Building2, label: "Active Projects", value: activeProjects, note: `Across ${siteCount} active ${siteCount === 1 ? "site" : "sites"}`, tone: "green" },
    { icon: ClipboardCheck, label: "Reported Progress", value: `${averageProgress}%`, note: "Average completion", tone: "green" },
    { icon: AlertTriangle, label: "Blocked Projects", value: blockedProjects, note: "Require attention", tone: "red" },
    { icon: ShoppingBag, label: "Pending Approvals", value: pendingApprovals, note: "Material requests", tone: "amber" },
  ];

  return (
    <section aria-label="Portfolio summary" className="mt-9 grid overflow-hidden rounded-[8px] border border-[#dce4df] bg-white sm:grid-cols-2 min-[1180px]:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        const tone = metric.tone === "red"
          ? "bg-[#fdebec] text-[#c82e3c]"
          : metric.tone === "amber"
            ? "bg-[#fff5e7] text-[#c87500]"
            : "bg-[#e9f4ec] text-[#087332]";
        const valueTone = metric.tone === "red" ? "text-[#c82e3c]" : metric.tone === "amber" ? "text-[#bd7000]" : "text-[#087332]";

        return (
          <article key={metric.label} className={`flex min-h-[111px] items-center gap-4 px-5 py-4 ${index > 0 ? "border-t border-[#e1e6e2] sm:border-l" : ""} ${index === 2 ? "sm:border-l-0 min-[1180px]:border-l" : ""} ${index > 1 ? "min-[1180px]:border-t-0" : "sm:border-t-0"}`}>
            <span className={`grid h-[50px] w-[50px] shrink-0 place-items-center rounded-full ${tone}`}>
              <Icon size={23} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[#252a32]">{metric.label}</p>
              <p className={`mt-0.5 text-[26px] font-semibold leading-none ${valueTone}`}>{metric.value}</p>
              <p className="mt-2 truncate text-[11px] text-[#7d838d]">{metric.note}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}

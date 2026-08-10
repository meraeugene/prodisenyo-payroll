import { TbBuilding, TbChecklist, TbFileDescription, TbPackage, TbPhoto, TbProgress } from "react-icons/tb";

export default function EngineerMetricsStrip({ metrics }: { metrics: { overallProgress: number; activeProjects: number; tasksDueToday: number; overdueTasks: number; reportsDue: number; overdueReports: number; materialRequests: number; siteUpdates: number } }) {
  const entries = [
    { label: "Overall completion", value: `${metrics.overallProgress}%`, note: "All active projects", icon: TbProgress, tone: "green" },
    { label: "Projects active", value: metrics.activeProjects, note: "View all projects", icon: TbBuilding, tone: "green" },
    { label: "Tasks due today", value: metrics.tasksDueToday, note: `${metrics.overdueTasks} overdue`, icon: TbChecklist, tone: metrics.overdueTasks ? "amber" : "green" },
    { label: "Reports due", value: metrics.reportsDue, note: `${metrics.overdueReports} overdue`, icon: TbFileDescription, tone: metrics.overdueReports ? "amber" : "green" },
    { label: "Material requests", value: metrics.materialRequests, note: "Waiting approval", icon: TbPackage, tone: metrics.materialRequests ? "amber" : "green" },
    { label: "Site updates", value: metrics.siteUpdates, note: "Today", icon: TbPhoto, tone: "green" },
  ] as const;

  return (
    <section aria-label="Engineer dashboard summary" className="mt-7 grid overflow-hidden rounded-[6px] border border-[#d8e3dc] bg-white sm:grid-cols-2 lg:grid-cols-6">
      {entries.map((entry, index) => {
        const Icon = entry.icon;
        const attention = entry.tone === "amber";
        return <article key={entry.label} className={`relative min-h-[124px] px-3 py-4 text-center ${index ? "border-t border-[#e0e7e2] sm:border-l lg:border-t-0" : ""}`}>
          <Icon className="mx-auto text-[#88918b] lg:hidden" size={18} />
          <p className="text-[11px] font-medium text-[#343b43]">{entry.label}</p>
          <p className={`mt-3 text-[25px] font-semibold leading-none ${attention ? "text-[#d27a00]" : "text-[#087332]"}`}>{entry.value}</p>
          {index === 0 ? <div className="mx-auto mt-3 h-2 w-[130px] max-w-full overflow-hidden rounded-full bg-[#dfe9e2]"><div className="h-full rounded-full bg-[#087332]" style={{ width: `${metrics.overallProgress}%` }} /></div> : null}
          <p className={`mt-3 text-[10px] ${attention ? "text-[#d12f3e]" : "text-[#747c85]"}`}>{entry.note}</p>
        </article>;
      })}
    </section>
  );
}

import Link from "next/link";
import { TbCamera, TbCheck, TbPackage, TbProgressAlert } from "react-icons/tb";
import type { EngineerActivity } from "@/features/engineer/types";
import { formatEngineerTime } from "@/features/engineer/utils/engineerDashboard";

function ActivityIcon({ type }: { type: string }) {
  if (type.includes("material") || type.includes("delivery")) return <TbPackage size={17} />;
  if (type.includes("progress")) return <TbCamera size={17} />;
  if (type.includes("blocked") || type.includes("delay")) return <TbProgressAlert size={17} />;
  return <TbCheck size={17} />;
}

export default function EngineerActivityFeed({ activities }: { activities: EngineerActivity[] }) {
  return (
    <section className="mt-3 overflow-hidden rounded-[6px] border border-[#d8e3dc] bg-white">
      <div className="flex items-center justify-between px-4 py-3"><div className="flex items-baseline gap-2"><h2 className="text-[15px] font-semibold">Recent site activity</h2><span className="text-[9px] font-semibold text-[#087332]">Today</span></div><Link href="/engineer/projects" className="text-[9px] font-semibold text-[#087332]">View all activity</Link></div>
      <div className="grid gap-x-7 gap-y-2 px-5 pb-5 md:grid-cols-2 lg:grid-cols-3">
        {activities.slice(0, 6).map((activity) => <article key={activity.id} className="relative flex min-h-[58px] gap-3 border-l border-[#cfe0d4] pl-5">
          <span className="absolute -left-[17px] top-1 grid h-8 w-8 place-items-center rounded-full bg-[#eaf4ed] text-[#087332]"><ActivityIcon type={activity.event_type} /></span>
          <span className="w-[45px] shrink-0 pt-1 text-[8px] text-[#6e7780]">{formatEngineerTime(activity.created_at)}</span>
          <div className="min-w-0 pt-0.5"><p className="truncate text-[9px] font-semibold text-[#087332]">{activity.project?.name ?? "Project activity"}</p><p className="mt-1 line-clamp-1 text-[9px] text-[#48515a]">{activity.title}</p><p className="mt-1 truncate text-[8px] text-[#7b848d]">By {activity.actor?.full_name ?? activity.actor?.username ?? "Project team"}</p></div>
        </article>)}
        {!activities.length ? <p className="col-span-full py-8 text-center text-xs text-[#7a838c]">Site updates will appear here as work is reported.</p> : null}
      </div>
    </section>
  );
}

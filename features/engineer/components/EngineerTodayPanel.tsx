import Link from "next/link";
import { TbChevronRight, TbCircle, TbFileDescription } from "react-icons/tb";
import type { EngineerReport, EngineerTask } from "@/features/engineer/types";
import { formatEngineerDate, isPastDate, manilaDateKey } from "@/features/engineer/utils/engineerDashboard";

export default function EngineerTodayPanel({ tasks, reports }: { tasks: EngineerTask[]; reports: EngineerReport[] }) {
  const today = manilaDateKey();
  const dueReports = reports.filter((report) => report.status !== "accepted" && report.due_date && report.due_date <= today).slice(0, 3);
  const dueTasks = tasks.filter((task) => task.status !== "completed" && task.due_date && task.due_date <= today).slice(0, 4);
  return (
    <aside className="min-w-0 overflow-hidden rounded-[6px] border border-[#d8e3dc] bg-white">
      <div className="flex items-center justify-between border-b border-[#dfe6e1] px-4 py-3"><div className="flex items-baseline gap-2"><h2 className="text-[16px] font-semibold">Today</h2><span className="text-[10px] text-[#747d86]">{formatEngineerDate(today, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span></div></div>
      <div className="px-4 py-3">
        <div className="flex items-center gap-2"><h3 className="text-[14px] font-semibold">Reports due</h3>{dueReports.some((report) => isPastDate(report.due_date)) ? <span className="rounded-full bg-[#fdebed] px-2 py-0.5 text-[8px] font-semibold text-[#d12838]">Overdue</span> : null}</div>
        <div className="mt-2 divide-y divide-[#edf0ee]">{dueReports.map((report) => <Link href="/engineer/reports" key={report.id} className="flex items-center gap-3 py-2.5"><TbFileDescription className={isPastDate(report.due_date) ? "text-[#e02b3a]" : "text-[#dd8500]"} size={20} /><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-medium">{report.title}</span><span className={`mt-0.5 block text-[9px] ${isPastDate(report.due_date) ? "text-[#d12c3b]" : "text-[#d27a00]"}`}>{isPastDate(report.due_date) ? "Overdue" : "Due today"} · {formatEngineerDate(report.due_date)}</span></span><TbChevronRight className="text-[#858e97]" /></Link>)}</div>
        {!dueReports.length ? <p className="py-4 text-[10px] text-[#818991]">No reports due today.</p> : null}
      </div>
      <div className="border-t border-[#dfe6e1] px-4 py-3">
        <div className="flex items-center gap-2"><h3 className="text-[14px] font-semibold">CEO-assigned tasks</h3>{dueTasks.filter((task) => isPastDate(task.due_date)).length ? <span className="rounded-full bg-[#fdebed] px-2 py-0.5 text-[8px] font-semibold text-[#d12838]">{dueTasks.filter((task) => isPastDate(task.due_date)).length} overdue</span> : null}</div>
        <div className="mt-2 divide-y divide-[#edf0ee]">{dueTasks.map((task) => <Link href="/engineer/tasks" key={task.id} className="flex items-center gap-3 py-2.5"><TbCircle className={isPastDate(task.due_date) ? "text-[#e02b3a]" : "text-[#dd8500]"} size={20} /><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-medium">{task.title} — {task.project?.name}</span><span className={`mt-0.5 block text-[9px] ${isPastDate(task.due_date) ? "text-[#d12c3b]" : "text-[#d27a00]"}`}>{isPastDate(task.due_date) ? "Overdue" : "Due today"} · {formatEngineerDate(task.due_date)}</span></span><TbChevronRight className="text-[#858e97]" /></Link>)}</div>
        {!dueTasks.length ? <p className="py-4 text-[10px] text-[#818991]">No assigned tasks due today.</p> : null}
      </div>
      <Link href="/engineer/tasks" className="flex h-10 items-center justify-center gap-1 border-t border-[#e2e8e4] text-[10px] font-semibold text-[#087332]">View all my tasks<TbChevronRight /></Link>
    </aside>
  );
}

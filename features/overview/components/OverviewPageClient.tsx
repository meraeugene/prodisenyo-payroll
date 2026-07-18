"use client";

import React from "react";
import DashboardPageHero from "@/components/DashboardPageHero";
import { MOCK_PROJECTS } from "@/features/projects/utils/mockProjects";
import { MOCK_TASKS } from "@/features/my-tasks/utils/mockTasks";
import { 
  Building, 
  ClipboardCheck, 
  Plus, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  ArrowRight,
  ClipboardList,
  FileText
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function OverviewPageClient() {
  const [projectsList, setProjectsList] = React.useState<any[]>([]);

  React.useEffect(() => {
    const saved = localStorage.getItem("prodisenyo-projects-v2");
    if (saved) {
      try {
        setProjectsList(JSON.parse(saved));
      } catch (e) {
        setProjectsList(MOCK_PROJECTS);
      }
    } else {
      setProjectsList(MOCK_PROJECTS);
    }
  }, []);

  const myProjects = React.useMemo(() => {
    return projectsList.filter((p) => p.engineer === "Engineer User");
  }, [projectsList]);

  const myTasks = MOCK_TASKS;

  const stats = React.useMemo(() => {
    const totalProjects = myProjects.length;
    const activeTasks = myTasks.filter((t) => t.status === "in_progress").length;
    const completedTasks = myTasks.filter((t) => t.status === "completed").length;
    const delayedTasks = myTasks.filter((t) => t.status === "delayed").length;
    return { totalProjects, activeTasks, completedTasks, delayedTasks };
  }, [myProjects, myTasks]);

  const recentActivities = [
    {
      id: 1,
      title: "Material Request Submitted",
      description: "Requested 150 bags of Portland Cement for Grand Horizon Towers",
      time: "2 hours ago",
      type: "material",
    },
    {
      id: 2,
      title: "Overtime Approved by CEO",
      description: "Overtime request for 3 site laborers approved for structural pouring",
      time: "4 hours ago",
      type: "approval",
    },
    {
      id: 3,
      title: "Task Status Updated",
      description: "Plumbing Deck Sleeves Installation marked as Completed",
      time: "Yesterday",
      type: "task",
    },
    {
      id: 4,
      title: "Progress Report Reviewed",
      description: "CEO reviewed daily report for Vista Verde Residences Sector 3",
      time: "2 days ago",
      type: "report",
    },
  ];

  return (
    <div className="space-y-4 p-0 sm:p-6">
      <DashboardPageHero
        eyebrow="Site Metrics"
        title="Engineer Overview"
        description="Access real-time indicators for your assigned projects, pending milestones, and site compliance."
        actions={
          <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
            <Link
              href="/request-material"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              <ClipboardList size={13} />
              Request Materials
            </Link>
            <Link
              href="/progress-reports"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1f6a37] px-3.5 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-sm"
            >
              <Plus size={13} />
              Submit Report
            </Link>
          </div>
        }
      />

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Assigned Projects", val: stats.totalProjects, color: "text-slate-800 bg-slate-50", icon: Building },
          { label: "Tasks In Progress", val: stats.activeTasks, color: "text-sky-700 bg-sky-50/50 border-sky-100", icon: TrendingUp },
          { label: "Tasks Completed", val: stats.completedTasks, color: "text-emerald-700 bg-emerald-50/50 border-emerald-100", icon: ClipboardCheck },
          { label: "Tasks Delayed", val: stats.delayedTasks, color: "text-rose-700 bg-rose-50/50 border-rose-100", icon: AlertTriangle },
        ].map((item, i) => (
          <div key={i} className={cn("p-4 rounded-2xl border flex items-center justify-between shadow-sm", item.color)}>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{item.label}</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight">{item.val}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-white border border-inherit flex items-center justify-center shadow-2xs">
              <item.icon size={18} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Projects Progress List */}
        <div className="lg:col-span-2 bg-white border border-apple-mist p-5 rounded-2xl shadow-[0_4px_20px_rgba(24,83,43,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="text-base font-bold text-apple-charcoal">Assigned Project Status</h3>
              <Link href="/projects" className="text-xs font-semibold text-[#1f6a37] hover:text-emerald-800 flex items-center gap-1 transition">
                View All <ArrowRight size={13} />
              </Link>
            </div>

            <div className="mt-4 space-y-4">
              {myProjects.map((project) => (
                <div key={project.id} className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-apple-charcoal">{project.name}</span>
                    <span className="text-slate-400 font-medium">{project.progress}% completed</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${project.progress}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400">
                    <span>Timeline: {project.startDate} to {project.endDate}</span>
                    <span className="font-semibold text-slate-500">{project.completedTasksCount} / {project.tasksCount} tasks finished</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Site Activity */}
        <div className="bg-white border border-apple-mist p-5 rounded-2xl shadow-[0_4px_20px_rgba(24,83,43,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="text-base font-bold text-apple-charcoal">Recent Site Activity</h3>
              <Clock size={15} className="text-apple-smoke" />
            </div>

            <div className="mt-4 space-y-4">
              {recentActivities.map((act) => (
                <div key={act.id} className="flex gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-white shadow-2xs mt-0.5",
                    act.type === "material" ? "bg-amber-600" :
                    act.type === "approval" ? "bg-emerald-600" :
                    act.type === "task" ? "bg-sky-600" : "bg-purple-600"
                  )}>
                    {act.type === "material" ? <ClipboardList size={14} /> :
                     act.type === "approval" ? <ClipboardCheck size={14} /> :
                     act.type === "task" ? <ClipboardCheck size={14} /> : <FileText size={14} />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-apple-charcoal">{act.title}</p>
                    <p className="text-[11px] text-slate-500 leading-normal mt-0.5">{act.description}</p>
                    <span className="text-[10px] text-slate-400 font-medium block mt-1">{act.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

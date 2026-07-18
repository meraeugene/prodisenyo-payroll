"use client";

import React, { useState } from "react";
import { useMyTasks } from "../hooks/useMyTasks";
import type { TaskRecord, TaskStatus, TaskPriority } from "../types";
import DashboardPageHero from "@/components/DashboardPageHero";
import { 
  ClipboardCheck, 
  Search, 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  PenSquare,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

function priorityBadgeClass(priority: TaskPriority) {
  if (priority === "high") return "border-rose-200 bg-rose-50 text-rose-700 text-xs";
  if (priority === "medium") return "border-amber-200 bg-amber-50 text-amber-700 text-xs";
  return "border-emerald-200 bg-emerald-50 text-emerald-700 text-xs";
}

function statusBadgeClass(status: TaskStatus) {
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "in_progress") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "delayed") return "border-rose-200 bg-rose-50 text-rose-700 animate-pulse";
  return "border-gray-200 bg-gray-50 text-gray-700";
}

function formatStatus(status: TaskStatus) {
  if (status === "todo") return "To Do";
  if (status === "in_progress") return "In Progress";
  if (status === "completed") return "Completed";
  if (status === "delayed") return "Delayed";
  return status;
}

export default function MyTasksPageClient() {
  const {
    filteredTasks,
    searchTerm,
    setSearchTerm,
    selectedStatus,
    setSelectedStatus,
    updateTaskStatus,
    tasks,
  } = useMyTasks();

  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
  const [modalStatus, setModalStatus] = useState<TaskStatus>("todo");
  const [modalProgress, setModalProgress] = useState(0);
  const [modalNotes, setModalNotes] = useState("");

  const stats = React.useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const delayed = tasks.filter((t) => t.status === "delayed").length;
    return { total, completed, inProgress, delayed };
  }, [tasks]);

  const openEditModal = (task: TaskRecord) => {
    setEditingTask(task);
    setModalStatus(task.status);
    setModalProgress(task.progress);
    setModalNotes(task.notes || "");
  };

  const handleSave = () => {
    if (editingTask) {
      updateTaskStatus(editingTask.id, modalStatus, modalProgress, modalNotes);
      setEditingTask(null);
    }
  };

  return (
    <div className="space-y-4 p-0 sm:p-6">
      <DashboardPageHero
        eyebrow="Construction Workflows"
        title="My Assigned Tasks"
        description="Monitor structural benchmarks, quality checks, and utility layouts on site."
        actions={
          <span className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-[#1f6a37]/20 bg-[#1f6a37]/5 px-4 text-sm font-semibold text-[#1f6a37] sm:mt-0">
            <ClipboardCheck size={14} />
            {stats.inProgress} active task{stats.inProgress !== 1 && "s"}
          </span>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Tasks", val: stats.total, color: "text-slate-700 bg-slate-50 border-slate-100", icon: ClipboardCheck },
          { label: "Completed", val: stats.completed, color: "text-emerald-700 bg-emerald-50/50 border-emerald-100", icon: CheckCircle2 },
          { label: "In Progress", val: stats.inProgress, color: "text-sky-700 bg-sky-50/50 border-sky-100", icon: TrendingUp },
          { label: "Delayed / Alert", val: stats.delayed, color: "text-rose-700 bg-rose-50/50 border-rose-100", icon: AlertCircle },
        ].map((item, i) => (
          <div key={i} className={cn("p-4 rounded-2xl border flex items-center justify-between shadow-sm", item.color)}>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{item.label}</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight">{item.val}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-white/80 border border-inherit flex items-center justify-center shadow-xs">
              <item.icon size={18} />
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-apple-mist p-3 rounded-2xl shadow-[0_4px_16px_rgba(24,83,43,0.03)]">
        <div className="flex flex-wrap gap-1">
          {([
            { id: "all", label: "All Tasks" },
            { id: "todo", label: "To Do" },
            { id: "in_progress", label: "In Progress" },
            { id: "completed", label: "Completed" },
            { id: "delayed", label: "Delayed" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all",
                selectedStatus === tab.id
                  ? "bg-[#1f6a37] text-white shadow-sm"
                  : "text-apple-smoke hover:bg-apple-mist/50 hover:text-apple-charcoal"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-silver" />
          <input
            type="text"
            placeholder="Search tasks, projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-apple-mist bg-apple-mist/20 text-xs text-apple-charcoal outline-none placeholder:text-apple-silver transition focus:border-[#1f6a37] focus:bg-white"
          />
        </div>
      </div>

      {/* Tasks List */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-apple-mist bg-white p-5 shadow-[0_8px_20px_rgba(24,83,43,0.04)] transition-all duration-300 hover:border-emerald-200 hover:shadow-[0_12px_26px_rgba(24,83,43,0.08)]"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                    {task.projectName}
                  </span>
                  <span className={cn("border px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider", priorityBadgeClass(task.priority))}>
                    {task.priority} priority
                  </span>
                </div>

                <h3 className="mt-3 text-base font-semibold text-apple-charcoal group-hover:text-emerald-950 transition-colors">
                  {task.title}
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {task.description}
                </p>

                {/* Progress bar */}
                <div className="mt-4 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Task Progress</span>
                    <span className="font-semibold text-apple-charcoal">{task.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        task.status === "completed"
                          ? "bg-emerald-600"
                          : task.status === "delayed"
                          ? "bg-rose-500"
                          : "bg-sky-500"
                      )}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>

                {task.notes && (
                  <div className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex gap-2">
                    <FileText size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Site Inspection Notes</p>
                      <p className="text-xs text-slate-600 mt-0.5 italic">{task.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Calendar size={13} />
                  <span className="text-[11px] font-medium">Due: {task.dueDate}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={cn("border px-2.5 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider", statusBadgeClass(task.status))}>
                    {formatStatus(task.status)}
                  </span>
                  <button
                    onClick={() => openEditModal(task)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-apple-mist text-apple-smoke hover:bg-apple-mist/50 hover:text-apple-charcoal transition"
                    title="Update status"
                  >
                    <PenSquare size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 text-center py-12 bg-white border border-dashed border-slate-200 rounded-2xl">
            <ClipboardCheck size={32} className="mx-auto text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-500">No tasks found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search query.</p>
          </div>
        )}
      </div>

      {/* Edit Status Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-apple-mist rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-apple-charcoal">Update Task Status</h3>
            <p className="text-xs text-slate-500 mt-1">{editingTask.title} ({editingTask.projectName})</p>

            <div className="mt-5 space-y-4">
              {/* Status Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: "todo", label: "To Do" },
                    { id: "in_progress", label: "In Progress" },
                    { id: "completed", label: "Completed" },
                    { id: "delayed", label: "Delayed" },
                  ] as const).map((stat) => (
                    <button
                      key={stat.id}
                      type="button"
                      onClick={() => {
                        setModalStatus(stat.id);
                        if (stat.id === "completed") {
                          setModalProgress(100);
                        } else if (stat.id === "todo") {
                          setModalProgress(0);
                        }
                      }}
                      className={cn(
                        "h-10 px-3 border rounded-xl text-xs font-medium transition-all text-left flex items-center justify-between",
                        modalStatus === stat.id
                          ? "border-[#1f6a37] bg-emerald-50/30 text-emerald-800 ring-1 ring-emerald-600/20"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <span>{stat.label}</span>
                      {modalStatus === stat.id && <div className="h-2 w-2 rounded-full bg-emerald-600" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Completion Progress</span>
                  <span className="font-bold text-[#1f6a37]">{modalProgress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={modalProgress}
                  disabled={modalStatus === "completed" || modalStatus === "todo"}
                  onChange={(e) => setModalProgress(Number(e.target.value))}
                  className="w-full accent-[#1f6a37] h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                />
              </div>

              {/* Site Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Site Notes / Obstacles</label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Include spacing checks, cement mixer delay explanations, or structural verification notes..."
                  rows={3}
                  className="w-full rounded-xl border border-apple-mist p-3 text-xs text-apple-charcoal outline-none placeholder:text-apple-silver transition focus:border-[#1f6a37] focus:bg-white resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="h-10 px-5 rounded-xl bg-[#1f6a37] text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ProjectRecord } from "../types";
import { X, Calendar, DollarSign, User, MapPin, ClipboardList, Activity, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectDetailsModalProps {
  project: ProjectRecord;
  onClose: () => void;
}

export default function ProjectDetailsModal({ project, onClose }: ProjectDetailsModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusLabel = (status: ProjectRecord["status"]) => {
    if (status === "active") return "Active / Building";
    if (status === "planning") return "Under Planning";
    if (status === "on_hold") return "On Hold";
    return "Completed";
  };

  const getStatusColor = (status: ProjectRecord["status"]) => {
    if (status === "active") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (status === "planning") return "bg-sky-50 text-sky-700 border-sky-100";
    if (status === "on_hold") return "bg-rose-50 text-rose-700 border-rose-100";
    return "bg-slate-50 text-slate-700 border-slate-100";
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex h-screen min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white border border-apple-mist rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className={cn("border px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider", getStatusColor(project.status))}>
              {getStatusLabel(project.status)}
            </span>
            <h3 className="text-xl font-bold text-apple-charcoal mt-2">{project.name}</h3>
            <div className="flex items-center gap-1 text-slate-400 text-xs mt-1">
              <MapPin size={13} />
              <span>{project.location}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-apple-mist text-apple-smoke hover:bg-apple-mist/50 hover:text-apple-charcoal transition"
          >
            <X size={15} />
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {/* Project Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Client</span>
              <div className="flex items-center gap-1.5 text-sm text-apple-charcoal font-semibold">
                <Building2 size={13} className="text-slate-400" />
                <span>{project.client}</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Project Timeline</span>
              <div className="flex items-center gap-1.5 text-sm text-apple-charcoal font-semibold">
                <Calendar size={13} className="text-slate-400" />
                <span>{project.startDate} to {project.endDate}</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Project Manager</span>
              <div className="flex items-center gap-1.5 text-sm text-apple-charcoal font-semibold">
                <User size={13} className="text-slate-400" />
                <span>{project.manager}</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Site Engineer</span>
              <div className="flex items-center gap-1.5 text-sm text-apple-charcoal font-semibold">
                <User size={13} className="text-slate-400" />
                <span>{project.engineer}</span>
              </div>
            </div>
          </div>

          {/* Financial details & progress */}
          <div className="grid sm:grid-cols-3 gap-4 bg-emerald-50/20 border border-emerald-100 p-4 rounded-2xl">
            <div className="space-y-0.5">
              <span className="text-[10px] text-emerald-800/80 font-bold uppercase tracking-wider flex items-center gap-0.5">
                <DollarSign size={11} /> Total Budget
              </span>
              <p className="text-lg font-bold text-apple-charcoal">{formatCurrency(project.budget)}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-emerald-800/80 font-bold uppercase tracking-wider flex items-center gap-0.5">
                <DollarSign size={11} /> Actual Spent
              </span>
              <p className="text-lg font-bold text-apple-charcoal">{formatCurrency(project.spent)}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-emerald-800/80 font-bold uppercase tracking-wider flex items-center gap-0.5">
                <Activity size={11} /> Project Progress
              </span>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-apple-charcoal">{project.progress}%</p>
                <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${project.progress}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Site Metrics Sub-Panel */}
          <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
            <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-sky-600 shadow-2xs">
                <ClipboardList size={16} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Benchmarks / Tasks</p>
                <p className="text-sm font-bold text-apple-charcoal mt-0.5">
                  {project.completedTasksCount} / {project.tasksCount} completed
                </p>
              </div>
            </div>

            <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-amber-600 shadow-2xs">
                <ClipboardList size={16} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Material Deliveries</p>
                <p className="text-sm font-bold text-apple-charcoal mt-0.5">
                  {project.materialsCount} POs processed
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

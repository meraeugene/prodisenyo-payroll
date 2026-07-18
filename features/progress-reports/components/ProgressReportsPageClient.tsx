"use client";

import React, { useState, useTransition } from "react";
import type { ProgressReportRecord, WeatherCondition } from "../types";
import { MOCK_REPORTS } from "../utils/mockReports";
import { MOCK_PROJECTS } from "@/features/projects/utils/mockProjects";
import DashboardPageHero from "@/components/DashboardPageHero";
import { 
  FileText, 
  Plus, 
  Calendar, 
  CloudSun, 
  MapPin, 
  AlertCircle, 
  Activity, 
  Check, 
  LoaderCircle,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ProgressReportsPageClient() {
  const [reports, setReports] = useState<ProgressReportRecord[]>(MOCK_REPORTS);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form State
  const [projectName, setProjectName] = useState("");
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>("sunny");
  const [completionPercentage, setCompletionPercentage] = useState(10);
  const [content, setContent] = useState("");
  const [challenges, setChallenges] = useState("");

  const activeProjects = MOCK_PROJECTS.filter((p) => p.status === "active");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName) {
      toast.error("Please select a project.");
      return;
    }
    if (!content.trim()) {
      toast.error("Please describe work progress.");
      return;
    }

    startTransition(async () => {
      // Simulate network request
      await new Promise((resolve) => setTimeout(resolve, 800));

      const newReport: ProgressReportRecord = {
        id: `rep-${Date.now()}`,
        projectName,
        reporterName: "Engineer User",
        date: new Date().toISOString().split("T")[0],
        content,
        challenges: challenges.trim() || "No significant issues reported.",
        completionPercentage,
        status: "submitted",
        weatherCondition,
        photos: ["https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=400&q=80"],
      };

      setReports((prev) => [newReport, ...prev]);
      setShowForm(false);
      toast.success("Progress report submitted successfully!");
      
      // Reset Form
      setProjectName("");
      setWeatherCondition("sunny");
      setCompletionPercentage(10);
      setContent("");
      setChallenges("");
    });
  };

  const getWeatherBadge = (weather: WeatherCondition) => {
    if (weather === "sunny") return "bg-amber-50 text-amber-700 border-amber-100";
    if (weather === "cloudy") return "bg-sky-50 text-sky-700 border-sky-100";
    if (weather === "rainy") return "bg-indigo-50 text-indigo-700 border-indigo-100";
    return "bg-rose-50 text-rose-700 border-rose-100";
  };

  return (
    <div className="space-y-4 p-0 sm:p-6">
      <DashboardPageHero
        eyebrow="Engineer Reports"
        title="Site Progress Reports"
        description="Submit regular updates, inspect material placements, and document site issues for administration review."
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="mt-3 sm:mt-0 flex h-10 items-center gap-2 rounded-xl bg-[#1f6a37] px-4 text-sm font-semibold text-white hover:bg-emerald-800 transition shadow-sm"
          >
            {showForm ? <Eye size={15} /> : <Plus size={15} />}
            {showForm ? "View Report History" : "New Progress Report"}
          </button>
        }
      />

      {showForm ? (
        <div className="bg-white border border-apple-mist p-5 rounded-2xl shadow-[0_10px_30px_rgba(24,83,43,0.06)] animate-in fade-in duration-300">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-lg font-bold text-apple-charcoal">Submit Progress Report</h3>
            <p className="text-xs text-slate-400">Describe site completion percentages and construction notes.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Project <span className="text-rose-500">*</span></label>
                <select
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="h-10 rounded-xl w-full border border-apple-mist bg-white px-3 text-xs text-apple-charcoal outline-none transition focus:border-[#1f6a37]"
                >
                  <option value="">Select Project</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Weather Condition</label>
                <div className="grid grid-cols-4 gap-1">
                  {(["sunny", "cloudy", "rainy", "stormy"] as WeatherCondition[]).map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setWeatherCondition(cond)}
                      className={cn(
                        "h-10 text-[10px] font-bold rounded-lg border uppercase tracking-wider capitalize transition-all",
                        weatherCondition === cond
                          ? "border-[#1f6a37] bg-emerald-50/50 text-emerald-800"
                          : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
                      )}
                    >
                      {cond}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Physical Progress Target</span>
                <span className="font-bold text-[#1f6a37]">{completionPercentage}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={completionPercentage}
                onChange={(e) => setCompletionPercentage(Number(e.target.value))}
                className="w-full accent-[#1f6a37] h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Work Accomplished <span className="text-rose-500">*</span></label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="List completed layouts, concrete compression details, or structural steel grids installed..."
                rows={4}
                className="w-full rounded-xl border border-apple-mist p-3 text-xs text-apple-charcoal outline-none placeholder:text-apple-silver transition focus:border-[#1f6a37]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Challenges / Issues Faced</label>
              <textarea
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
                placeholder="Mention weather delays, supply shortage, material revisions, etc..."
                rows={2}
                className="w-full rounded-xl border border-apple-mist p-3 text-xs text-apple-charcoal outline-none placeholder:text-apple-silver transition focus:border-[#1f6a37]"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="h-10 px-5 rounded-xl bg-[#1f6a37] text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-sm flex items-center gap-1.5 disabled:opacity-70"
              >
                {isPending && <LoaderCircle size={14} className="animate-spin" />}
                Submit Report
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white border border-apple-mist p-5 rounded-2xl shadow-[0_4px_20px_rgba(24,83,43,0.03)] hover:border-slate-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-50 pb-3">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-apple-charcoal text-base">{report.projectName}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-medium text-slate-500">Reported by {report.reporterName}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>{report.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={cn("border px-2.5 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider", getWeatherBadge(report.weatherCondition))}>
                    Weather: {report.weatherCondition}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg uppercase">
                    {report.status}
                  </span>
                </div>
              </div>

              {/* Progress & Content */}
              <div className="mt-4 grid md:grid-cols-[1fr_200px] gap-6">
                <div className="space-y-3">
                  <div>
                    <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Activity Log</h5>
                    <p className="text-xs text-slate-700 leading-relaxed mt-1">{report.content}</p>
                  </div>

                  <div>
                    <h5 className="text-[11px] font-semibold uppercase tracking-wider text-rose-500 flex items-center gap-1">
                      <AlertCircle size={12} /> Bottlenecks & Safety Issues
                    </h5>
                    <p className="text-xs text-rose-700/80 mt-1 leading-relaxed">{report.challenges}</p>
                  </div>
                </div>

                {/* Progress bar + photo */}
                <div className="space-y-3 border-l border-slate-100 pl-6 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Activity size={12} /> Project Completion
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-[#1f6a37]">{report.completionPercentage}%</span>
                      <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${report.completionPercentage}%` }} />
                      </div>
                    </div>
                  </div>

                  {report.photos && report.photos.length > 0 && (
                    <div className="relative rounded-xl overflow-hidden h-24 border border-slate-200 shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={report.photos[0]}
                        alt="Progress Photo"
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

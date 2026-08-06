"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardCheck,
  FileUp,
  ListChecks,
  PackagePlus,
  Search,
  TrendingUp,
} from "lucide-react";
import type { ProjectDocumentRecord } from "@/features/project-documents/types";
import type { ProjectProgressUpdateRecord } from "@/features/projects/progressUpdateTypes";
import type { ProjectActivityEvent, ProjectActivityType } from "../types";
import { buildProjectActivityLog, countProjectActivityTypes } from "../utils/activityLog";

type ProgressSubmission = { id: string; activity_count: number; submitted_at: string };
type MaterialRequest = { id: string; material_name: string; status: string; created_at: string };

const TYPE_META: Record<ProjectActivityType, { label: string; icon: typeof TrendingUp; badge: string }> = {
  "progress-update": { label: "Progress Update", icon: TrendingUp, badge: "bg-emerald-50 text-emerald-700" },
  "activity-submission": { label: "Activity Submission", icon: ListChecks, badge: "bg-amber-50 text-amber-700" },
  "material-request": { label: "Material Request", icon: PackagePlus, badge: "bg-sky-50 text-sky-700" },
  "document-upload": { label: "Document Upload", icon: FileUp, badge: "bg-blue-50 text-blue-700" },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }).format(new Date(value));
}

function isToday(value: string) {
  const event = new Date(value);
  const now = new Date();
  return event.getFullYear() === now.getFullYear() && event.getMonth() === now.getMonth() && event.getDate() === now.getDate();
}

export default function ProjectActivityLogPanel({
  engineerName, progressUpdates, progressSubmissions, materialRequests, documents,
}: {
  engineerName: string;
  progressUpdates: ProjectProgressUpdateRecord[];
  progressSubmissions: ProgressSubmission[];
  materialRequests: MaterialRequest[];
  documents: ProjectDocumentRecord[];
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | ProjectActivityType>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const events = useMemo(() => buildProjectActivityLog({ engineerName, progressUpdates, progressSubmissions, materialRequests, documents }), [documents, engineerName, materialRequests, progressSubmissions, progressUpdates]);
  const typeCounts = useMemo(() => countProjectActivityTypes(events), [events]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const start = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;
    return events.filter((event) => {
      const timestamp = Date.parse(event.createdAt);
      const matchesSearch = !query || `${event.actor} ${event.title} ${event.description}`.toLowerCase().includes(query);
      return matchesSearch && (type === "all" || event.type === type) && (start === null || timestamp >= start) && (end === null || timestamp <= end);
    });
  }, [endDate, events, search, startDate, type]);
  const todayCount = events.filter((event) => isToday(event.createdAt)).length;
  const activeTypes = Object.values(typeCounts).filter((count) => count > 0).length;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_6px_22px_rgba(15,23,42,.04)] sm:p-5">
        <div><h2 className="text-xl font-semibold text-slate-950">Activity Log</h2><p className="mt-1 text-sm text-slate-500">Recent persisted actions and updates for this project.</p></div>
        <div className="mt-5 grid gap-3 border-b border-slate-200 pb-5 lg:grid-cols-[minmax(220px,1fr)_210px_170px_170px]">
          <label className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><span className="sr-only">Search activities</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search activities..." className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
          <select aria-label="Filter activity type" value={type} onChange={(event) => setType(event.target.value as typeof type)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600"><option value="all">All activity types</option>{Object.entries(TYPE_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</select>
          <label><span className="sr-only">Start date</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600" /></label>
          <label><span className="sr-only">End date</span><input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600" /></label>
        </div>

        <div className="relative mt-2 divide-y divide-slate-100 before:absolute before:bottom-5 before:left-[7px] before:top-5 before:w-px before:bg-slate-200">
          {filtered.map((event) => <ActivityRow key={event.id} event={event} />)}
          {filtered.length === 0 ? <div className="relative bg-white py-14 text-center"><ClipboardCheck size={32} className="mx-auto text-slate-300" /><p className="mt-3 font-medium text-slate-700">No activity found</p><p className="mt-1 text-sm text-slate-500">Try changing the search or filters.</p></div> : null}
        </div>
        <p className="border-t border-slate-100 pt-4 text-xs text-slate-500">Showing {filtered.length} of {events.length} activities</p>
      </section>

      <aside className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_22px_rgba(15,23,42,.04)]"><h3 className="font-semibold text-slate-950">Activity Summary</h3><div className="mt-4 grid grid-cols-2 divide-x divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100"><Summary icon={ListChecks} label="Total Activities" value={events.length} tone="emerald" /><Summary icon={CalendarDays} label="Today" value={todayCount} tone="blue" /><Summary icon={ClipboardCheck} label="Activity Types" value={activeTypes} tone="violet" /><Summary icon={TrendingUp} label="Progress Updates" value={typeCounts["progress-update"]} tone="amber" /></div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_22px_rgba(15,23,42,.04)]"><h3 className="font-semibold text-slate-950">Activity Types</h3><div className="mt-3 divide-y divide-slate-100">{Object.entries(TYPE_META).map(([key, meta]) => { const Icon = meta.icon; return <button type="button" key={key} onClick={() => setType(key as ProjectActivityType)} className="flex w-full items-center justify-between gap-3 py-3 text-sm text-slate-600 hover:text-emerald-800"><span className="inline-flex items-center gap-2"><Icon size={15} />{meta.label}</span><strong className="text-slate-900">{typeCounts[key as ProjectActivityType]}</strong></button>; })}</div><div className="mt-2 flex justify-between border-t border-slate-200 pt-4 text-sm font-semibold"><span>Total</span><span>{events.length}</span></div></section>
      </aside>
    </div>
  );
}

function ActivityRow({ event }: { event: ProjectActivityEvent }) {
  const meta = TYPE_META[event.type];
  const Icon = meta.icon;
  return <article className="relative grid gap-3 bg-white py-4 pl-7 sm:grid-cols-[110px_150px_180px_minmax(0,1fr)] sm:items-start"><span className="absolute left-0 top-6 h-3.5 w-3.5 rounded-full border-4 border-white bg-slate-400 ring-1 ring-slate-200" /><div><p className="text-xs font-medium text-slate-600">{formatDate(event.createdAt)}</p><p className="mt-1 text-xs text-slate-400">{formatTime(event.createdAt)}</p></div><p className="text-sm font-semibold text-slate-700">{event.actor}</p><span className={`inline-flex w-fit items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${meta.badge}`}><Icon size={14} />{meta.label}</span><div><p className="text-sm font-semibold text-slate-800">{event.title}</p><p className="mt-1 text-sm leading-5 text-slate-500">{event.description}</p></div></article>;
}

function Summary({ icon: Icon, label, value, tone }: { icon: typeof ListChecks; label: string; value: number; tone: "emerald" | "blue" | "violet" | "amber" }) {
  const colors = { emerald: "bg-emerald-50 text-emerald-700", blue: "bg-blue-50 text-blue-700", violet: "bg-violet-50 text-violet-700", amber: "bg-amber-50 text-amber-700" };
  return <div className="p-4"><div className={`flex h-9 w-9 items-center justify-center rounded-full ${colors[tone]}`}><Icon size={17} /></div><p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>;
}


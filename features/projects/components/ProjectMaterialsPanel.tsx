"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  PackageCheck,
  Plus,
  Search,
  ShoppingCart,
  XCircle,
} from "lucide-react";

export type ProjectMaterialRequest = {
  id: string;
  material_name: string;
  quantity: number;
  unit: string;
  needed_by: string;
  priority: "low" | "medium" | "high" | "urgent";
  notes: string | null;
  status: "submitted" | "approved" | "rejected" | "purchasing" | "ordered" | "received" | "cancelled";
  created_at: string;
};

const STATUS_LABELS: Record<ProjectMaterialRequest["status"], string> = {
  submitted: "Pending",
  approved: "Approved",
  rejected: "Returned",
  purchasing: "Purchasing",
  ordered: "Ordered",
  received: "Received",
  cancelled: "Cancelled",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function statusClass(status: ProjectMaterialRequest["status"]) {
  if (status === "approved" || status === "received") return "bg-emerald-50 text-emerald-700";
  if (status === "rejected" || status === "cancelled") return "bg-rose-50 text-rose-700";
  if (status === "purchasing" || status === "ordered") return "bg-sky-50 text-sky-700";
  return "bg-amber-50 text-amber-700";
}

export default function ProjectMaterialsPanel({ projectId, requests }: { projectId: string; requests: ProjectMaterialRequest[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | ProjectMaterialRequest["status"]>("all");
  const normalizedSearch = search.trim().toLowerCase();

  const filtered = useMemo(() => requests.filter((request) => {
    const matchesSearch = !normalizedSearch || request.material_name.toLowerCase().includes(normalizedSearch) || request.unit.toLowerCase().includes(normalizedSearch);
    return matchesSearch && (status === "all" || request.status === status);
  }), [normalizedSearch, requests, status]);

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((request) => request.status === "submitted").length,
    approved: requests.filter((request) => request.status === "approved").length,
    procurement: requests.filter((request) => ["purchasing", "ordered", "received"].includes(request.status)).length,
  }), [requests]);

  return (
    <div className="space-y-5">
      <section aria-label="Material request summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ClipboardList} label="Total Requests" value={stats.total} helper="This project" tone="emerald" />
        <StatCard icon={Clock3} label="Awaiting Approval" value={stats.pending} helper="CEO review" tone="amber" />
        <StatCard icon={CheckCircle2} label="Approved Requests" value={stats.approved} helper="Ready for procurement" tone="emerald" />
        <StatCard icon={ShoppingCart} label="Procurement Status" value={stats.procurement} helper="Purchasing to received" tone="sky" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_6px_22px_rgba(15,23,42,.04)]">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div><h2 className="font-semibold text-slate-950">Requested Materials</h2><p className="mt-1 text-xs text-slate-500">Only persisted requests for this project are shown.</p></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><span className="sr-only">Search materials</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search materials..." className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 sm:w-56" /></label>
              <select aria-label="Filter by request status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
                <option value="all">All statuses</option><option value="submitted">Pending</option><option value="approved">Approved</option><option value="rejected">Returned</option><option value="purchasing">Purchasing</option><option value="ordered">Ordered</option><option value="received">Received</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500"><tr><th className="px-5 py-3">Material</th><th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Needed By</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Status</th><th className="px-5 py-3">Requested</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((request) => <tr key={request.id} className="transition hover:bg-slate-50/70"><td className="px-5 py-4"><p className="font-semibold text-slate-900">{request.material_name}</p>{request.notes ? <p className="mt-1 max-w-xs truncate text-xs text-slate-500">{request.notes}</p> : null}</td><td className="px-4 py-4 font-medium text-slate-700">{Number(request.quantity).toLocaleString("en-PH")} {request.unit}</td><td className="px-4 py-4 text-slate-600">{formatDate(request.needed_by)}</td><td className="px-4 py-4"><span className="capitalize text-slate-700">{request.priority}</span></td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(request.status)}`}>{STATUS_LABELS[request.status]}</span></td><td className="px-5 py-4 text-slate-600">{formatDate(request.created_at)}</td></tr>)}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 ? <div className="border-t border-slate-100 px-5 py-12 text-center"><PackageCheck size={30} className="mx-auto text-slate-300" /><p className="mt-3 font-medium text-slate-700">No material requests found</p><p className="mt-1 text-sm text-slate-500">Try another search or status filter.</p></div> : null}
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Showing {filtered.length} of {requests.length} requests</div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_22px_rgba(15,23,42,.04)]"><h2 className="font-semibold text-slate-950">New Material Request</h2><p className="mt-2 text-sm leading-6 text-slate-500">Request materials needed for this assigned project.</p><Link href={`/request-material?projectId=${projectId}`} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"><Plus size={16} /> Create Material Request</Link></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_22px_rgba(15,23,42,.04)]"><h2 className="font-semibold text-slate-950">Recent Material Updates</h2><div className="mt-3 divide-y divide-slate-100">{requests.slice(0, 5).map((request) => <div key={request.id} className="flex gap-3 py-3"><div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${request.status === "rejected" ? "bg-rose-50 text-rose-600" : request.status === "submitted" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-700"}`}>{request.status === "rejected" ? <XCircle size={15} /> : request.status === "submitted" ? <Clock3 size={15} /> : <CheckCircle2 size={15} />}</div><div><p className="text-sm font-semibold text-slate-800">{request.material_name}</p><p className="mt-0.5 text-xs text-slate-500">{STATUS_LABELS[request.status]} · {formatDate(request.created_at)}</p></div></div>)}{requests.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No material updates yet.</p> : null}</div></section>
        </aside>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, helper, tone }: { icon: typeof ClipboardList; label: string; value: number; helper: string; tone: "emerald" | "amber" | "sky" }) {
  const colors = { emerald: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-600", sky: "bg-sky-50 text-sky-700" };
  return <article className="flex min-h-32 items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_22px_rgba(15,23,42,.04)]"><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colors[tone]}`}><Icon size={21} /></div><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{helper}</p></div></article>;
}

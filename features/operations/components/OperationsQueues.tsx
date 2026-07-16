import Link from "next/link";
import type { MaterialRequest } from "@/features/operations/types";
import { formatDueDistance, formatRequestAge, getApprovalTone, getPurchaseExceptionTone, isPurchaseException } from "@/features/operations/utils/operationsFormatters";

type QueueItem = { id: string; title: string; project: string; detail: string; footer: string; badge: string; tone: "danger" | "warning" | "neutral" };

export default function OperationsQueues({ requests }: { requests: MaterialRequest[] }) {
  const approvals = requests
    .filter((request) => request.status === "pending")
    .sort((a, b) => a.needed_by.localeCompare(b.needed_by))
    .slice(0, 5)
    .map((request) => { const tone = getApprovalTone(request); return { id: request.id, title: request.material_name, project: request.project?.name ?? request.site ?? "Project", detail: `${request.quantity.toLocaleString()} ${request.unit}`, footer: `${formatRequestAge(request.created_at)} · ${formatDueDistance(request.needed_by)}`, badge: tone.label, tone: tone.tone }; });
  const purchaseRequests = requests.filter(isPurchaseException).sort((a, b) => a.needed_by.localeCompare(b.needed_by));
  const exceptions = purchaseRequests.slice(0, 4).map((request) => { const tone = getPurchaseExceptionTone(request); return { id: request.id, title: request.material_name, project: request.project?.name ?? request.site ?? "Project", detail: request.purchaser?.full_name ?? request.purchaser?.username ?? "Awaiting purchaser", footer: formatDueDistance(request.needed_by), badge: tone.label, tone: tone.tone }; });

  return (
    <aside className="grid gap-4 min-[760px]:grid-cols-2 min-[1400px]:grid-cols-1 min-[1400px]:content-start" aria-label="Operations attention queues">
      <Queue title="Urgent Material Approvals" count={requests.filter((request) => request.status === "pending").length} href="/material-approvals" action="Go to Material Approvals" items={approvals} />
      <Queue title="Purchasing Exceptions" count={purchaseRequests.length} href="/purchasing" action="Go to Purchasing" items={exceptions} />
    </aside>
  );
}

function Queue({ title, count, href, action, items }: { title: string; count: number; href: string; action: string; items: QueueItem[] }) {
  return (
    <section className="rounded-[7px] border border-[#dce3de] bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-[#20252d]">{title} <span className="ml-1 inline-flex min-w-5 justify-center rounded-full bg-[#ce3642] px-1.5 py-0.5 text-[9px] text-white">{count}</span></h3>
        <Link href={href} className="shrink-0 text-[9px] font-semibold text-[#175f34] hover:underline">View all</Link>
      </div>
      <div className="mt-2 divide-y divide-[#e5e9e6]">
        {items.map((item) => <div key={item.id} className="py-[7px]"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[11px] font-semibold leading-[14px] text-[#222831]">{item.title}</p><p className="mt-1 truncate text-[10px] leading-[14px] text-[#59616d]">{item.project}</p><p className="mt-1 text-[10px] leading-[14px] text-[#737b87]">{item.detail}</p><p className="mt-1 text-[9px] leading-[13px] text-[#8a9098]">{item.footer}</p></div><span className={`shrink-0 rounded px-1.5 py-1 text-[9px] font-semibold ${item.tone === "danger" ? "bg-[#fde9ea] text-[#c72f3b]" : item.tone === "warning" ? "bg-[#fff2dc] text-[#b46c00]" : "bg-[#eef1ef] text-[#4f5862]"}`}>{item.badge}</span></div></div>)}
        {!items.length ? <div className="py-7 text-center"><p className="text-[10px] font-medium text-[#4c555f]">Nothing needs attention</p><p className="mt-1 text-[9px] text-[#8a9098]">This queue is currently clear.</p></div> : null}
      </div>
      <Link href={href} className="mt-2 flex h-9 items-center justify-center rounded-[5px] border border-[#176237] text-[9px] font-semibold text-[#145c32] transition hover:bg-[#f1f7f3]">{action}</Link>
    </section>
  );
}

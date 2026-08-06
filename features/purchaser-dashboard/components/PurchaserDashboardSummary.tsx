import { ClipboardCheck, FileQuestion, ShoppingCart, Truck } from "lucide-react";
import type { PurchaserDashboardSummary as Summary } from "@/features/purchaser-dashboard/types";

export default function PurchaserDashboardSummary({ summary }: { summary: Summary }) {
  const cards = [
    {
      label: "Approved Requests",
      value: summary.approvedRequests,
      helper: "Available purchase records",
      icon: ClipboardCheck,
    },
    {
      label: "Need Supplier Pricing",
      value: summary.needPricing,
      helper: "Supplier or actual cost missing",
      icon: FileQuestion,
    },
    {
      label: "Active Purchase Orders",
      value: summary.activeOrders,
      helper: "Not received or cancelled",
      icon: ShoppingCart,
    },
    {
      label: "Delivery Updates",
      value: summary.deliveriesAwaitingUpdate,
      helper: "Ordered and not delivered",
      icon: Truck,
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.label} className="flex min-h-28 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,.035)]">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Icon size={25} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">{card.label}</p>
              <p className="mt-1 text-3xl font-bold tracking-[-0.04em] text-emerald-700">{card.value}</p>
              <p className="mt-1 text-xs text-slate-500">{card.helper}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}

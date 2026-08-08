"use client";

import { useState } from "react";
import { Download, FileCheck2, LoaderCircle, Store, Truck } from "lucide-react";
import { toast } from "sonner";
import { getPurchaseReceiptDownloadUrlAction } from "@/actions/purchasing";
import type { ProjectPurchaseOrder } from "@/features/project-cost-tracking/types";

function label(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function money(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function MaterialProcurementDetails({
  order,
}: {
  order: ProjectPurchaseOrder;
}) {
  const [openingReceipt, setOpeningReceipt] = useState(false);
  const actualTotal = Number(order.quantity) * Number(order.actual_unit_cost || 0);

  async function openReceipt() {
    if (!order.receipt_evidence || openingReceipt) return;
    setOpeningReceipt(true);
    try {
      const url = await getPurchaseReceiptDownloadUrlAction(order.receipt_evidence.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open receipt.");
    } finally {
      setOpeningReceipt(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
          <Store size={12} className="text-emerald-700" />
          {order.supplier_name || "Supplier pending"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-700">
          <Truck size={12} /> {label(order.status)} · {label(order.delivery_status)}
        </span>
      </div>

      <div className="mt-2 grid gap-1 text-slate-500 sm:grid-cols-2">
        <span>Quotation: <strong className="text-slate-700">{order.quotation_reference || "Not recorded"}</strong></span>
        <span>Actual total: <strong className="text-slate-700">{actualTotal > 0 ? money(actualTotal) : "Not recorded"}</strong></span>
      </div>

      {order.receipt_evidence ? (
        <button
          type="button"
          onClick={openReceipt}
          disabled={openingReceipt}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
        >
          {openingReceipt ? <LoaderCircle size={13} className="animate-spin" /> : <FileCheck2 size={13} />}
          {order.receipt_evidence.fileName}
          <Download size={12} />
        </button>
      ) : (
        <p className="mt-2 text-slate-500">
          Receipt / invoice: <strong className="text-slate-700">{order.receipt_invoice_reference || "Not uploaded"}</strong>
        </p>
      )}
    </div>
  );
}

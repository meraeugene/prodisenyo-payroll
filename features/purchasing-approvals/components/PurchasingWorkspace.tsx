"use client";

import { useEffect, useState, useTransition } from "react";
import { BadgeDollarSign, Download, FileCheck2, LoaderCircle, Pencil, Search, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import {
  getPurchasingRecordsAction,
  getPurchaseReceiptDownloadUrlAction,
  updatePurchaseOrderAction,
  type DeliveryStatus,
  type PurchasingRecord,
  type PurchaseStatus,
} from "@/actions/purchasing";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: PurchaseStatus[] = [
  "draft", "submitted", "approved", "ordered", "received", "cancelled",
];
const DELIVERY_OPTIONS: DeliveryStatus[] = [
  "pending", "scheduled", "in_transit", "delivered",
];

function money(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function PurchasingWorkspace() {
  const [records, setRecords] = useState<PurchasingRecord[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<PurchasingRecord | null>(null);
  const [selectedReceiptName, setSelectedReceiptName] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getPurchasingRecordsAction()
      .then(setRecords)
      .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to load purchases."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = records.filter((record) =>
    [record.projectName, record.itemName, record.supplierName, record.quotationReference]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const total = records.reduce(
    (sum, record) => sum + record.quantity * (record.actualUnitCost || record.estimatedUnitCost),
    0,
  );

  function save(formData: FormData) {
    if (!editing) return;
    startTransition(async () => {
      try {
        const updated = await updatePurchaseOrderAction(formData);
        setRecords((current) => current.map((record) => record.id === updated.id ? updated : record));
        setEditing(null);
        setSelectedReceiptName("");
        toast.success("Purchase details updated.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to update purchase.");
      }
    });
  }

  function openReceipt(evidenceId: string) {
    startTransition(async () => {
      try {
        const url = await getPurchaseReceiptDownloadUrlAction(evidenceId);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to open receipt.");
      }
    });
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-apple-steel">Procurement</p>
          <h1 className="mt-1 text-2xl font-semibold text-apple-charcoal">Purchasing</h1>
        </div>
        <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700">
          <BadgeDollarSign size={14} /> Purchase value: {money(total)}
        </span>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-silver" />
        <input value={search} onChange={(event) => setSearch(event.target.value)}
          placeholder="Search project, material, supplier..."
          className="h-10 w-full rounded-xl border border-apple-mist bg-white pl-9 pr-3 text-sm outline-none focus:border-[#1f6a37]" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoaderCircle className="animate-spin text-emerald-700" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-apple-mist py-16 text-center text-sm text-apple-smoke">
          No approved material purchases are assigned yet.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => (
            <article key={record.id} className="rounded-2xl border border-apple-mist bg-white p-5 shadow-[0_4px_20px_rgba(24,83,43,0.03)]">
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div>
                  <p className="text-xs font-semibold uppercase text-apple-steel">{record.projectName}</p>
                  <h2 className="mt-1 font-bold text-apple-charcoal">{record.itemName}</h2>
                  <p className="mt-1 text-sm text-apple-smoke">{record.quantity} {record.unit} · {record.supplierName || "Supplier pending"}</p>
                  <p className="mt-2 text-xs text-apple-steel">Quotation: {record.quotationReference || "Not recorded"} · Delivery: {record.deliveryStatus.replace("_", " ")}</p>
                  {record.receiptFile ? (
                    <button type="button" onClick={() => openReceipt(record.receiptFile!.id)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100">
                      <FileCheck2 size={13} /> {record.receiptFile.fileName} <Download size={12} />
                    </button>
                  ) : (
                    <p className="mt-2 text-xs text-apple-steel">Receipt / invoice: {record.receiptInvoiceReference || "Not uploaded"}</p>
                  )}
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-right">
                    <p className="text-xs text-apple-steel">Actual total</p>
                    <p className="font-bold text-emerald-800">{money(record.quantity * record.actualUnitCost)}</p>
                    <span className="text-xs font-semibold uppercase text-apple-smoke">{record.status}</span>
                  </div>
                  {record.status === "received" ? (
                    <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                      Final
                    </span>
                  ) : (
                    <button onClick={() => { setEditing(record); setSelectedReceiptName(""); }} aria-label="Edit purchase details"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-apple-mist text-emerald-700 hover:bg-emerald-50">
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <form action={save} className="w-full max-w-lg space-y-4 rounded-2xl border border-apple-mist bg-white p-6 shadow-2xl">
            <input type="hidden" name="id" value={editing.id} />
            <div><h2 className="text-lg font-bold text-apple-charcoal">Update purchase</h2><p className="text-xs text-apple-smoke">{editing.itemName}</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">Supplier<input name="supplierName" defaultValue={editing.supplierName} className="mt-1 h-10 w-full rounded-xl border border-apple-mist px-3 text-sm" /></label>
              <label className="text-xs font-semibold text-slate-700">Actual unit cost<input name="actualUnitCost" type="number" min="0" step="0.01" defaultValue={editing.actualUnitCost} className="mt-1 h-10 w-full rounded-xl border border-apple-mist px-3 text-sm" /></label>
              <label className="text-xs font-semibold text-slate-700">Purchase status<select name="status" defaultValue={editing.status} className="mt-1 h-10 w-full rounded-xl border border-apple-mist px-3 text-sm">{STATUS_OPTIONS.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="text-xs font-semibold text-slate-700">Delivery status<select name="deliveryStatus" defaultValue={editing.deliveryStatus} className="mt-1 h-10 w-full rounded-xl border border-apple-mist px-3 text-sm">{DELIVERY_OPTIONS.map((value) => <option key={value}>{value}</option>)}</select></label>
            </div>
            <label className="block text-xs font-semibold text-slate-700">Supplier quotation reference<input name="quotationReference" defaultValue={editing.quotationReference} placeholder="Quotation number or file reference" className="mt-1 h-10 w-full rounded-xl border border-apple-mist px-3 text-sm" /></label>
            <label className="block text-xs font-semibold text-slate-700">Receipt / invoice reference<input name="receiptInvoiceReference" defaultValue={editing.receiptInvoiceReference} placeholder="Invoice number (optional when uploading a file)" className="mt-1 h-10 w-full rounded-xl border border-apple-mist px-3 text-sm" /></label>
            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-4 text-center transition hover:border-emerald-400 hover:bg-emerald-50">
              <input name="receiptFile" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" className="sr-only" onChange={(event) => setSelectedReceiptName(event.target.files?.[0]?.name ?? "")} />
              <UploadCloud size={22} className="mx-auto text-emerald-700" />
              <span className="mt-2 block text-sm font-semibold text-slate-800">Upload receipt or invoice</span>
              <span className="mt-1 block text-xs text-slate-500">PDF, PNG or JPG, up to 10 MB</span>
              {selectedReceiptName ? <span className="mt-2 block text-xs font-semibold text-emerald-700">Selected: {selectedReceiptName}</span> : editing.receiptFile ? <span className="mt-2 block text-xs font-semibold text-emerald-700">Current: {editing.receiptFile.fileName}</span> : null}
            </label>
            <label className="block text-xs font-semibold text-slate-700">Notes<textarea name="notes" defaultValue={editing.notes} rows={3} className="mt-1 w-full rounded-xl border border-apple-mist p-3 text-sm" /></label>
            <div className="flex justify-end gap-2 border-t border-apple-mist pt-4">
              <button type="button" onClick={() => { setEditing(null); setSelectedReceiptName(""); }} className="h-10 rounded-xl border border-apple-mist px-4 text-sm">Cancel</button>
              <button disabled={isPending} className={cn("flex h-10 items-center gap-2 rounded-xl bg-[#1f6a37] px-5 text-sm font-semibold text-white", isPending && "opacity-60")}>{isPending ? <LoaderCircle size={14} className="animate-spin" /> : null}Save</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

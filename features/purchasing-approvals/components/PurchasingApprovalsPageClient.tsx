"use client";

import React, { useState, useTransition } from "react";
import DashboardPageHero from "@/components/DashboardPageHero";
import { 
  BadgeDollarSign, 
  Search, 
  CheckCircle, 
  XCircle, 
  LoaderCircle,
  Building,
  User,
  ShoppingBag,
  FileText,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PurchaseOrder {
  id: string;
  poNumber: string;
  projectName: string;
  vendorName: string;
  amount: number;
  items: Array<{ name: string; qty: number; unitPrice: number }>;
  requestedBy: string;
  date: string;
  status: "pending" | "approved" | "rejected";
  comments?: string;
}

const INITIAL_POS: PurchaseOrder[] = [
  {
    id: "po-1",
    poNumber: "PO-2026-0042",
    projectName: "Grand Horizon Towers",
    vendorName: "Apex Steel Corporation",
    amount: 1250000,
    items: [
      { name: "Structural Reinforcement Steel Rebar 25mm", qty: 500, unitPrice: 1800 },
      { name: "Structural Reinforcement Steel Rebar 20mm", qty: 250, unitPrice: 1400 },
    ],
    requestedBy: "Engineer User",
    date: "2026-07-16",
    status: "pending",
  },
  {
    id: "po-2",
    poNumber: "PO-2026-0043",
    projectName: "Vista Verde Residences",
    vendorName: "Solid Rock Concrete Inc",
    amount: 620000,
    items: [
      { name: "Ready-Mix Concrete 4000 PSI Class A", qty: 120, unitPrice: 5166.67 },
    ],
    requestedBy: "Engineer User",
    date: "2026-07-17",
    status: "pending",
  },
  {
    id: "po-3",
    poNumber: "PO-2026-0044",
    projectName: "Skyline Business Park",
    vendorName: "PowerFlow Electrical Supply",
    amount: 450000,
    items: [
      { name: "High-Voltage Distribution Copper Cable 150m", qty: 3, unitPrice: 150000 },
    ],
    requestedBy: "Engineer User",
    date: "2026-07-18",
    status: "pending",
  },
  {
    id: "po-4",
    poNumber: "PO-2026-0040",
    projectName: "Grand Horizon Towers",
    vendorName: "PhilPipes Plumbing Supply",
    amount: 180000,
    items: [
      { name: "Heavy-Duty Sewerage Gate Valves 4\"", qty: 15, unitPrice: 12000 },
    ],
    requestedBy: "Engineer User",
    date: "2026-07-10",
    status: "approved",
    comments: "Urgent PO verified with site layouts.",
  },
];

export default function PurchasingApprovalsPageClient() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(INITIAL_POS);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();

  const [reviewingPO, setReviewingPO] = useState<PurchaseOrder | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [commentText, setCommentText] = useState("");

  const filteredPOs = React.useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchesTab = activeTab === "all" ? true : po.status === activeTab;
      const matchesSearch = 
        po.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.poNumber.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [purchaseOrders, activeTab, searchTerm]);

  const stats = React.useMemo(() => {
    const pending = purchaseOrders.filter((po) => po.status === "pending").length;
    const approved = purchaseOrders.filter((po) => po.status === "approved").length;
    const rejected = purchaseOrders.filter((po) => po.status === "rejected").length;
    const totalPendingAmount = purchaseOrders
      .filter((po) => po.status === "pending")
      .reduce((sum, po) => sum + po.amount, 0);
    return { pending, approved, rejected, totalPendingAmount };
  }, [purchaseOrders]);

  const handleAction = (po: PurchaseOrder, action: "approve" | "reject") => {
    setReviewingPO(po);
    setActionType(action);
    setCommentText("");
  };

  const handleConfirm = () => {
    if (!reviewingPO) return;
    const targetStatus = actionType === "approve" ? "approved" : "rejected";
    const statusWord = actionType === "approve" ? "Approved" : "Rejected";

    startTransition(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));

      setPurchaseOrders((prev) =>
        prev.map((po) =>
          po.id === reviewingPO.id
            ? { ...po, status: targetStatus, comments: commentText.trim() || undefined }
            : po
        )
      );

      toast.success(`Purchase Order ${reviewingPO.poNumber} successfully ${statusWord}!`);
      setReviewingPO(null);
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-4 p-0 sm:p-6">
      <DashboardPageHero
        eyebrow="Purchasing Controls"
        title="Purchasing Approvals"
        description="Approve procurement requests, vendor purchase orders, and payment allocations for projects."
        actions={
          <span className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 sm:mt-0">
            <BadgeDollarSign size={14} />
            Pending value: {formatCurrency(stats.totalPendingAmount)}
          </span>
        }
      />

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
        <div className="flex gap-1.5 overflow-x-auto">
          {([
            { id: "pending", label: `Pending Review (${stats.pending})` },
            { id: "approved", label: `Approved (${stats.approved})` },
            { id: "rejected", label: `Rejected (${stats.rejected})` },
            { id: "all", label: "All POs" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all",
                activeTab === tab.id
                  ? "bg-[#1f6a37] text-white shadow-xs"
                  : "text-apple-smoke hover:bg-apple-mist/50 hover:text-apple-charcoal border border-apple-mist bg-white"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-silver" />
          <input
            type="text"
            placeholder="Search PO#, vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-apple-mist bg-apple-mist/20 text-xs text-apple-charcoal outline-none placeholder:text-apple-silver focus:border-[#1f6a37] focus:bg-white transition"
          />
        </div>
      </div>

      {/* PO List */}
      <div className="space-y-4">
        {filteredPOs.length > 0 ? (
          filteredPOs.map((po) => (
            <div
              key={po.id}
              className="bg-white border border-apple-mist rounded-2xl p-5 shadow-[0_4px_20px_rgba(24,83,43,0.03)] hover:border-slate-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-3">
                <div className="flex items-center gap-3">
                  {/* Visual vendor icon/image */}
                  <div className="h-10 w-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        po.vendorName.toLowerCase().includes("steel")
                          ? "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=150&q=80"
                          : po.vendorName.toLowerCase().includes("concrete") || po.vendorName.toLowerCase().includes("rock")
                          ? "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=150&q=80"
                          : po.vendorName.toLowerCase().includes("electrical") || po.vendorName.toLowerCase().includes("power")
                          ? "https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&w=150&q=80"
                          : "https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&w=150&q=80"
                      }
                      alt={po.vendorName}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-apple-charcoal tracking-tight bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                        {po.poNumber}
                      </span>
                      <span className="text-xs font-medium text-slate-400">Date: {po.date}</span>
                    </div>
                    <h4 className="font-extrabold text-slate-700 text-sm mt-1">{po.vendorName}</h4>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-400 font-semibold uppercase">Total Amount</p>
                  <p className="text-lg font-bold text-emerald-800">{formatCurrency(po.amount)}</p>
                </div>
              </div>

              {/* Items details */}
              <div className="mt-4 grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-3">
                  <div>
                    <h5 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <ShoppingBag size={12} /> Items Requested
                    </h5>
                    <div className="mt-2 space-y-1.5 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                      {po.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-slate-600">
                          <span>{item.name} (x{item.qty})</span>
                          <span className="font-semibold text-slate-700">{formatCurrency(item.qty * item.unitPrice)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {po.comments && (
                    <div className="bg-emerald-50/20 border border-emerald-100 text-emerald-800 rounded-xl p-2.5 flex gap-2">
                      <MessageSquare size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/80">Approval Comments</p>
                        <p className="text-xs italic mt-0.5">{po.comments}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Infrastructure context and Actions */}
                <div className="border-l border-slate-100 pl-6 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-400 uppercase font-semibold flex items-center gap-0.5">
                        <Building size={11} /> Project Link
                      </span>
                      <p className="text-xs font-bold text-apple-charcoal">{po.projectName}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-400 uppercase font-semibold flex items-center gap-0.5">
                        <User size={11} /> Created By
                      </span>
                      <p className="text-xs font-bold text-apple-charcoal">{po.requestedBy}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-50 justify-end md:justify-start">
                    {po.status === "pending" ? (
                      <>
                        <button
                          onClick={() => handleAction(po, "reject")}
                          className="h-9 px-3 rounded-lg border border-rose-200 text-xs font-semibold text-rose-700 bg-rose-50/30 hover:bg-rose-50 hover:border-rose-300 transition"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleAction(po, "approve")}
                          className="h-9 px-3.5 rounded-lg bg-[#1f6a37] text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-sm"
                        >
                          Approve PO
                        </button>
                      </>
                    ) : (
                      <span className={cn(
                        "border px-2.5 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wider",
                        po.status === "approved" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"
                      )}>
                        {po.status === "approved" ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {po.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
            <FileText size={36} className="mx-auto text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-500">No purchase orders found</p>
            <p className="text-xs text-slate-400 mt-1">Check back later for new procurement requests.</p>
          </div>
        )}
      </div>

      {/* Approve/Reject Dialogue */}
      {reviewingPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-apple-mist rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-apple-charcoal">
              {actionType === "approve" ? "Approve" : "Reject"} Purchase Order
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {reviewingPO.poNumber} for {reviewingPO.vendorName} ({formatCurrency(reviewingPO.amount)})
            </p>

            <div className="mt-4 space-y-3">
              <label className="text-xs font-semibold text-slate-700">Review Comments</label>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Include verification comments, payment structure notes, or reason for rejection..."
                rows={3}
                className="w-full rounded-xl border border-apple-mist p-3 text-xs text-apple-charcoal outline-none placeholder:text-apple-silver transition focus:border-[#1f6a37]"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewingPO(null)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className={cn(
                  "h-10 px-5 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center gap-1.5",
                  actionType === "approve" ? "bg-[#1f6a37] hover:bg-emerald-800" : "bg-rose-600 hover:bg-rose-700"
                )}
              >
                {isPending && <LoaderCircle size={14} className="animate-spin" />}
                Confirm {actionType === "approve" ? "Approval" : "Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

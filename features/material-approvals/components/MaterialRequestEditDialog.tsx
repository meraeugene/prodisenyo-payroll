"use client";

import { useState } from "react";
import { Save, X } from "lucide-react";
import type {
  EditableMaterialRequest,
  MaterialRequest,
} from "@/features/material-approvals/types";

const FIELD_CLASS =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

export default function MaterialRequestEditDialog({
  request,
  onClose,
  onSave,
}: {
  request: MaterialRequest;
  onClose: () => void;
  onSave: (changes: EditableMaterialRequest) => void;
}) {
  const [form, setForm] = useState<EditableMaterialRequest>({
    materialName: request.materialName,
    quantity: request.quantity,
    unit: request.unit,
    neededBy: request.neededBy,
    priority: request.priority,
    notes: request.notes ?? "",
  });
  const [error, setError] = useState("");

  function update<K extends keyof EditableMaterialRequest>(
    key: K,
    value: EditableMaterialRequest[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.materialName.trim()) {
      setError("Material name is required.");
      return;
    }
    if (!Number.isFinite(form.quantity) || form.quantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }
    if (!form.unit.trim() || !form.neededBy) {
      setError("Unit and needed-by date are required.");
      return;
    }

    onSave({
      ...form,
      materialName: form.materialName.trim(),
      unit: form.unit.trim(),
      notes: form.notes?.trim() || undefined,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-material-title"
    >
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-[0_24px_70px_rgba(15,23,42,.25)]"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-emerald-900 px-5 py-4 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-white/70">
              CEO material correction
            </p>
            <h2 id="edit-material-title" className="mt-1 text-lg font-bold">
              Edit submitted material request
            </h2>
            <p className="mt-1 text-xs text-white/70">{request.projectName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit material dialog"
            className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="grid gap-1.5 sm:col-span-2">
            <span className="text-sm font-semibold text-slate-800">Material name</span>
            <input
              autoFocus
              value={form.materialName}
              onChange={(event) => update("materialName", event.target.value)}
              className={FIELD_CLASS}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">Quantity</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.quantity}
              onChange={(event) => update("quantity", Number(event.target.value))}
              className={FIELD_CLASS}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">Unit</span>
            <input
              value={form.unit}
              onChange={(event) => update("unit", event.target.value)}
              className={FIELD_CLASS}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">Needed by</span>
            <input
              type="date"
              value={form.neededBy}
              onChange={(event) => update("neededBy", event.target.value)}
              className={FIELD_CLASS}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">Priority</span>
            <select
              value={form.priority}
              onChange={(event) =>
                update(
                  "priority",
                  event.target.value as EditableMaterialRequest["priority"],
                )
              }
              className={FIELD_CLASS}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="grid gap-1.5 sm:col-span-2">
            <span className="text-sm font-semibold text-slate-800">Specifications and notes</span>
            <textarea
              rows={4}
              maxLength={500}
              value={form.notes ?? ""}
              onChange={(event) => update("notes", event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          {error ? (
            <p className="text-sm font-medium text-rose-600 sm:col-span-2">{error}</p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-semibold text-white hover:bg-emerald-900"
          >
            <Save size={15} /> Save changes
          </button>
        </div>
      </form>
    </div>
  );
}

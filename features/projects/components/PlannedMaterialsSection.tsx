import Link from "next/link";
import { Calculator, CheckCircle2, FileText, Plus } from "lucide-react";
import type { PlannedMaterialRow } from "@/features/material-requests/utils/plannedMaterials";

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

export default function PlannedMaterialsSection({
  projectId,
  materials,
}: {
  projectId: string;
  materials: PlannedMaterialRow[];
}) {
  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-[0_6px_22px_rgba(15,23,42,.03)]">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            <Calculator size={15} /> Approved estimate
          </p>
          <h2 className="mt-2 text-lg font-bold text-slate-950">Planned Materials</h2>
          <p className="mt-1 text-sm text-slate-600">
            Submit materials in phases as they are needed on site.
          </p>
        </div>
        <span className="text-xs font-semibold text-emerald-800">
          {materials.length} planned line{materials.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {materials.map((material) => {
          const complete = material.remainingQuantity <= 0;
          const progress = material.plannedQuantity
            ? Math.min(100, (material.requestedQuantity / material.plannedQuantity) * 100)
            : 0;
          return (
            <article key={material.estimateItemId} className="rounded-xl border border-emerald-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900">{material.materialName}</p>
                  <p className="mt-1 text-xs text-slate-500">{material.itemName}</p>
                </div>
                <span className="shrink-0 text-sm font-bold text-emerald-800">
                  {currency.format(material.estimatedTotal)}
                </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-700" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-600">
                <span>{material.requestedQuantity} requested</span>
                <span>{material.remainingQuantity} {material.unit} remaining</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <FileText size={13} /> {currency.format(material.unitCost)} / {material.unit}
                </span>
                {complete ? (
                  <span className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-50 px-3 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 size={14} /> Fully requested
                  </span>
                ) : (
                  <Link
                    href={`/request-material?projectId=${projectId}&estimateItemId=${material.estimateItemId}`}
                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-800 px-3 text-xs font-semibold text-white hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
                  >
                    <Plus size={14} /> Request material
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {!materials.length ? (
        <div className="mt-4 rounded-xl border border-dashed border-emerald-200 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
          No approved estimate materials are available yet.
        </div>
      ) : null}
    </section>
  );
}

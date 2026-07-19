"use client";

import { useEffect, useState } from "react";
import { Clock3, Eye, MoreHorizontal, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import EstimateStatusBadge from "@/features/cost-estimator/components/EstimateStatusBadge";
import {
  formatEstimateDateTime,
  formatBudgetMoney,
  formatProjectTypeLabel,
} from "@/features/cost-estimator/utils/costEstimatorFormatters";
import type { ReviewProjectEstimateRow } from "@/features/cost-estimator/types";

export default function EstimateReviewsTable({
  estimates,
  pendingReviewsCount,
  onOpenReport,
  onDeleteEstimate,
}: {
  estimates: ReviewProjectEstimateRow[];
  pendingReviewsCount: number;
  onOpenReport: (estimateId: string) => void;
  onDeleteEstimate: (estimateId: string) => void;
}) {
  const [openMenu, setOpenMenu] = useState<{
    estimateId: string;
    top: number;
    left: number;
  } | null>(null);

  const openMenuEstimate =
    estimates.find((estimate) => estimate.id === openMenu?.estimateId) ?? null;

  useEffect(() => {
    if (!openMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-estimate-actions-root]")) return;
      setOpenMenu(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [openMenu]);

  function handleOpenMenu(estimateId: string, rect: DOMRect) {
    setOpenMenu((current) =>
      current?.estimateId === estimateId
        ? null
        : {
            estimateId,
            top: rect.bottom + 8,
            left: rect.right,
          },
    );
  }

  return (
    <section className="mt-4 rounded-none border border-apple-mist bg-white p-5 shadow-[0_10px_30px_rgba(24,83,43,0.06)] sm:rounded-[18px]">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <Clock3 size={12} />
            {pendingReviewsCount} pending
          </span>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-visible rounded-[18px] border border-apple-mist">
        <table className="min-w-[920px] w-full text-sm">
          <thead>
            <tr className="bg-[rgb(var(--apple-snow))]">
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-apple-steel">
                Project
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-apple-steel">
                Type
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-apple-steel">
                Submitted
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-apple-steel">
                Submitted By
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.15em] text-apple-steel">
                Total
              </th>
              <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-apple-steel">
                Status
              </th>
              <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-apple-steel">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-apple-mist">
            {estimates.length > 0 ? (
              estimates.map((estimate) => (
                <tr key={estimate.id}>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-apple-charcoal">
                      {estimate.project_name}
                    </p>
                    <p className="mt-1 text-xs text-apple-steel">
                      Engineer estimate
                    </p>
                  </td>
                  <td className="px-3 py-3 text-apple-smoke">
                    {formatProjectTypeLabel(estimate.project_type)}
                  </td>
                  <td className="px-3 py-3 text-apple-smoke">
                    {formatEstimateDateTime(
                      estimate.submitted_at ?? estimate.created_at,
                    )}
                  </td>
                  <td className="px-3 py-3 text-apple-smoke">
                    {estimate.requester_profile?.full_name?.trim() ||
                      estimate.requester_profile?.username ||
                      "Unknown engineer"}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-apple-charcoal">
                    {formatBudgetMoney(estimate.estimate_total)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <EstimateStatusBadge status={estimate.status} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={(event) =>
                        handleOpenMenu(
                          estimate.id,
                          event.currentTarget.getBoundingClientRect(),
                        )
                      }
                      data-estimate-actions-root
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-apple-mist bg-white text-apple-smoke transition hover:border-emerald-100 hover:bg-emerald-50/60 hover:text-apple-charcoal"
                      aria-label={`Open actions for ${estimate.project_name}`}
                    >
                      <MoreHorizontal size={15} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-5 text-center text-sm text-apple-steel"
                >
                  No submitted estimates are waiting for review.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {openMenu && openMenuEstimate
        ? createPortal(
            <div
              data-estimate-actions-root
              className="fixed z-[140] min-w-[154px] -translate-x-full overflow-hidden rounded-[16px] border border-[#e8f0ea] bg-white text-left shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
              style={{ top: openMenu.top, left: openMenu.left }}
            >
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  onOpenReport(openMenuEstimate.id);
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold text-apple-charcoal transition hover:bg-emerald-50/70"
              >
                <Eye size={13} />
                View estimate
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  onDeleteEstimate(openMenuEstimate.id);
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold text-rose-600 transition hover:bg-rose-50/70"
              >
                <Trash2 size={13} />
                Delete estimate
              </button>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

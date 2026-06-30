"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { saveEmployeeBranchRatesAction } from "@/actions/payrollRates";
import type { UsePayrollStateResult } from "@/features/payroll/hooks/usePayrollState";
import {
  extractSiteName,
  formatPayrollNumber,
} from "@/features/payroll/utils/payrollFormatters";
import { buildEmployeeBranchRateKey } from "@/features/payroll/utils/payrollMappers";
import {
  DEFAULT_REGULAR_PAID_HOURS,
  normalizeEmployeeBranchRateConfig,
} from "@/features/payroll/utils/branchRateConfig";

interface PayrollRateModalProps {
  payroll: UsePayrollStateResult;
}

export default function PayrollRateModal({ payroll }: PayrollRateModalProps) {
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState<"all" | "multi">("all");

  const editableRows = useMemo(
    () =>
      payroll.payrollBaseComputedRows
        .map((row) => ({
          worker: row.worker,
          role: row.role,
          site: row.site,
          siteLabel: extractSiteName(row.site) || row.site,
          key: buildEmployeeBranchRateKey(row.worker, row.role, row.site),
          fallbackRate: Number(
            ((row.customRate ?? row.defaultRate) * 8).toFixed(2),
          ),
          fallbackRegularPaidHours: DEFAULT_REGULAR_PAID_HOURS,
        }))
        .sort((a, b) => {
          const byWorker = a.worker.localeCompare(b.worker);
          if (byWorker !== 0) return byWorker;
          const bySite = a.siteLabel.localeCompare(b.siteLabel);
          if (bySite !== 0) return bySite;
          return a.role.localeCompare(b.role);
        }),
    [payroll.payrollBaseComputedRows],
  );

  const branchCountByEmployee = useMemo(
    () =>
      editableRows.reduce<Map<string, number>>((map, row) => {
        const key = row.worker.trim().toLowerCase();
        map.set(key, (map.get(key) ?? 0) + 1);
        return map;
      }, new Map()),
    [editableRows],
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();
    return editableRows.filter((row) => {
      const isMultiBranch =
        (branchCountByEmployee.get(row.worker.trim().toLowerCase()) ?? 0) > 1;

      if (branchFilter === "multi" && !isMultiBranch) {
        return false;
      }

      if (!normalizedQuery) return true;

      return (
        row.worker.toLowerCase().includes(normalizedQuery) ||
        row.role.toLowerCase().includes(normalizedQuery) ||
        row.siteLabel.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [editableRows, searchTerm, branchFilter, branchCountByEmployee]);

  if (!payroll.showPayrollRateModal) return null;

  function handleSave() {
    startTransition(async () => {
      try {
        const changedSummaries: string[] = [];
        const changedEntries = editableRows
          .map((row) => {
            const nextConfig = normalizeEmployeeBranchRateConfig(
              payroll.payrollRateDraft[row.key],
              row.fallbackRate,
            );
            const currentConfig = normalizeEmployeeBranchRateConfig(
              payroll.employeeBranchRates[row.key],
              row.fallbackRate,
            );
            const nextDailyRate = nextConfig.dailyRate;
            const currentDailyRate = currentConfig.dailyRate;
            const nextRegularPaidHours = nextConfig.regularPaidHours;
            const currentRegularPaidHours = currentConfig.regularPaidHours;

            if (
              Math.abs(nextDailyRate - currentDailyRate) < 0.005 &&
              Math.abs(nextRegularPaidHours - currentRegularPaidHours) < 0.005
            ) {
              return null;
            }

            const dailyRateChanged =
              Math.abs(nextDailyRate - currentDailyRate) >= 0.005;
            const regularHoursChanged =
              Math.abs(nextRegularPaidHours - currentRegularPaidHours) >=
              0.005;
            const changeDetails = [
              dailyRateChanged
                ? `daily rate ${formatPayrollNumber(currentDailyRate)} to ${formatPayrollNumber(nextDailyRate)}`
                : null,
              regularHoursChanged
                ? `regular paid hours ${formatPayrollNumber(currentRegularPaidHours)}h to ${formatPayrollNumber(nextRegularPaidHours)}h`
                : null,
            ].filter(Boolean);

            changedSummaries.push(
              `${row.worker} at ${row.siteLabel}: ${changeDetails.join(", ")}`,
            );

            return {
              employeeName: row.worker,
              roleCode: row.role,
              siteName: row.site,
              dailyRate: nextDailyRate,
              regularPaidHours: nextRegularPaidHours,
            };
          })
          .filter((entry): entry is NonNullable<typeof entry> =>
            Boolean(entry),
          );

        if (changedEntries.length === 0) {
          toast.info("No branch rate changes to save.");
          return;
        }

        const result = await saveEmployeeBranchRatesAction(changedEntries);

        payroll.setEmployeeBranchRates({ ...payroll.payrollRateDraft });
        payroll.applyPayrollRates();
        const primaryMessage =
          result.saved === 1
            ? "Branch rate saved."
            : `${result.saved} branch rates saved.`;

        const extraCount = changedSummaries.length - 1;
        const description =
          changedSummaries.length > 0
            ? `${changedSummaries.slice(0, 3).join(" | ")}${
                extraCount > 2
                  ? ` | +${extraCount - 2} more change${extraCount - 2 === 1 ? "" : "s"}`
                  : ""
              }`
            : "The employee's branch-specific rate was updated.";

        toast.success(primaryMessage, {
          description,
        });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to save branch rates.",
        );
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-0 sm:p-4 backdrop-blur-sm">
      <div className="flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-none border border-apple-mist bg-white p-4 shadow-apple-xs sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:p-6">
        <div>
          <h3 className="text-lg font-bold text-apple-charcoal">
            Edit Employee Rates Per Branch
          </h3>
          <p className="text-sm text-apple-smoke">
            The standard daily rate is 500 for all employees. You can override
            it here per employee and branch, and those saved rates will be
            reused the next time payroll is generated for the same employee at
            the same site.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full max-w-md">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-apple-silver"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search employee, role, or branch"
                className="h-11 w-full rounded-2xl border border-apple-silver bg-white pl-10 pr-4 text-sm text-apple-charcoal transition-all focus:border-apple-charcoal focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15"
              />
            </div>

            <div className="inline-flex rounded-2xl border border-apple-mist bg-apple-snow/70 p-1">
              <button
                type="button"
                onClick={() => setBranchFilter("all")}
                className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  branchFilter === "all"
                    ? "bg-emerald-700 text-white"
                    : "text-apple-ash hover:bg-white"
                }`}
              >
                All Employees
              </button>
              <button
                type="button"
                onClick={() => setBranchFilter("multi")}
                className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  branchFilter === "multi"
                    ? "bg-emerald-700 text-white"
                    : "text-apple-ash hover:bg-white"
                }`}
              >
                Multi-branch Only
              </button>
            </div>
          </div>

          <p className="text-xs text-apple-steel">
            Showing {filteredRows.length} of {editableRows.length} branch rate
            row
            {editableRows.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-2xl border border-apple-mist">
          <table className="min-w-[760px] text-sm sm:min-w-full">
            <thead className="sticky top-0 z-10 bg-apple-snow/95 backdrop-blur-sm">
              <tr className="border-b border-apple-mist">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-apple-steel">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-apple-steel">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-apple-steel">
                  Branch
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-apple-steel">
                  Daily Rate
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-apple-steel">
                  Regular Paid Hours
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length > 0 ? (
                filteredRows.map((row) => {
                  const draftConfig = normalizeEmployeeBranchRateConfig(
                    payroll.payrollRateDraft[row.key],
                    row.fallbackRate,
                  );

                  return (
                    <tr
                      key={row.key}
                      className="border-b border-apple-mist/70 last:border-0"
                    >
                    <td className="px-4 py-3 font-medium text-apple-charcoal">
                      <div className="flex items-center gap-2">
                        <span>{row.worker}</span>
                        {(branchCountByEmployee.get(
                          row.worker.trim().toLowerCase(),
                        ) ?? 0) > 1 ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            Multi-branch
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-apple-ash">{row.role}</td>
                    <td className="px-4 py-3 text-apple-ash">
                      {row.siteLabel}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={draftConfig.dailyRate}
                        onChange={(event) => {
                          const parsed = Number.parseFloat(event.target.value);
                          payroll.setPayrollRateDraft((prev) => ({
                            ...prev,
                            [row.key]: {
                              ...normalizeEmployeeBranchRateConfig(
                                prev[row.key],
                                row.fallbackRate,
                              ),
                              dailyRate:
                                Number.isFinite(parsed) && parsed >= 0
                                  ? parsed
                                  : 0,
                            },
                          }));
                        }}
                        className="h-10 w-full rounded-2xl border border-apple-silver bg-white px-3 text-right text-sm text-apple-charcoal transition-all focus:border-apple-charcoal focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15"
                      />
                      <p className="mt-1 text-right text-[11px] text-apple-steel">
                        Hourly:{" "}
                        {formatPayrollNumber(draftConfig.dailyRate / 8)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0.01}
                        step="0.25"
                        value={draftConfig.regularPaidHours}
                        onChange={(event) => {
                          const parsed = Number.parseFloat(event.target.value);
                          payroll.setPayrollRateDraft((prev) => ({
                            ...prev,
                            [row.key]: {
                              ...normalizeEmployeeBranchRateConfig(
                                prev[row.key],
                                row.fallbackRate,
                              ),
                              regularPaidHours:
                                Number.isFinite(parsed) && parsed > 0
                                  ? parsed
                                  : row.fallbackRegularPaidHours,
                            },
                          }));
                        }}
                        className="h-10 w-full rounded-2xl border border-apple-silver bg-white px-3 text-right text-sm text-apple-charcoal transition-all focus:border-apple-charcoal focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15"
                      />
                      <p className="mt-1 text-right text-[11px] text-apple-steel">
                        Max regular hours paid
                      </p>
                    </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-apple-steel"
                  >
                    No employee branch rates matched your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-apple-steel">
            Showing {filteredRows.length} row
            {filteredRows.length === 1 ? "" : "s"} in alphabetical order
          </p>

          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={payroll.closePayrollRateModal}
              className="h-10 w-full rounded-xl border border-apple-silver px-4 text-sm font-semibold text-apple-ash transition hover:border-apple-charcoal sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Branch Rates"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

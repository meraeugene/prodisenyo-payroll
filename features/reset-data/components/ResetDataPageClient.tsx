"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DashboardPageHero from "@/components/DashboardPageHero";
import { resetWorkspaceDataAction } from "@/actions/resetData";

export default function ResetDataPageClient() {
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();

  const canReset = confirmation.trim().toUpperCase() === "RESET";

  function handleResetData() {
    if (!canReset || isPending) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await resetWorkspaceDataAction();
        toast.success("Workspace data reset completed.", {
          description: `Cleared ${result.clearedTables} tables. User accounts were preserved.`,
        });
        setConfirmation("");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to reset workspace data.",
        );
      }
    });
  }

  return (
    <div className="space-y-4 p-0 sm:p-6">
      <DashboardPageHero
        eyebrow="CEO Admin"
        title="Reset Workspace Data"
        description="Permanently clears operational records while preserving user accounts. This action cannot be undone."
      />

      <section className="rounded-none border border-red-200 bg-white p-5 shadow-[0_10px_30px_rgba(24,83,43,0.06)] sm:rounded-[18px]">
        <div className="flex items-start gap-3 rounded-[14px] border border-red-200 bg-red-50 p-4">
          <div className="mt-0.5 text-red-600">
            <ShieldAlert size={20} />
          </div>
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-red-800">
              Danger Zone
            </h2>
            <p className="text-sm text-red-700">
              This removes projects, progress, attendance, payroll, overtime,
              estimates, budgets, employees, sites, catalogs, and request logs
              from the database. Back up the database before continuing.
            </p>
            <p className="text-sm font-semibold text-red-800">
              Preserved tables: auth users and profile accounts.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-2">
          <label
            className="text-sm font-semibold text-apple-charcoal"
            htmlFor="confirm-reset"
          >
            Type RESET to continue
          </label>
          <input
            id="confirm-reset"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="RESET"
            className="h-11 rounded-xl border border-apple-mist bg-white px-3 text-sm text-apple-charcoal outline-none transition focus:border-red-400"
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleResetData}
            disabled={!canReset || isPending}
            className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <LoaderCircle size={16} className="animate-spin" />
                Clearing data...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Reset Data
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}

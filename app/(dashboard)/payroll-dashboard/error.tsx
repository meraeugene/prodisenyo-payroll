"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function PayrollDashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-slate-50/40 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-rose-100 bg-white p-8 text-center shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-700">
          <AlertTriangle size={22} />
        </span>
        <h1 className="mt-4 text-xl font-bold text-slate-950">
          Payroll dashboard could not be loaded
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          The saved attendance or payroll records may be temporarily unavailable.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          <RefreshCw size={15} /> Try again
        </button>
      </section>
    </main>
  );
}

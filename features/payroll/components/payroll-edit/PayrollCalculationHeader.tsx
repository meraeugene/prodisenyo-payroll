"use client";

import { Building2, CalendarDays, Calculator, X } from "lucide-react";

interface PayrollCalculationHeaderProps {
  employeeName: string;
  roleName: string;
  siteLabel: string;
  periodLabel: string | null;
  onClose: () => void;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function PayrollCalculationHeader({
  employeeName,
  roleName,
  siteLabel,
  periodLabel,
  onClose,
}: PayrollCalculationHeaderProps) {
  return (
    <header className="shrink-0 border-b border-slate-200 bg-white">
      <div className="flex min-h-16 items-center gap-3 px-4 py-2 sm:px-6">
        <div className="flex shrink-0 items-center gap-3 border-r border-slate-200 pr-4 sm:pr-6">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-700 text-white shadow-sm">
            <Calculator size={18} />
          </span>
          <h2 className="hidden text-base font-bold text-slate-950 min-[460px]:block">
            Calculation Details
          </h2>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-700 text-xs font-bold text-white">
              {getInitials(employeeName)}
            </span>
            <div className="max-w-44 leading-tight">
              <p className="truncate text-sm font-bold text-slate-950">{employeeName}</p>
              <span className="mt-0.5 inline-flex max-w-full truncate rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                {roleName}
              </span>
            </div>
          </div>

          <div className="hidden h-8 w-px shrink-0 bg-slate-200 sm:block" />
          <div className="flex shrink-0 items-center gap-2 text-xs text-slate-600">
            <Building2 size={15} className="text-emerald-700" />
            <div>
              <p className="font-semibold text-slate-800">{siteLabel}</p>
              <p className="text-[10px] text-slate-400">Site</p>
            </div>
          </div>

          {periodLabel ? (
            <>
              <div className="hidden h-8 w-px shrink-0 bg-slate-200 sm:block" />
              <div className="flex shrink-0 items-center gap-2 text-xs text-slate-600">
                <CalendarDays size={15} className="text-emerald-700" />
                <div>
                  <p className="font-semibold text-slate-800">{periodLabel}</p>
                  <p className="text-[10px] text-slate-400">Payroll cutoff</p>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close calculation details"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <X size={18} />
        </button>
      </div>
    </header>
  );
}

"use client";

import { Plus } from "lucide-react";
import { usePhilippineClock } from "@/features/operations/hooks/usePhilippineClock";

export default function OperationsOverviewHeader({ onCreateProject }: { onCreateProject: () => void }) {
  const clock = usePhilippineClock();

  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-[#151922] sm:text-[30px]">
          Operations Overview
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#687080] sm:text-xs">
          <span>Portfolio Command Center</span>
          <span aria-hidden="true">•</span>
          <span>{clock.date || "Philippine Standard Time"}</span>
          <span aria-hidden="true">•</span>
          <span>{clock.time ? `${clock.time} PHT` : "PHT"}</span>
        </p>
      </div>
      <button
        type="button"
        onClick={onCreateProject}
        className="inline-flex h-11 w-fit items-center gap-2 rounded-[6px] bg-[#087332] px-5 text-[12px] font-semibold text-white shadow-[0_4px_10px_rgba(8,115,50,0.18)] transition hover:bg-[#065d29] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087332] focus-visible:ring-offset-2"
      >
        <Plus size={17} aria-hidden="true" />
        Create project
      </button>
    </header>
  );
}

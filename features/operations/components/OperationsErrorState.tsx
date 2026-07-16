"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function OperationsErrorState({ reset }: { reset: () => void }) {
  return <div className="grid min-h-[70vh] place-items-center px-5"><div className="w-full max-w-md rounded-[10px] border border-[#ecd3d5] bg-white p-7 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#fdebed] text-[#bd3440]"><AlertTriangle size={22} /></span><h1 className="mt-4 text-xl font-semibold text-[#1e232b]">Operations data is unavailable</h1><p className="mt-2 text-sm leading-6 text-[#6d7580]">The dashboard could not load its latest project and purchasing information. Your data has not been changed.</p><button type="button" onClick={reset} className="mt-5 inline-flex h-10 items-center gap-2 rounded-[6px] bg-[#087332] px-4 text-sm font-semibold text-white"><RotateCcw size={15} />Try again</button></div></div>;
}

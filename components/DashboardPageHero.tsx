"use client";

import type { ReactNode } from "react";

interface DashboardPageHeroProps {
  eyebrow: string;
  title: string;
  description?: string;
  isUploadAttendance?: boolean;
  actions?: ReactNode;
}

export default function DashboardPageHero({
  eyebrow,
  title,
  description,
  isUploadAttendance = false,
  actions,
}: DashboardPageHeroProps) {
  return (
    <section className="rounded-none bg-[linear-gradient(135deg,#112e1a,#1f4f2c,#245f34)] p-5 text-white  sm:rounded-[14px] sm:p-6 flex items-center justify-between flex-wrap ">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.03em] text-white sm:text-[32px]">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/72 sm:text-[15px]">
          {description}
        </p>
      </div>
      {(isUploadAttendance || actions) && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </section>
  );
}

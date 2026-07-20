"use client";

import Image from "next/image";
import RoleHintTypewriter from "@/features/home/components/RoleHintTypewriter";

export default function RoleGreetingHero({
  dateLabel,
  title,
  messages,
  className = "",
}: {
  dateLabel: string;
  title: string;
  messages: string[];
  className?: string;
}) {
  return (
    <section
      className={`relative overflow-visible rounded-none bg-[linear-gradient(140deg,#114023,#1f6a37,#2e8b57)] p-4 text-white shadow-[0_16px_34px_rgba(22,101,52,0.2)] sm:rounded-[18px] sm:px-6 sm:p-6 ${className}`}
    >
      <div className="pointer-events-none absolute -bottom-16 -left-[118px] w-full">
        <Image
          src="/login-robot.png"
          alt="Workflow robot"
          width={420}
          height={420}
          priority
          className="object-contain drop-shadow-[0_14px_26px_rgba(0,0,0,0.22)]"
        />
      </div>

      <div className="pl-[122px] sm:pl-[170px]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60 sm:text-[11px]">
          {dateLabel}
        </p>
        <h1 className="mt-1 text-[24px] font-semibold leading-tight tracking-[-0.035em] text-white sm:text-4xl">
          {title}
        </h1>

        <div className="relative mt-2 h-[78px] max-w-lg overflow-hidden rounded-[18px] bg-white px-3 py-2 text-apple-charcoal shadow-[0_10px_22px_rgba(15,23,42,0.15)] sm:h-[82px] sm:px-4 sm:py-3">
          <span
            aria-hidden="true"
            className="absolute -left-1 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 bg-white"
          />
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700/80">
            Prody
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-apple-steel sm:text-sm">
            <RoleHintTypewriter messages={messages} />
          </p>
        </div>
      </div>
    </section>
  );
}

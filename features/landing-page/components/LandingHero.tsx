import Image from "next/image";
import Link from "next/link";
import {
  AppWindow,
  ArrowRight,
  CircleCheckBig,
  ShieldCheck,
  Workflow,
} from "lucide-react";

const heroBenefits = [
  { label: "Connected workflows", icon: Workflow },
  { label: "Built for every role", icon: CircleCheckBig },
  { label: "Role-based access", icon: ShieldCheck },
];

export default function LandingHero() {
  return (
    <section className="overflow-hidden bg-[#f8fbf9]">
      <div className="mx-auto grid max-w-[1320px] gap-12 px-5 pb-14 pt-16 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:px-10 lg:pb-20 lg:pt-20">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-emerald-800/15 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.17em] text-emerald-800">
            Construction operations, connected
          </p>
          <h1 className="max-w-[620px] text-balance text-[42px] font-bold leading-[1.02] tracking-[-0.055em] text-[#103d39] sm:text-[54px] lg:text-[64px]">
            Construction ERP built for real project operations
          </h1>
          <p className="mt-6 max-w-[590px] text-[17px] leading-8 text-slate-600">
            Prodisenyo ProBuild connects project assignment, BOQ, procurement,
            materials, progress, attendance, payroll, and costs so every team
            works from the same project truth.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#075f55] px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_26px_rgba(7,95,85,0.2)] transition-colors hover:bg-[#064d46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-4"
            >
              Sign In to ProBuild
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="#modules"
              className="inline-flex items-center justify-center rounded-lg border border-emerald-800/25 bg-white px-6 py-3.5 text-sm font-bold text-emerald-900 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-4"
            >
              Explore Modules
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            {heroBenefits.map(({ label, icon: Icon }) => (
              <li
                key={label}
                className="flex items-center gap-2 text-xs font-semibold text-slate-600"
              >
                <Icon className="h-4 w-4 text-emerald-700" strokeWidth={1.8} />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-[22px] border border-emerald-950/10 bg-white p-2 shadow-[0_28px_70px_rgba(14,61,55,0.15)] sm:p-3">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5 sm:px-4">
              <AppWindow
                className="h-4 w-4 text-emerald-700"
                strokeWidth={1.7}
                aria-hidden="true"
              />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                CEO project command center
              </span>
            </div>
            <Image
              src="/landing/ceo-dashboard.png"
              alt="Prodisenyo ProBuild executive dashboard showing projects, approvals, budgets, and progress"
              width={1672}
              height={941}
              priority
              sizes="(min-width: 1024px) 58vw, 94vw"
              className="h-auto w-full rounded-b-[14px]"
            />
          </div>
          <div className="absolute -bottom-5 left-5 hidden rounded-xl border border-emerald-950/10 bg-white px-4 py-3 shadow-[0_14px_34px_rgba(14,61,55,0.16)] sm:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
              One connected system
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              From estimate to project close
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1320px] px-5 pb-16 sm:px-8 lg:px-10">
        <div className="grid overflow-hidden rounded-2xl border border-emerald-950/10 bg-white sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Project control", "Assignments, schedules, progress"],
            ["Estimate to buy", "BOQ, approvals, procurement"],
            ["Payroll ready", "Attendance through approval"],
            ["Budget visibility", "Committed and actual costs"],
          ].map(([title, description], index) => (
            <div
              key={title}
              className={[
                "px-6 py-5",
                index > 0 ? "border-t border-emerald-950/10 sm:border-l sm:border-t-0" : "",
                index === 2 ? "sm:border-l-0 lg:border-l" : "",
              ].join(" ")}
            >
              <p className="text-sm font-bold text-[#103d39]">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

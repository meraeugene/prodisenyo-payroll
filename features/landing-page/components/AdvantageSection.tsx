import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const advantages = [
  "One project record across estimates, requests, purchases, costs, and progress",
  "Approval status visible to the people waiting on each decision",
  "Actual supplier and receipt information connected to material requests",
  "Separate overall progress and weighted activity tracking",
  "Role-based access for CEO, engineers, purchasers, and payroll managers",
];

export default function AdvantageSection() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:px-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
            The ProBuild advantage
          </p>
          <h2 className="mt-4 text-balance text-3xl font-bold leading-tight tracking-[-0.04em] text-[#103d39] sm:text-[42px]">
            End-to-end control without losing the project story
          </h2>
          <p className="mt-5 text-[15px] leading-7 text-slate-600">
            ProBuild replaces disconnected handoffs with one traceable workflow,
            while keeping each role focused on the work they actually own.
          </p>
          <ul className="mt-7 space-y-4">
            {advantages.map((advantage) => (
              <li
                key={advantage}
                className="flex items-start gap-3 text-sm leading-6 text-slate-700"
              >
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                  strokeWidth={2}
                />
                {advantage}
              </li>
            ))}
          </ul>
          <Link
            href="/auth/login"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#075f55] px-5 py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-4"
          >
            Sign In
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-emerald-950/10 bg-[#eef5f1] p-4 shadow-[0_24px_60px_rgba(14,61,55,0.12)] sm:p-7">
          <Image
            src="/landing/materials.png"
            alt="Project materials workflow showing request status and tracking"
            width={1672}
            height={941}
            sizes="(min-width: 1024px) 58vw, 94vw"
            className="h-auto w-full rounded-xl border border-emerald-950/10"
          />
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";

export default function LandingCta() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="flex flex-col gap-8 rounded-[24px] bg-[#075f55] px-7 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
              Ready to work from one project system?
            </p>
            <h2 className="mt-3 max-w-[720px] text-3xl font-bold tracking-[-0.04em] text-white sm:text-[40px]">
              Bring planning, purchasing, progress, payroll, and costs together.
            </h2>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3.5 text-sm font-bold text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-emerald-800"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Sign In
            </Link>
            <a
              href="#product-tour"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/35 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-emerald-800"
            >
              Explore the product
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

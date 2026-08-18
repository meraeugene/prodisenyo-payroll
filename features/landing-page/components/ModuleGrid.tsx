import LandingIcon from "@/features/landing-page/components/LandingIcon";
import LandingSectionHeading from "@/features/landing-page/components/LandingSectionHeading";
import { landingModules } from "@/features/landing-page/utils/landingContent";

export default function ModuleGrid() {
  return (
    <section id="modules" className="scroll-mt-24 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-10">
        <LandingSectionHeading
          eyebrow="Core modules"
          title="One platform across the project lifecycle"
          description="Every module follows the same approval chain and project context, so teams do not lose decisions between spreadsheets, chat threads, and separate tools."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {landingModules.map((module) => (
            <article
              key={module.title}
              className="group rounded-2xl border border-emerald-950/10 bg-[#fbfdfc] p-6 transition-transform duration-200 hover:-translate-y-1 hover:border-emerald-700/25 hover:shadow-[0_18px_40px_rgba(14,61,55,0.08)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <LandingIcon name={module.icon} className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold tracking-[-0.025em] text-[#103d39]">
                {module.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {module.description}
              </p>
              <a
                href="#product-tour"
                className="mt-5 inline-flex text-xs font-bold text-emerald-700 transition-colors hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-4"
              >
                View in product tour
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

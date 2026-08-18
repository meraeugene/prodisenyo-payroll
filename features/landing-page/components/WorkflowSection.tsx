import { ArrowRight } from "lucide-react";
import LandingIcon from "@/features/landing-page/components/LandingIcon";
import LandingSectionHeading from "@/features/landing-page/components/LandingSectionHeading";
import { landingWorkflow } from "@/features/landing-page/utils/landingContent";

export default function WorkflowSection() {
  return (
    <section
      id="workflow"
      className="scroll-mt-24 border-y border-emerald-950/10 bg-[#f4f8f6] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-10">
        <LandingSectionHeading
          eyebrow="How ProBuild works"
          title="A connected workflow from assignment to close"
          description="The system moves real project information forward through controlled roles, reviews, and approvals."
        />

        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:gap-2">
          {landingWorkflow.map((step, index) => (
            <li key={step.label} className="relative">
              <article className="h-full rounded-2xl border border-emerald-950/10 bg-white px-5 py-6 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-700/20 bg-emerald-50 text-emerald-800">
                  <LandingIcon name={step.icon} className="h-5 w-5" />
                </span>
                <p className="mt-4 text-sm font-bold text-[#103d39]">
                  {index + 1}. {step.label}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {step.description}
                </p>
              </article>
              {index < landingWorkflow.length - 1 ? (
                <ArrowRight
                  className="absolute -right-3 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-emerald-700 lg:block"
                  aria-hidden="true"
                />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

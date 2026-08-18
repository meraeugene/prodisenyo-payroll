import { Eye, Link2, ShieldCheck } from "lucide-react";
import LandingSectionHeading from "@/features/landing-page/components/LandingSectionHeading";

const trustPoints = [
  {
    title: "Traceable approvals",
    description:
      "Estimate, material, payroll, and overtime decisions keep their current status and correction context visible.",
    icon: ShieldCheck,
  },
  {
    title: "Connected project records",
    description:
      "Requests, purchases, receipts, costs, and progress stay linked to the project that created them.",
    icon: Link2,
  },
  {
    title: "Role-focused visibility",
    description:
      "Each user sees the dashboards, projects, and actions that match their responsibility.",
    icon: Eye,
  },
];

export default function TrustSection() {
  return (
    <section className="border-y border-emerald-950/10 bg-[#f6f9f7] py-20 sm:py-24">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
        <LandingSectionHeading
          eyebrow="Built for accountable operations"
          title="Clear ownership at every project handoff"
          description="ProBuild helps teams understand what is approved, what is waiting, who owns the next action, and how that decision affects the project."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {trustPoints.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="rounded-2xl border border-emerald-950/10 bg-white p-7"
            >
              <Icon className="h-7 w-7 text-emerald-700" strokeWidth={1.6} />
              <h3 className="mt-5 text-lg font-bold text-[#103d39]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

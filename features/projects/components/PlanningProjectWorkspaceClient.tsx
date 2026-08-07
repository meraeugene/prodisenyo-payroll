"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  LoaderCircle,
  LockKeyhole,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";
import { activateProjectAfterEstimateAction } from "@/actions/estimateProcurement";
import EstimateReviewsPageClient from "@/features/cost-estimator/components/EstimateReviewsPageClient";
import type {
  ProjectEstimateItemRow,
  ReviewProjectEstimateRow,
} from "@/features/cost-estimator/types";
import type { EngineerOption, ProjectRecord } from "@/features/projects/types";
import ProjectWorkspaceHeader from "./ProjectWorkspaceHeader";

export default function PlanningProjectWorkspaceClient({
  project,
  engineers,
  estimates,
  estimateItems,
}: {
  project: ProjectRecord;
  engineers: EngineerOption[];
  estimates: ReviewProjectEstimateRow[];
  estimateItems: ProjectEstimateItemRow[];
}) {
  const router = useRouter();
  const [approved, setApproved] = useState(
    Boolean(project.activeApprovedEstimateId) ||
      estimates.some((estimate) => estimate.status === "approved"),
  );
  const [engineerId, setEngineerId] = useState(
    project.assignedEngineerId || project.assignedEstimateEngineerId || "",
  );
  const [isActivating, startActivation] = useTransition();

  function activateProject() {
    if (!approved) {
      toast.error("Approve the cost estimate before activating this project.");
      return;
    }
    if (!engineerId) {
      toast.error("Select the project engineer or manager.");
      return;
    }

    startActivation(async () => {
      try {
        await activateProjectAfterEstimateAction({ projectId: project.id, engineerId });
        toast.success("Project activated. The full project workspace is now available.");
        router.replace(`/projects/${project.id}`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to activate project.");
      }
    });
  }

  return (
    <div className="min-h-full space-y-5 bg-slate-50/40 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="sticky top-0 z-40 -mx-4 -mt-5 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:-mt-7 lg:px-8">
        <Link href="/projects" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2">
          <ArrowLeft size={15} /> Back to Projects
        </Link>
      </div>

      <ProjectWorkspaceHeader project={project} />

      <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 shrink-0 text-amber-700" size={20} />
          <div>
            <h2 className="font-bold text-amber-950">Operational project workspace is locked</h2>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              This record is still pending cost estimation. Progress, materials, documents, purchasing, and cost tracking unlock only after estimate approval and explicit project activation.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3" aria-label="Project activation steps">
        <StepCard number="1" label="Engineer prepares and submits the cost estimate" complete={estimates.some((estimate) => estimate.status !== "draft")} />
        <StepCard number="2" label="CEO reviews, edits, and approves the estimate" complete={approved} />
        <StepCard number="3" label="CEO confirms the final project assignment" complete={false} active={approved} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,.04)]">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Cost estimate gate</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Estimate review</h2>
          <p className="mt-1 text-sm text-slate-500">Only the estimate workflow is available while this project is pending.</p>
        </div>
        <EstimateReviewsPageClient
          estimates={estimates}
          items={estimateItems}
          embedded
          projectId={project.id}
          onEstimateApproved={() => setApproved(true)}
        />
      </section>

      <section className={`rounded-2xl border bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,.04)] ${approved ? "border-emerald-200" : "border-slate-200"}`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700"><UserRoundCheck size={15} /> Final assignment</p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Activate Project &amp; Confirm Assignment</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Activation changes this pending record into an active project and makes the approved estimate its budget and planned-material baseline.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-[minmax(220px,1fr)_auto] lg:max-w-xl">
            <label className="text-xs font-semibold text-slate-700">
              Project engineer / manager
              <select value={engineerId} onChange={(event) => setEngineerId(event.target.value)} disabled={!approved || isActivating} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400">
                <option value="">Select engineer</option>
                {engineers.map((engineer) => <option key={engineer.id} value={engineer.id}>{engineer.name}</option>)}
              </select>
            </label>
            <button type="button" onClick={activateProject} disabled={!approved || !engineerId || isActivating} className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300">
              {isActivating ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {isActivating ? "Activating..." : "Activate Project"}
            </button>
          </div>
        </div>
        {!approved ? <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">This action becomes available after the CEO approves the submitted estimate.</p> : null}
      </section>
    </div>
  );
}

function StepCard({
  number,
  label,
  complete,
  active = false,
}: {
  number: string;
  label: string;
  complete: boolean;
  active?: boolean;
}) {
  return (
    <article className={`flex items-start gap-3 rounded-2xl border bg-white p-4 ${complete ? "border-emerald-200" : active ? "border-amber-200" : "border-slate-200"}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${complete ? "bg-emerald-100 text-emerald-800" : active ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>
        {complete ? <CheckCircle2 size={18} /> : <CircleDashed size={18} />}
      </div>
      <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Step {number}</p><p className="mt-1 text-sm font-semibold leading-5 text-slate-800">{label}</p></div>
    </article>
  );
}

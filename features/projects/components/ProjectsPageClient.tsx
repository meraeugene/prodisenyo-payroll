"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, X } from "lucide-react";
import { toast } from "sonner";
import RoleGreetingHero from "@/features/home/components/RoleGreetingHero";
import ProjectPortfolioCard from "./ProjectPortfolioCard";
import { createProjectAction } from "@/actions/projects";
import type { EngineerOption, ProjectRecord } from "../types";

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1600&h=900&q=88";

export default function ProjectsPageClient({ role, fullName, projects, engineers }: {
  role: "ceo" | "engineer"; fullName: string | null; projects: ProjectRecord[]; engineers: EngineerOption[];
}) {
  const router = useRouter(); const [showCreate, setShowCreate] = useState(false); const [pending, startTransition] = useTransition();
  const totalBudget = projects.reduce((sum, project) => sum + project.budget, 0);
  const totalSpent = projects.reduce((sum, project) => sum + project.spent, 0);
  const money = (value: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value);

  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        await createProjectAction({
          name: String(formData.get("name") || ""), location: String(formData.get("location") || ""),
          subject: String(formData.get("subject") || ""), lead: String(formData.get("lead") || ""),
          engineerId: String(formData.get("engineerId") || "") || null, budget: Number(formData.get("budget")),
          startDate: String(formData.get("startDate") || ""), endDate: String(formData.get("endDate") || ""), imageUrl: DEFAULT_IMAGE,
        });
        toast.success("Project and budget workspace created."); setShowCreate(false); router.refresh();
      } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to create project."); }
    });
  }

  return <div className="space-y-5">
    <RoleGreetingHero dateLabel={new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Manila" }).format(new Date()).toUpperCase()} title={`Welcome, ${fullName?.split(" ")[0] || (role === "ceo" ? "CEO" : "Engineer")}!`} messages={[role === "ceo" ? "Create projects, set budget ceilings, and review every project workspace." : "Open an assigned project to update engineering progress and requests."]} />
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 pb-4">
      <div><h1 className="text-xl font-bold text-slate-950">Project Portfolio</h1><p className="text-sm text-slate-500">All work starts from one database-backed project workspace.</p></div>
      {role === "ceo" ? <button onClick={() => setShowCreate(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white hover:bg-emerald-900"><Plus size={17}/>Create New Project</button> : null}
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Summary label="Total portfolio budget" value={money(totalBudget)} />
      <Summary label="Actual spent to date" value={money(totalSpent)} />
    </div>
    {projects.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{projects.map((project) => <ProjectPortfolioCard key={project.id} project={project} role={role} imageSrc={project.imageUrl || DEFAULT_IMAGE} formatCurrency={money} isOverBudget={(item) => item.spent > item.budget} onOpen={() => router.push(`/projects/${project.id}`)} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><p className="font-semibold text-slate-800">No projects yet</p><p className="mt-1 text-sm text-slate-500">{role === "ceo" ? "Create the first project to initialize its budget workspace." : "Projects assigned to you will appear here."}</p></div>}
    {showCreate ? <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-4"><div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">Create project</h2><button onClick={() => setShowCreate(false)} aria-label="Close"><X/></button></div><form action={submit} className="grid gap-4 sm:grid-cols-2">
      <Field name="name" label="Project name"/><Field name="location" label="Location"/><Field name="subject" label="Subject"/><Field name="lead" label="Project lead"/>
      <label className="text-sm font-semibold text-slate-700">Assigned engineer<select name="engineerId" required className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3"><option value="">Select engineer</option>{engineers.map((engineer) => <option key={engineer.id} value={engineer.id}>{engineer.name}</option>)}</select></label>
      <Field name="budget" label="Budget ceiling (PHP)" type="number"/><Field name="startDate" label="Start date" type="date"/><Field name="endDate" label="End date" type="date"/>
      <div className="flex justify-end gap-3 border-t pt-4 sm:col-span-2"><button type="button" onClick={() => setShowCreate(false)} className="h-11 rounded-xl border px-4">Cancel</button><button disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-800 px-5 font-semibold text-white disabled:opacity-60">{pending ? <LoaderCircle className="animate-spin" size={16}/> : <Plus size={16}/>}Create project</button></div>
    </form></div></div> : null}
  </div>;
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-emerald-100 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p></div>; }
function Field({ name, label, type = "text" }: { name: string; label: string; type?: string }) { return <label className="text-sm font-semibold text-slate-700">{label}<input name={name} type={type} min={type === "number" ? 1 : undefined} step={type === "number" ? "0.01" : undefined} required className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-700"/></label>; }

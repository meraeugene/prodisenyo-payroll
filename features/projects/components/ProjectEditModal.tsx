"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Save, X } from "lucide-react";
import type { ProjectRecord } from "@/features/projects/types";

const ASSIGNEES = [
  { value: "Engineer User", label: "Engineer User (Assigned to Me)" },
  { value: "Engr. Mark Santos", label: "Engr. Mark Santos" },
  { value: "Engr. Jane Doe", label: "Engr. Jane Doe" },
  { value: "Engr. Sarah Lee", label: "Engr. Sarah Lee (Project Manager)" },
] as const;

function formatBudget(value: number) {
  return value > 0 ? value.toLocaleString("en-US") : "";
}

export default function ProjectEditModal({
  project,
  onClose,
  onSave,
}: {
  project: ProjectRecord;
  onClose: () => void;
  onSave: (project: ProjectRecord) => void;
}) {
  const [name, setName] = useState(project.name);
  const [location, setLocation] = useState(project.location);
  const [subject, setSubject] = useState(project.subject || project.client || "");
  const [lead, setLead] = useState(project.lead || project.manager || "");
  const [budget, setBudget] = useState(formatBudget(project.budget));
  const [startDate, setStartDate] = useState(project.startDate);
  const [endDate, setEndDate] = useState(project.endDate);
  const [assignee, setAssignee] = useState(project.engineer);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedBudget = Number(budget.replace(/,/g, ""));
    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) return;

    onSave({
      ...project,
      name: name.trim(),
      location: location.trim(),
      client: "",
      subject: subject.trim(),
      lead: lead.trim(),
      budget: parsedBudget,
      startDate,
      endDate,
      manager: assignee,
      engineer: assignee,
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex h-[100dvh] w-full items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-[2px]">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-apple-mist bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-lg font-bold text-apple-charcoal">Edit Project</h3>
          <button type="button" onClick={onClose} aria-label="Close edit project" className="flex h-8 w-8 items-center justify-center rounded-lg border border-apple-mist text-apple-smoke hover:bg-apple-mist/50">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Project Name" value={name} onChange={setName} required />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Location" value={location} onChange={setLocation} required />
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">
              Assign Engineer/Manager <span className="text-rose-500">*</span>
              <select value={assignee} onChange={(event) => setAssignee(event.target.value)} className="h-11 w-full rounded-xl border border-apple-mist bg-white px-3 text-sm font-normal text-apple-charcoal outline-none focus:border-[#1f6a37]">
                {ASSIGNEES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Subject" value={subject} onChange={setSubject} required />
            <Field label="Lead" value={lead} onChange={setLead} required />
          </div>

          <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
            Total Budget (PHP) <span className="text-rose-500">*</span>
            <input type="text" inputMode="numeric" required value={budget} onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, "");
              setBudget(digits ? Number(digits).toLocaleString("en-US") : "");
            }} className="h-11 w-full rounded-xl border border-apple-mist bg-white px-3 text-sm font-normal text-apple-charcoal outline-none focus:border-[#1f6a37]" />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <DateField label="Start Date" value={startDate} onChange={setStartDate} />
            <DateField label="End Date" value={endDate} onChange={setEndDate} />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
            <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#1f6a37] px-5 text-sm font-semibold text-white hover:bg-emerald-800"><Save size={15} />Save Changes</button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function Field({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="block space-y-1.5 text-sm font-semibold text-slate-700">{label} {required ? <span className="text-rose-500">*</span> : null}<input type="text" required={required} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-apple-mist bg-white px-3 text-sm font-normal text-apple-charcoal outline-none focus:border-[#1f6a37]" /></label>;
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block space-y-1.5 text-sm font-semibold text-slate-700">{label} <span className="text-rose-500">*</span><input type="date" required value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-apple-mist bg-white px-3 text-sm font-normal text-apple-charcoal outline-none focus:border-[#1f6a37]" /></label>;
}

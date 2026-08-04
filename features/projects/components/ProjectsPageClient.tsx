"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, X } from "lucide-react";
import { toast } from "sonner";
import CeoProjectsOverview from "./CeoProjectsOverview";
import ProjectPortfolioCard from "./ProjectPortfolioCard";
import ProjectPortfolioOverview from "./ProjectPortfolioOverview";
import { createProjectAction } from "@/actions/projects";
import type { EngineerOption, ProjectRecord } from "../types";

type ProjectField =
  | "name"
  | "location"
  | "subject"
  | "lead"
  | "engineerId"
  | "estimateEngineerId"
  | "imageUrl"
  | "budget"
  | "startDate"
  | "endDate";

type FormErrors = Partial<Record<ProjectField, string>>;

export default function ProjectsPageClient({
  role,
  projects,
  engineers,
}: {
  role: "ceo" | "engineer";
  fullName: string | null;
  projects: ProjectRecord[];
  engineers: EngineerOption[];
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [budgetValue, setBudgetValue] = useState("");
  const [pending, startTransition] = useTransition();
  const totalBudget = projects.reduce(
    (sum, project) => sum + project.budget,
    0,
  );
  const totalSpent = projects.reduce((sum, project) => sum + project.spent, 0);
  const money = (value: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(value);
  const clearFieldError = (field: ProjectField) =>
    setFormErrors((current) => ({ ...current, [field]: undefined }));

  useEffect(() => {
    if (!showCreate) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowCreate(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [showCreate]);

  function submit(formData: FormData) {
    const values = {
      name: String(formData.get("name") || "").trim(),
      location: String(formData.get("location") || "").trim(),
      subject: String(formData.get("subject") || "").trim(),
      lead: String(formData.get("lead") || "").trim(),
      engineerId: String(formData.get("engineerId") || ""),
      estimateEngineerId: String(formData.get("estimateEngineerId") || ""),
      imageUrl: String(formData.get("imageUrl") || "").trim(),
      budget: Number(budgetValue.replaceAll(",", "")),
      startDate: String(formData.get("startDate") || ""),
      endDate: String(formData.get("endDate") || ""),
    };
    const errors: FormErrors = {};

    if (!values.name) errors.name = "Project name is required.";
    if (!values.location) errors.location = "Location is required.";
    if (!values.subject) errors.subject = "Subject is required.";
    if (!values.lead) errors.lead = "Project lead is required.";
    if (!values.engineerId) errors.engineerId = "Select a site engineer.";
    if (!values.estimateEngineerId) {
      errors.estimateEngineerId = "Select a cost estimate engineer.";
    }
    if (!values.imageUrl) errors.imageUrl = "Project image URL is required.";
    if (!budgetValue || !Number.isFinite(values.budget) || values.budget <= 0) {
      errors.budget = "Enter a budget greater than zero.";
    }
    if (!values.startDate) errors.startDate = "Start date is required.";
    if (!values.endDate) errors.endDate = "End date is required.";
    if (
      values.startDate &&
      values.endDate &&
      values.endDate < values.startDate
    ) {
      errors.endDate = "End date cannot be before the start date.";
    }

    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    startTransition(async () => {
      try {
        await createProjectAction({
          ...values,
          engineerId: values.engineerId || null,
          estimateEngineerId: values.estimateEngineerId || values.engineerId || null,
        });
        toast.success("Project and budget workspace created.");
        setShowCreate(false);
        setBudgetValue("");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create project.",
        );
      }
    });
  }

  return (
    <div className="space-y-4 p-0 sm:p-6">
      {role === "ceo" ? (
        <CeoProjectsOverview
          projects={projects}
          onCreateProject={() => {
            setFormErrors({});
            setBudgetValue("");
            setShowCreate(true);
          }}
          onOpenProject={(projectId) => router.push("/projects/" + projectId)}
        />
      ) : (
        <>
          <ProjectPortfolioOverview
            role={role}
            totalBudget={money(totalBudget)}
            totalSpent={money(totalSpent)}
            onCreateProject={() => undefined}
          />
          {projects.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <ProjectPortfolioCard
                  key={project.id}
                  project={project}
                  role={role}
                  imageSrc={project.imageUrl}
                  formatCurrency={money}
                  isOverBudget={(item) => item.spent > item.budget}
                  onOpen={() => router.push("/projects/" + project.id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <p className="font-semibold text-slate-800">No projects yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Projects assigned to you will appear here.
              </p>
            </div>
          )}
        </>
      )}
      {showCreate && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex h-[100dvh] w-screen items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/65 px-4 py-6 sm:p-8"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setShowCreate(false);
              }}
            >
              <form
                action={submit}
                noValidate
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-project-title"
                className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                      Construction workflow
                    </p>
                    <h2 id="create-project-title" className="mt-1 text-xl font-bold text-slate-950">
                      Create project
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                    aria-label="Close create project form"
                  >
                    <X size={21} />
                  </button>
                </div>

                <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-2 sm:px-6">
                  <Field name="name" label="Project name" error={formErrors.name} onChange={() => clearFieldError("name")} />
                  <Field name="location" label="Location" error={formErrors.location} onChange={() => clearFieldError("location")} />
                  <Field name="subject" label="Subject" error={formErrors.subject} onChange={() => clearFieldError("subject")} />
                  <Field name="lead" label="Project lead" error={formErrors.lead} onChange={() => clearFieldError("lead")} />
                  <Field name="imageUrl" label="Project image URL" error={formErrors.imageUrl} onChange={() => clearFieldError("imageUrl")} />
                  <label className="text-sm font-semibold text-slate-700">
                    Site engineer
                    <select
                      name="engineerId"
                      aria-invalid={Boolean(formErrors.engineerId)}
                      onChange={() => clearFieldError("engineerId")}
                      className={`mt-1 h-11 w-full rounded-xl border bg-white px-3 outline-none ${
                        formErrors.engineerId
                          ? "border-red-500 focus:border-red-600"
                          : "border-slate-200 focus:border-emerald-700"
                      }`}
                    >
                      <option value="">Select site engineer</option>
                      {engineers.map((engineer) => (
                        <option key={engineer.id} value={engineer.id}>
                          {engineer.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.engineerId ? (
                      <span className="mt-1 block text-xs font-medium text-red-600">
                        {formErrors.engineerId}
                      </span>
                    ) : null}
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Cost estimate engineer
                    <select
                      name="estimateEngineerId"
                      aria-invalid={Boolean(formErrors.estimateEngineerId)}
                      onChange={() => clearFieldError("estimateEngineerId")}
                      className={`mt-1 h-11 w-full rounded-xl border bg-white px-3 outline-none transition ${
                        formErrors.estimateEngineerId
                          ? "border-red-500 focus:border-red-600"
                          : "border-slate-200 focus:border-emerald-700"
                      }`}
                    >
                      <option value="">Select estimate engineer</option>
                      {engineers.map((engineer) => (
                        <option key={engineer.id} value={engineer.id}>
                          {engineer.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.estimateEngineerId ? (
                      <span className="mt-1 block text-xs font-medium text-red-600">
                        {formErrors.estimateEngineerId}
                      </span>
                    ) : null}
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Budget ceiling (PHP)
                    <input
                      name="budgetDisplay"
                      type="text"
                      inputMode="decimal"
                      value={budgetValue}
                      aria-invalid={Boolean(formErrors.budget)}
                      onChange={(event) => {
                        setBudgetValue(formatBudgetInput(event.target.value));
                        clearFieldError("budget");
                      }}
                      placeholder="0.00"
                      className={`mt-1 h-11 w-full rounded-xl border px-3 font-normal outline-none ${
                        formErrors.budget
                          ? "border-red-500 focus:border-red-600"
                          : "border-slate-200 focus:border-emerald-700"
                      }`}
                    />
                    {formErrors.budget ? (
                      <span className="mt-1 block text-xs font-medium text-red-600">
                        {formErrors.budget}
                      </span>
                    ) : null}
                  </label>
                  <Field name="startDate" label="Start date" type="date" error={formErrors.startDate} onChange={() => clearFieldError("startDate")} />
                  <Field name="endDate" label="End date" type="date" error={formErrors.endDate} onChange={() => clearFieldError("endDate")} />
                </div>

                <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={pending}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(6,95,70,0.18)] hover:bg-emerald-900 disabled:opacity-60"
                  >
                    {pending ? (
                      <LoaderCircle className="animate-spin" size={16} />
                    ) : (
                      <Plus size={16} />
                    )}
                    Create project
                  </button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  error,
  onChange,
}: {
  name: ProjectField;
  label: string;
  type?: string;
  error?: string;
  onChange?: () => void;
}) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        aria-invalid={Boolean(error)}
        onChange={onChange}
        className={`mt-1 h-11 w-full rounded-xl border px-3 font-normal outline-none transition ${
          error
            ? "border-red-500 focus:border-red-600"
            : "border-slate-200 focus:border-emerald-700"
        }`}
      />
      {error ? (
        <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>
      ) : null}
    </label>
  );
}

function formatBudgetInput(value: string) {
  const normalized = value.replaceAll(",", "").replace(/[^\d.]/g, "");
  const [whole = "", ...decimalParts] = normalized.split(".");
  const decimal = decimalParts.join("").slice(0, 2);
  const formattedWhole = whole.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return normalized.includes(".") ? `${formattedWhole || "0"}.${decimal}` : formattedWhole;
}

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import ButtonLoader from "@/features/budget-tracker/components/ButtonLoader";
import {
  BUDGET_PROJECT_TYPE_OPTIONS,
  type BudgetProjectFormInput,
  type BudgetProjectRow,
} from "@/features/budget-tracker/types";
import type { BudgetProjectType } from "@/types/database";

type SetupFormErrors = {
  name?: string;
  projectType?: string;
  startingBudget?: string;
};

function parseBudgetValue(value: string) {
  const parsed = Number((value ?? "").replace(/,/g, ""));
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function fieldClass(hasError: boolean, withPrefix = false) {
  const base = withPrefix
    ? "w-full rounded-[10px] px-9 py-3 text-sm outline-none"
    : "mt-2 w-full rounded-[10px] px-4 py-3 text-sm outline-none";
  return `${base} transition focus:border-[#1f6a37] ${
    hasError
      ? "border border-red-500 bg-white"
      : "border border-apple-mist bg-[rgb(var(--apple-snow))]"
  }`;
}

export default function BudgetTrackerSetupForm({
  projects,
  projectForm,
  projectBudgetInput,
  projectError,
  isPending,
  pendingAction,
  onBack,
  onSubmit,
  onProjectFormChange,
  onProjectBudgetChange,
}: {
  projects: BudgetProjectRow[];
  projectForm: BudgetProjectFormInput;
  projectBudgetInput: string;
  projectError: string | null;
  isPending: boolean;
  pendingAction: "project" | "item" | "delete-project" | "delete-item" | null;
  onBack: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onProjectFormChange: (
    updater: (current: BudgetProjectFormInput) => BudgetProjectFormInput,
  ) => void;
  onProjectBudgetChange: (value: string) => void;
}) {
  const [fieldErrors, setFieldErrors] = useState<SetupFormErrors>({});

  function validateForm() {
    const errors: SetupFormErrors = {};
    const projectName = projectForm.name.trim();
    const projectType = projectForm.projectType;
    const startingBudget = parseBudgetValue(projectBudgetInput);

    if (!projectName) errors.name = "Project name is required.";
    if (!projectType) errors.projectType = "Project type is required.";
    if (!Number.isFinite(startingBudget) || startingBudget <= 0) {
      errors.startingBudget = "Starting budget must be greater than zero.";
    }

    return {
      errors,
      hasErrors: Object.keys(errors).length > 0,
    };
  }

  function handleValidatedSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateForm();
    if (validation.hasErrors) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});
    onSubmit(event);
  }

  return (
    <section className="flex min-h-[calc(100vh-3rem)] w-full items-start justify-center px-4 pt-6 sm:items-center sm:pt-0">
      <div className="w-full max-w-lg rounded-2xl border border-apple-mist bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        {projects.length > 0 ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-apple-steel transition hover:text-apple-charcoal"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        ) : null}

        <div className="mt-5 sm:mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
            Budget tracker
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-apple-charcoal">
            Set up your project budget
          </h2>
          <p className="mt-2 text-sm leading-6 text-apple-steel">
            Track estimated and actual costs for a project workspace.
          </p>
        </div>

        <form
          noValidate
          onSubmit={handleValidatedSubmit}
          className="mt-6 space-y-5 sm:mt-8 sm:space-y-6"
        >
          <div>
            <label className="text-sm font-semibold text-apple-charcoal">
              Project name <span className="text-rose-500">*</span>
            </label>
            <input
              value={projectForm.name}
              aria-invalid={Boolean(fieldErrors.name)}
              onChange={(event) => {
                onProjectFormChange((current) => ({
                  ...current,
                  name: event.target.value,
                }));
                setFieldErrors((current) => ({ ...current, name: undefined }));
              }}
              placeholder="e.g. Dream Home, Kitchen Renovation"
              className={fieldClass(Boolean(fieldErrors.name))}
            />
            {fieldErrors.name ? (
              <p className="mt-2 text-sm text-rose-600">{fieldErrors.name}</p>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-semibold text-apple-charcoal">
              Project type <span className="text-rose-500">*</span>
            </label>
            <select
              value={projectForm.projectType}
              aria-invalid={Boolean(fieldErrors.projectType)}
              onChange={(event) => {
                onProjectFormChange((current) => ({
                  ...current,
                  projectType: event.target.value as BudgetProjectType | "",
                }));
                setFieldErrors((current) => ({
                  ...current,
                  projectType: undefined,
                }));
              }}
              className={`mt-2 w-full rounded-[10px] px-4 py-3 text-sm outline-none transition focus:border-[#1f6a37] ${
                fieldErrors.projectType
                  ? "border border-red-500 bg-white"
                  : "border border-apple-mist bg-white"
              }`}
            >
              <option value="">Select a type</option>
              {BUDGET_PROJECT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldErrors.projectType ? (
              <p className="mt-2 text-sm text-rose-600">
                {fieldErrors.projectType}
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-semibold text-apple-charcoal">
              Currency <span className="text-rose-500">*</span>
            </label>
            <input
              value="Philippine Peso (PHP)"
              readOnly
              className="mt-2 w-full rounded-[10px] border border-apple-mist bg-[rgb(var(--apple-snow))] px-4 py-3 text-sm text-apple-charcoal outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-apple-charcoal">
              Starting budget <span className="text-rose-500">*</span>
            </label>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-apple-steel">
                PHP
              </span>
              <input
                value={projectBudgetInput}
                aria-invalid={Boolean(fieldErrors.startingBudget)}
                onChange={(event) => {
                  onProjectBudgetChange(event.target.value);
                  setFieldErrors((current) => ({
                    ...current,
                    startingBudget: undefined,
                  }));
                }}
                placeholder="2,500,000"
                inputMode="decimal"
                className={fieldClass(Boolean(fieldErrors.startingBudget), true)}
              />
            </div>
            {fieldErrors.startingBudget ? (
              <p className="mt-2 text-sm text-rose-600">
                {fieldErrors.startingBudget}
              </p>
            ) : null}
          </div>

          {projectError ? (
            <p className="rounded-[10px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {projectError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex w-full items-center justify-center rounded-[10px] bg-[#1f6a37] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(6,95,70,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingAction === "project" ? (
              <ButtonLoader label="Starting tracking costs" />
            ) : (
              <span>Start tracking costs</span>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

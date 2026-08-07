"use client";

import { useMemo, useState, useTransition } from "react";
import { ClipboardPlus, LoaderCircle, Send } from "lucide-react";
import { toast } from "sonner";
import DashboardPageHero from "@/components/DashboardPageHero";
import { createMaterialRequestAction } from "@/actions/materialRequests";
import type { PlannedMaterialRow } from "@/features/material-requests/utils/plannedMaterials";
import type {
  CreateMaterialRequestInput,
  MaterialRequestPriority,
  MaterialRequestRecord,
} from "@/features/material-requests/types";

const PRIORITY_OPTIONS: Array<{
  value: MaterialRequestPriority;
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const EMPTY_FORM: CreateMaterialRequestInput = {
  projectId: "",
  projectName: "",
  materialName: "",
  quantity: 1,
  unit: "pcs",
  neededBy: "",
  site: "",
  priority: "medium",
  notes: "",
};

type MaterialFormErrors = Partial<
  Record<keyof CreateMaterialRequestInput, string>
>;

function inputClass(hasError: boolean) {
  return `h-11 rounded-xl w-full border px-3 text-sm text-apple-charcoal outline-none transition focus:border-[#1f6a37] ${
    hasError
      ? "border-rose-400 ring-1 ring-rose-200"
      : "border-apple-mist bg-white"
  }`;
}

function priorityBadgeClass(priority: MaterialRequestPriority) {
  if (priority === "urgent") return "border-rose-200 bg-rose-50 text-rose-700";
  if (priority === "high") return "border-amber-200 bg-amber-50 text-amber-700";
  if (priority === "medium") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function MaterialRequestPageClient({
  initialRequests,
  projects,
  defaultProjectId,
  plannedMaterial,
}: {
  initialRequests: MaterialRequestRecord[];
  projects: Array<{ id: string; name: string }>;
  defaultProjectId?: string;
  plannedMaterial?: PlannedMaterialRow | null;
}) {
  const defaultProject = projects.find((project) => project.id === defaultProjectId);
  const [form, setForm] = useState<CreateMaterialRequestInput>({
    ...EMPTY_FORM,
    projectId: defaultProject?.id ?? "",
    projectName: defaultProject?.name ?? "",
    estimateItemId: plannedMaterial?.estimateItemId,
    materialName: plannedMaterial?.materialName ?? "",
    unit: plannedMaterial?.unit ?? "pcs",
    quantity: plannedMaterial?.remainingQuantity ?? 1,
  });
  const [requests, setRequests] =
    useState<MaterialRequestRecord[]>(initialRequests);
  const [formErrors, setFormErrors] = useState<MaterialFormErrors>({});
  const [isPending, startTransition] = useTransition();

  const totalPending = requests.length;

  const sortedRequests = useMemo(
    () =>
      [...requests].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      ),
    [requests],
  );

  function updateField<K extends keyof CreateMaterialRequestInput>(
    key: K,
    value: CreateMaterialRequestInput[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setFormErrors((current) => ({
      ...current,
      [key]: undefined,
    }));
  }

  function validateForm() {
    const errors: MaterialFormErrors = {};
    const projectName = (form.projectName ?? "").trim();
    const materialName = (form.materialName ?? "").trim();
    const unit = (form.unit ?? "").trim();
    const neededBy = (form.neededBy ?? "").trim();
    const quantity = Number(form.quantity ?? 0);
    const notes = (form.notes ?? "").trim();

    if (!form.projectId || !projectName) errors.projectId = "Project is required.";

    if (!materialName) {
      errors.materialName = "Material name is required.";
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.quantity = "Quantity must be greater than zero.";
    }

    if (!unit) {
      errors.unit = "Unit is required.";
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(neededBy)) {
      errors.neededBy = "Needed-by date is required.";
    }

    if (!form.priority) {
      errors.priority = "Priority is required.";
    }

    if (notes.length > 500) {
      errors.notes = "Notes must be 500 characters or less.";
    }

    return {
      errors,
      hasErrors: Object.keys(errors).length > 0,
    };
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateForm();
    if (validation.hasErrors) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors({});

    startTransition(async () => {
      try {
        const created = await createMaterialRequestAction(form);
        setRequests((current) => [created, ...current]);
        setForm({
          ...EMPTY_FORM,
          neededBy: form.neededBy,
          projectId: form.projectId,
          projectName: form.projectName,
          estimateItemId: form.estimateItemId,
          materialName: plannedMaterial?.materialName ?? "",
          unit: plannedMaterial?.unit ?? "pcs",
          quantity: plannedMaterial?.remainingQuantity ?? 1,
        });
        toast.success("Material request submitted.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to submit request.",
        );
      }
    });
  }

  return (
    <div className="space-y-4 p-0 sm:p-6">
      <DashboardPageHero
        eyebrow="Engineer Workflow"
        title="Request Materials"
        description="Submit material requests with quantity and urgency so procurement can process site needs faster."
        actions={
          <span className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 sm:mt-0">
            <ClipboardPlus size={14} />
            {totalPending} pending
          </span>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-none border border-apple-mist bg-white p-5 shadow-[0_10px_30px_rgba(24,83,43,0.06)] sm:rounded-[18px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
            New Request
          </p>
          <h2 className="mt-2 text-xl font-semibold text-apple-charcoal">
            Material Request Form
          </h2>

          {plannedMaterial ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                Approved estimate material
              </p>
              <p className="mt-2 font-semibold text-emerald-950">
                {plannedMaterial.materialName}
              </p>
              <p className="mt-1 text-sm text-emerald-800">
                {plannedMaterial.remainingQuantity} {plannedMaterial.unit} remaining of{" "}
                {plannedMaterial.plannedQuantity} planned
              </p>
            </div>
          ) : null}

          <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-apple-charcoal">
                Project Name <span className="text-rose-500">*</span>
              </span>
              <select disabled={Boolean(plannedMaterial)} value={form.projectId} onChange={(event) => { const selected = projects.find((project) => project.id === event.target.value); updateField("projectId", event.target.value); updateField("projectName", selected?.name ?? ""); }} className={inputClass(Boolean(formErrors.projectId))}>
                <option value="">Select an assigned project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              {formErrors.projectId ? (
                <p className="text-xs font-medium text-rose-600">
                  {formErrors.projectId}
                </p>
              ) : null}
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-apple-charcoal">
                Material Name <span className="text-rose-500">*</span>
              </span>
              <input
                value={form.materialName}
                onChange={(event) =>
                  updateField("materialName", event.target.value)
                }
                placeholder="2x3 steel tubing"
                readOnly={Boolean(plannedMaterial)}
                className={inputClass(Boolean(formErrors.materialName))}
              />
              {formErrors.materialName ? (
                <p className="text-xs font-medium text-rose-600">
                  {formErrors.materialName}
                </p>
              ) : null}
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-apple-charcoal">
                  Quantity <span className="text-rose-500">*</span>
                </span>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  max={plannedMaterial?.remainingQuantity}
                  value={form.quantity}
                  onChange={(event) =>
                    updateField("quantity", Number(event.target.value || 0))
                  }
                  className={inputClass(Boolean(formErrors.quantity))}
                />
                {formErrors.quantity ? (
                  <p className="text-xs font-medium text-rose-600">
                    {formErrors.quantity}
                  </p>
                ) : null}
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-apple-charcoal">
                  Unit <span className="text-rose-500">*</span>
                </span>
                <input
                  value={form.unit}
                  onChange={(event) => updateField("unit", event.target.value)}
                  placeholder="pcs"
                  readOnly={Boolean(plannedMaterial)}
                  className={inputClass(Boolean(formErrors.unit))}
                />
                {formErrors.unit ? (
                  <p className="text-xs font-medium text-rose-600">
                    {formErrors.unit}
                  </p>
                ) : null}
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-apple-charcoal">
                  Needed By <span className="text-rose-500">*</span>
                </span>
                <input
                  type="date"
                  value={form.neededBy}
                  onChange={(event) =>
                    updateField("neededBy", event.target.value)
                  }
                  className={inputClass(Boolean(formErrors.neededBy))}
                />
                {formErrors.neededBy ? (
                  <p className="text-xs font-medium text-rose-600">
                    {formErrors.neededBy}
                  </p>
                ) : null}
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-apple-charcoal">
                  Priority <span className="text-rose-500">*</span>
                </span>
                <select
                  value={form.priority}
                  onChange={(event) =>
                    updateField(
                      "priority",
                      event.target.value as MaterialRequestPriority,
                    )
                  }
                  className={inputClass(Boolean(formErrors.priority))}
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {formErrors.priority ? (
                  <p className="text-xs font-medium text-rose-600">
                    {formErrors.priority}
                  </p>
                ) : null}
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-apple-charcoal">
                Site (Optional)
              </span>
              <input
                value={form.site ?? ""}
                onChange={(event) => updateField("site", event.target.value)}
                placeholder="Site A - Main Building"
                className="h-11 rounded-xl border border-apple-mist px-3 text-sm text-apple-charcoal outline-none transition focus:border-[#1f6a37]"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-apple-charcoal">
                Notes (Optional)
              </span>
              <textarea
                rows={4}
                value={form.notes ?? ""}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="Include specs, brand preference, or usage details."
                className={`rounded-xl border px-3 py-3 text-sm text-apple-charcoal outline-none transition focus:border-[#1f6a37] ${
                  formErrors.notes
                    ? "border-rose-300 bg-rose-50/40"
                    : "border-apple-mist bg-white"
                }`}
              />
              {formErrors.notes ? (
                <p className="text-xs font-medium text-rose-600">
                  {formErrors.notes}
                </p>
              ) : null}
            </label>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-11 w-fit items-center gap-2 rounded-[10px] bg-[#1f6a37] px-5 text-sm font-semibold text-white transition hover:bg-[#18552b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={15} />
                  Submit request
                </>
              )}
            </button>
          </form>
        </div>

        <div className="rounded-none h-fit border border-apple-mist bg-white p-5 shadow-[0_10px_30px_rgba(24,83,43,0.06)] sm:rounded-[18px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
            Request Queue
          </p>
          <h2 className="mt-2 text-xl font-semibold text-apple-charcoal">
            Recent Material Requests
          </h2>

          {sortedRequests.length === 0 ? (
            <div className="mt-4 rounded-none border border-dashed border-apple-mist px-4 py-6 text-sm text-apple-steel sm:rounded-[12px]">
              No requests submitted yet.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {sortedRequests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-none border border-apple-mist bg-[rgb(var(--apple-snow))] p-4 sm:rounded-[14px]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
                        {request.projectName}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-apple-charcoal">
                        {request.materialName}
                      </h3>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ${priorityBadgeClass(request.priority)}`}
                    >
                      {request.priority}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-apple-smoke md:grid-cols-2">
                    <p>
                      Quantity:{" "}
                      <span className="font-semibold text-apple-charcoal">
                        {request.quantity}
                      </span>{" "}
                      {request.unit}
                    </p>
                    <p>
                      Needed by:{" "}
                      <span className="font-semibold text-apple-charcoal">
                        {formatDate(request.neededBy)}
                      </span>
                    </p>
                    <p>
                      Site:{" "}
                      <span className="font-semibold text-apple-charcoal">
                        {request.site ?? "-"}
                      </span>
                    </p>
                    <p>
                      Requested:{" "}
                      <span className="font-semibold text-apple-charcoal">
                        {formatDate(request.createdAt)}
                      </span>
                    </p>
                  </div>

                  {request.notes ? (
                    <p className="mt-3 rounded-xl border border-apple-mist bg-white px-3 py-2 text-sm text-apple-steel">
                      {request.notes}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

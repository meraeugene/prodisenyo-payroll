"use client";

import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, FileUp, Pencil, Save, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  buildProgressSummary,
  sortProgressActivities,
  type EngineeringProgressActivityRecord,
} from "../utils/engineeringWorkspace";
import {
  parseEngineeringProgressWorkbook,
  type ImportedProgressActivity,
} from "../utils/engineeringProgressImport";

interface ProgressDraftActivity extends EngineeringProgressActivityRecord {
  isDraft?: boolean;
}

interface EngineeringProgressWorksheetProps {
  activities: EngineeringProgressActivityRecord[];
  readOnly?: boolean;
  isSubmitting?: boolean;
  onSubmitProgress?: (activities: ImportedProgressActivity[]) => void;
}

interface ActivityFormState {
  activity: string;
  weightPercent: string;
  progressPercent: string;
}

type ConfirmState =
  | { type: "delete-one"; activity: ProgressDraftActivity }
  | { type: "delete-all" }
  | null;

type ActivityFormErrors = Partial<
  Record<"activity" | "weightPercent" | "progressPercent", string>
>;

const emptyForm: ActivityFormState = {
  activity: "",
  weightPercent: "",
  progressPercent: "",
};

function parsePercent(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function validateForm(form: ActivityFormState) {
  const weightPercent = parsePercent(form.weightPercent);
  const progressPercent = parsePercent(form.progressPercent);
  const errors: ActivityFormErrors = {};

  if (!form.activity.trim()) errors.activity = "Activity is required.";
  if (Number.isNaN(weightPercent) || weightPercent <= 0 || weightPercent > 100) {
    errors.weightPercent = "% WT must be greater than 0 and no more than 100.";
  }
  if (Number.isNaN(progressPercent) || progressPercent < 0 || progressPercent > 100) {
    errors.progressPercent = "Progress must be between 0 and 100.";
  }
  return errors;
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function buildDraftRows(activities: EngineeringProgressActivityRecord[]): ProgressDraftActivity[] {
  return sortProgressActivities(activities).map((activity) => ({ ...activity }));
}

function buildClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `progress-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildActivitySignature(
  activities: Array<Pick<ProgressDraftActivity, "id" | "activity" | "weightPercent" | "progressPercent" | "updatedAt">>,
) {
  return activities
    .map(
      (activity) =>
        `${activity.id}:${activity.activity}:${activity.weightPercent}:${activity.progressPercent}:${activity.updatedAt}`,
    )
    .join("|");
}

export default function EngineeringProgressWorksheet({
  activities,
  readOnly = false,
  isSubmitting = false,
  onSubmitProgress,
}: EngineeringProgressWorksheetProps) {
  const [draftActivities, setDraftActivities] = useState<ProgressDraftActivity[]>(() =>
    buildDraftRows(activities),
  );
  const [form, setForm] = useState<ActivityFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<ActivityFormErrors>({});
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [importing, setImporting] = useState(false);
  const persistedSignatureRef = useRef(buildActivitySignature(activities));
  const [persistedSignature, setPersistedSignature] = useState(() =>
    buildActivitySignature(activities),
  );

  useEffect(() => {
    const nextSignature = buildActivitySignature(activities);

    if (nextSignature === persistedSignatureRef.current) return;
    persistedSignatureRef.current = nextSignature;
    setPersistedSignature(nextSignature);
    setDraftActivities(buildDraftRows(activities));
  }, [activities]);

  const sortedActivities = useMemo(
    () => sortProgressActivities(draftActivities),
    [draftActivities],
  );
  const summary = useMemo(
    () => buildProgressSummary(sortedActivities),
    [sortedActivities],
  );
  const submitLabel = editingId ? "Save activity" : "Add activity";
  const hasActivities = sortedActivities.length > 0;
  const draftSignature = useMemo(
    () => buildActivitySignature(sortedActivities),
    [sortedActivities],
  );
  const hasUnsavedChanges = draftSignature !== persistedSignature;
  const progressButtonLabel = hasUnsavedChanges
    ? "Update changes to CEO"
    : "Submit progress to CEO";

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormErrors({});
  };

  const handleSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    const input: ProgressDraftActivity = {
      id: editingId ?? buildClientId(),
      projectName: activities[0]?.projectName ?? "",
      activity: form.activity.trim(),
      weightPercent: parsePercent(form.weightPercent),
      progressPercent: parsePercent(form.progressPercent),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDraft: true,
    };

    setDraftActivities((current) =>
      editingId
        ? current.map((activity) => (activity.id === editingId ? input : activity))
        : [...current, input],
    );
    toast.success(editingId ? "Activity saved." : "Activity added.");
    resetForm();
  };

  const handleEdit = (activity: ProgressDraftActivity) => {
    if (readOnly) return;
    setEditingId(activity.id);
    setFormErrors({});
    setForm({
      activity: activity.activity,
      weightPercent: String(activity.weightPercent),
      progressPercent: String(activity.progressPercent),
    });
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImporting(true);
    try {
      const importedActivities = await parseEngineeringProgressWorkbook(file);
      if (importedActivities.length === 0) {
        setImportError("No activity, % WT, and progress rows were found.");
        return;
      }

      const importedRows = importedActivities.map((activity) => ({
        id: buildClientId(),
        projectName: activities[0]?.projectName ?? "",
        activity: activity.activity,
        weightPercent: activity.weightPercent,
        progressPercent: activity.progressPercent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDraft: true,
      }));
      setDraftActivities((current) => [...current, ...importedRows]);
      setImportError(null);
      toast.success("Excel progress imported.");
    } catch (importError) {
      console.error(importError);
      setImportError("Unable to import this Excel file.");
    } finally {
      setImporting(false);
    }
  };

  function confirmDelete() {
    if (!confirmState) return;

    if (confirmState.type === "delete-one") {
      setDraftActivities((current) =>
        current.filter((activity) => activity.id !== confirmState.activity.id),
      );
      if (editingId === confirmState.activity.id) resetForm();
      toast.success("Activity deleted.");
    } else {
      setDraftActivities([]);
      resetForm();
      toast.success("All activities deleted.");
    }

    setConfirmState(null);
  }

  function submitToCeo() {
    if (!onSubmitProgress) return;
    onSubmitProgress(
      sortedActivities.map((activity) => ({
        activity: activity.activity,
        weightPercent: activity.weightPercent,
        progressPercent: activity.progressPercent,
      })),
    );
  }

  return (
    <section className="relative grid gap-4 text-sm xl:grid-cols-[minmax(0,1fr)_320px]" aria-labelledby="worksheet-title">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {importing ? <ProgressSkeleton /> : null}
        {!importing ? <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[620px] text-left text-sm">
            <caption id="worksheet-title" className="sr-only">
              Engineering progress activities
            </caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-12 border-r border-slate-100 px-2 py-2 text-center">Item</th>
                <th className="border-r border-slate-100 px-2 py-2">Activity</th>
                <th className="w-24 border-r border-slate-100 px-2 py-2 text-right">% WT</th>
                <th className="w-32 border-r border-slate-100 px-2 py-2 text-right">Progress</th>
                {!readOnly ? <th className="w-20 px-2 py-2 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedActivities.map((activity, index) => (
                <tr key={activity.id} className="transition even:bg-slate-50/40 hover:bg-emerald-50/40">
                  <td className="border-r border-slate-100 px-2 py-2 text-center font-semibold text-slate-500">
                    {index + 1}
                  </td>
                  <td className="border-r border-slate-100 px-2 py-2 font-semibold text-apple-charcoal">
                    {activity.activity}
                  </td>
                  <td className="border-r border-slate-100 px-2 py-2 text-right font-semibold">
                    {formatPercent(activity.weightPercent)}
                  </td>
                  <td className="border-r border-slate-100 px-2 py-2 text-right">
                    <div className="ml-auto flex max-w-[118px] items-center gap-1.5">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{ width: `${activity.progressPercent}%` }}
                        />
                      </div>
                      <span className="w-14 text-right font-bold text-emerald-700">
                        {formatPercent(activity.progressPercent)}
                      </span>
                    </div>
                  </td>
                  {!readOnly ? (
                    <td className="px-2 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(activity)}
                          aria-label={`Edit ${activity.activity}`}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmState({ type: "delete-one", activity })}
                          aria-label={`Delete ${activity.activity}`}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
            {hasActivities ? (
              <tfoot className="border-t border-slate-200 bg-slate-50 text-sm">
                <tr>
                  <td className="border-r border-slate-100 px-2 py-2" colSpan={3} />
                  <td className="border-r border-slate-100 px-2 py-2 text-right font-bold text-apple-charcoal">
                    <span className="block w-full rounded-sm bg-emerald-500 px-2 py-1 text-center font-bold text-emerald-950">
                      {formatPercent(summary.overallProgress)}
                    </span>
                  </td>
                  {!readOnly ? <td className="px-2 py-2" /> : null}
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div> : null}

        {!importing ? <div className="divide-y divide-slate-100 md:hidden">
          {sortedActivities.map((activity, index) => (
            <article key={activity.id} className="space-y-3 p-4 even:bg-slate-50/50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Item {index + 1}
                  </p>
                  <h3 className="mt-1 text-sm font-bold text-apple-charcoal">
                    {activity.activity}
                  </h3>
                </div>
                {!readOnly ? (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(activity)}
                      aria-label={`Edit ${activity.activity}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmState({ type: "delete-one", activity })}
                      aria-label={`Delete ${activity.activity}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : null}
              </div>
              <ProgressMetrics activity={activity} />
            </article>
          ))}
          {hasActivities ? (
            <div className="bg-slate-50 p-4 text-right text-xs">
              <div className="inline-flex rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2">
                <p className="font-bold text-emerald-900">
                  {formatPercent(summary.overallProgress)}
                </p>
              </div>
            </div>
          ) : null}
        </div> : null}

        {!importing && !hasActivities ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-semibold text-slate-600">
              No weighted activities yet.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Add or import activities to start calculating project progress.
            </p>
          </div>
        ) : null}
      </div>

      {!readOnly ? (
        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-apple-charcoal">
              {editingId ? "Edit activity" : "Add activity"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Changes stay as a draft until submitted to CEO.
            </p>
            {hasUnsavedChanges ? (
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-800">
                You have unsent progress changes.
              </p>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3">
            <Field label="Activity" error={formErrors.activity}>
              <input
                value={form.activity}
                onChange={(event) =>
                  {
                    setForm((current) => ({ ...current, activity: event.target.value }));
                    setFormErrors((current) => ({ ...current, activity: undefined }));
                  }
                }
                aria-invalid={Boolean(formErrors.activity)}
                className={`mt-1 h-10 w-full rounded-md border bg-slate-50 px-3 text-sm outline-none transition focus:bg-white focus:ring-2 ${
                  formErrors.activity
                    ? "border-red-500 focus:border-red-600 focus:ring-red-100"
                    : "border-slate-200 focus:border-emerald-600 focus:ring-emerald-100"
                }`}
              />
            </Field>

            <Field label="% WT" error={formErrors.weightPercent}>
              <input
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                value={form.weightPercent}
                onChange={(event) =>
                  {
                    setForm((current) => ({ ...current, weightPercent: event.target.value }));
                    setFormErrors((current) => ({ ...current, weightPercent: undefined }));
                  }
                }
                aria-invalid={Boolean(formErrors.weightPercent)}
                className={`mt-1 h-10 w-full rounded-md border bg-slate-50 px-3 text-sm outline-none transition focus:bg-white focus:ring-2 ${
                  formErrors.weightPercent
                    ? "border-red-500 focus:border-red-600 focus:ring-red-100"
                    : "border-slate-200 focus:border-emerald-600 focus:ring-emerald-100"
                }`}
              />
            </Field>

            <Field label="Progress" error={formErrors.progressPercent}>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.progressPercent}
                onChange={(event) =>
                  {
                    setForm((current) => ({ ...current, progressPercent: event.target.value }));
                    setFormErrors((current) => ({ ...current, progressPercent: undefined }));
                  }
                }
                aria-invalid={Boolean(formErrors.progressPercent)}
                className={`mt-1 h-10 w-full rounded-md border bg-slate-50 px-3 text-sm outline-none transition focus:bg-white focus:ring-2 ${
                  formErrors.progressPercent
                    ? "border-red-500 focus:border-red-600 focus:ring-red-100"
                    : "border-slate-200 focus:border-emerald-600 focus:ring-emerald-100"
                }`}
                placeholder="0 to 100"
              />
            </Field>

            {importError ? <p className="text-xs font-semibold text-rose-700">{importError}</p> : null}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-[#1f6a37] px-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                {editingId ? <Save size={15} /> : null}
                {submitLabel}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            <div className={hasActivities ? "grid grid-cols-2 gap-2" : ""}>
              <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <FileUp size={15} />
                Import Excel
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="sr-only"
                  onChange={handleImportFile}
                />
              </label>
              {hasActivities ? (
                <button
                  type="button"
                  onClick={() => setConfirmState({ type: "delete-all" })}
                  className="flex h-10 items-center justify-center gap-2 rounded-md border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                >
                  <Trash2 size={15} />
                  Delete all
                </button>
              ) : null}
            </div>
            <button
              type="button"
              disabled={!hasActivities || isSubmitting}
              onClick={submitToCeo}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-800 px-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />}
              {isSubmitting ? "Submitting..." : progressButtonLabel}
            </button>
          </div>
        </aside>
      ) : (
        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Overall progress
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-800">
            {formatPercent(summary.overallProgress)}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-600"
              style={{ width: `${Math.min(summary.overallProgress, 100)}%` }}
            />
          </div>
       
        </aside>
      )}

      <ConfirmModal state={confirmState} onClose={() => setConfirmState(null)} onConfirm={confirmDelete} />
    </section>
  );
}

function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}

function ProgressSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="grid grid-cols-[48px_1fr_96px_128px_72px] gap-3">
          <div className="h-9 animate-pulse rounded bg-slate-100" />
          <div className="h-9 animate-pulse rounded bg-slate-100" />
          <div className="h-9 animate-pulse rounded bg-slate-100" />
          <div className="h-9 animate-pulse rounded bg-slate-100" />
          <div className="h-9 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function ProgressMetrics({ activity }: { activity: ProgressDraftActivity }) {
  return (
    <dl className="grid grid-cols-2 gap-2 text-xs">
      <div className="rounded-md border border-slate-100 bg-white p-2">
        <dt className="font-semibold text-slate-500">% WT</dt>
        <dd className="mt-1 font-bold text-apple-charcoal">
          {formatPercent(activity.weightPercent)}
        </dd>
      </div>
      <div className="rounded-md border border-emerald-100 bg-emerald-50 p-2">
        <dt className="font-semibold text-emerald-700">Progress</dt>
        <dd className="mt-1 font-bold text-emerald-800">
          {formatPercent(activity.progressPercent)}
        </dd>
      </div>
    </dl>
  );
}

function ConfirmModal({
  state,
  onClose,
  onConfirm,
}: {
  state: ConfirmState;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!state) return null;

  const title =
    state.type === "delete-one" ? "Delete activity?" : "Delete all activities?";
  const description =
    state.type === "delete-one"
      ? `This removes "${state.activity.activity}" from the draft progress update.`
      : "This removes every activity from the draft progress update.";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
            aria-label="Close confirmation"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-10 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

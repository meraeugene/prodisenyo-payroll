"use client";

import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import { FileUp, Pencil, Plus, Save, Trash2 } from "lucide-react";
import {
  buildProgressSummary,
  sortProgressActivities,
  type EngineeringProgressActivityRecord,
} from "../utils/engineeringWorkspace";
import {
  parseEngineeringProgressWorkbook,
  type ImportedProgressActivity,
} from "../utils/engineeringProgressImport";

interface EngineeringProgressWorksheetProps {
  activities: EngineeringProgressActivityRecord[];
  onAddActivity: (input: {
    activity: string;
    weightPercent: number;
    progressPercent: number;
  }) => void;
  onUpdateActivity: (
    id: string,
    input: {
      activity: string;
      weightPercent: number;
      progressPercent: number;
    },
  ) => void;
  onImportActivities: (activities: ImportedProgressActivity[]) => void;
  onDeleteActivity: (id: string) => void;
  onDeleteAllActivities: () => void;
}

interface ActivityFormState {
  activity: string;
  weightPercent: string;
  progressPercent: string;
}

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

  if (!form.activity.trim()) return "Activity is required.";
  if (Number.isNaN(weightPercent) || weightPercent < 0 || weightPercent > 100) {
    return "% WT must be between 0 and 100.";
  }
  if (
    Number.isNaN(progressPercent) ||
    progressPercent < 0 ||
    progressPercent > 100
  ) {
    return "Progress must be between 0 and 100.";
  }
  return null;
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

export default function EngineeringProgressWorksheet({
  activities,
  onAddActivity,
  onUpdateActivity,
  onImportActivities,
  onDeleteActivity,
  onDeleteAllActivities,
}: EngineeringProgressWorksheetProps) {
  const [form, setForm] = useState<ActivityFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sortedActivities = useMemo(
    () => sortProgressActivities(activities),
    [activities],
  );
  const summary = useMemo(
    () => buildProgressSummary(sortedActivities),
    [sortedActivities],
  );
  const submitLabel = editingId ? "Save activity" : "Add activity";
  const SubmitIcon = editingId ? Save : Plus;

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    const input = {
      activity: form.activity.trim(),
      weightPercent: parsePercent(form.weightPercent),
      progressPercent: parsePercent(form.progressPercent),
    };

    if (editingId) {
      onUpdateActivity(editingId, input);
    } else {
      onAddActivity(input);
    }
    resetForm();
  };

  const handleEdit = (activity: EngineeringProgressActivityRecord) => {
    setEditingId(activity.id);
    setError(null);
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

    try {
      const importedActivities = await parseEngineeringProgressWorkbook(file);
      if (importedActivities.length === 0) {
        setError("No activity, % WT, and progress rows were found.");
        return;
      }

      onImportActivities(importedActivities);
      setError(null);
    } catch (importError) {
      console.error(importError);
      setError("Unable to import this Excel file.");
    }
  };

  return (
    <section className="grid gap-4 text-sm xl:grid-cols-[minmax(0,1fr)_320px]" aria-labelledby="worksheet-title">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="hidden overflow-x-auto md:block">
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
                <th className="w-20 px-2 py-2 text-right">Actions</th>
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
                        onClick={() => onDeleteActivity(activity.id)}
                        aria-label={`Delete ${activity.activity}`}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {sortedActivities.length > 0 ? (
              <tfoot className="border-t border-slate-200 bg-slate-50 text-sm">
                <tr>
                  <td className="border-r border-slate-100 px-2 py-2" colSpan={3} />
                  <td className="border-r border-slate-100 px-2 py-2 text-right font-bold text-apple-charcoal">
                    <span className="block w-full rounded-sm bg-emerald-500 px-2 py-1 text-center font-bold text-emerald-950">
                      {formatPercent(summary.overallProgress)}
                    </span>
                  </td>
                  <td className="px-2 py-2" />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
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
                    onClick={() => onDeleteActivity(activity.id)}
                    aria-label={`Delete ${activity.activity}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
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
            </article>
          ))}
          {sortedActivities.length > 0 ? (
            <div className="bg-slate-50 p-4 text-right text-xs">
              <div className="inline-flex rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2">
                <p className="font-bold text-emerald-900">
                  {formatPercent(summary.overallProgress)}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {sortedActivities.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-semibold text-slate-600">
              No weighted activities yet.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Add the first activity to start calculating project progress.
            </p>
          </div>
        ) : null}
      </div>

      <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-apple-charcoal">
            {editingId ? "Edit activity" : "Add activity"}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Activity
            </span>
            <input
              value={form.activity}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  activity: event.target.value,
                }))
              }
              className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              % WT
            </span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.weightPercent}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  weightPercent: event.target.value,
                }))
              }
              className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Progress
            </span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.progressPercent}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  progressPercent: event.target.value,
                }))
              }
              className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              placeholder="0 to 100"
            />
          </label>

          {error ? <p className="text-xs font-semibold text-rose-700">{error}</p> : null}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-[#1f6a37] px-3 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <SubmitIcon size={15} />
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
          <button
            type="button"
            disabled={sortedActivities.length === 0}
            onClick={onDeleteAllActivities}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={15} />
            Delete all
          </button>
        </div>
      </aside>
    </section>
  );
}

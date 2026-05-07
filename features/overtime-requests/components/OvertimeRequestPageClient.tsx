"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarDays, Clock3, LoaderCircle, MapPin } from "lucide-react";
import { toast } from "sonner";
import DashboardPageHero from "@/components/DashboardPageHero";
import { submitOvertimeRequestAction } from "@/actions/payroll";
import { ROLE_CODE_TO_NAME, ROLE_CODES, type RoleCode } from "@/lib/payrollConfig";
import {
  formatOvertimeRequesterRole,
  type OvertimeRequestRecord,
} from "@/features/overtime-requests/types";
import type { OvertimeApprovalMode } from "@/types/database";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusClasses(status: OvertimeRequestRecord["status"]) {
  if (status === "approved")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected")
    return "border-[#cfe3d3] bg-[#eef7f0] text-[#2d6a4f]";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getStatusLabel(status: OvertimeRequestRecord["status"]) {
  if (status === "rejected") return "returned";
  return status;
}

type OvertimeFormErrors = {
  employeeName?: string;
  roleCode?: string;
  siteName?: string;
  requestDate?: string;
  overtimeHours?: string;
  reason?: string;
};

function baseInputClass(hasError: boolean) {
  return `h-10 w-full rounded-xl border px-3 outline-none transition focus:border-emerald-400 ${
    hasError
      ? "border-rose-400  ring-1 ring-rose-200"
      : "border-apple-mist bg-white"
  }`;
}

export default function OvertimeRequestPageClient({
  initialRequests,
  initialEmployeeName,
}: {
  initialRequests: OvertimeRequestRecord[];
  initialEmployeeName: string;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [employeeName, setEmployeeName] = useState(initialEmployeeName);
  const [roleCode, setRoleCode] = useState<RoleCode | "">("");
  const [siteName, setSiteName] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [requestDate, setRequestDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [overtimeHours, setOvertimeHours] = useState("");
  const [reason, setReason] = useState("");
  const [approvalMode, setApprovalMode] =
    useState<OvertimeApprovalMode>("auto_on_date");
  const [formErrors, setFormErrors] = useState<OvertimeFormErrors>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const sortedRequests = useMemo(
    () =>
      [...requests].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [requests],
  );

  function validateForm() {
    const errors: OvertimeFormErrors = {};
    const trimmedEmployeeName = employeeName.trim();
    const trimmedSiteName = siteName.trim();
    const trimmedOvertimeHours = overtimeHours.trim();
    const trimmedReason = reason.trim();

    if (!trimmedEmployeeName) {
      errors.employeeName = "Employee name is required.";
    }

    if (!trimmedSiteName) {
      errors.siteName = "Site name is required.";
    }

    if (approvalMode === "auto_on_date" && !roleCode) {
      errors.roleCode = "Role / occupation is required.";
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestDate)) {
      errors.requestDate = "Please select a valid request date.";
    }

    if (!trimmedOvertimeHours) {
      errors.overtimeHours = "Overtime hours is required.";
    }

    if (trimmedReason.length > 500) {
      errors.reason = "Reason must be 500 characters or less.";
    }

    return {
      errors,
      hasErrors: Object.keys(errors).length > 0,
    };
  }

  function submitRequest() {
    const validation = validateForm();
    if (validation.hasErrors) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors({});
    setConfirmOpen(false);

    startTransition(async () => {
      try {
        const result = await submitOvertimeRequestAction({
          employeeName: employeeName.trim(),
          roleCode: roleCode || null,
          siteName: siteName.trim(),
          periodLabel: periodLabel.trim(),
          requestDate,
          overtimeHours: Number(overtimeHours || 0),
          amount: 0,
          reason: reason.trim(),
          approvalMode,
        });

        setRequests((current) => [result.request, ...current]);
        setEmployeeName(initialEmployeeName);
        setRoleCode("");
        setSiteName("");
        setPeriodLabel("");
        setOvertimeHours("");
        setReason("");
        toast.success("Overtime request submitted.");
        window.dispatchEvent(new Event("payroll:pending-count-changed"));
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to submit overtime request.",
        );
      }
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateForm();

    if (validation.hasErrors) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors({});
    setConfirmOpen(true);
  }

  return (
    <div className="p-0 sm:p-6 xl:flex xl:h-screen xl:flex-col xl:overflow-hidden">
      <DashboardPageHero
        eyebrow="Overtime Workflow"
        title="Request Overtime"
        description="Submit overtime requests for CEO approval. Approved requests are tracked separately from payroll-run overtime adjustments."
      />

      <div className="mt-4 grid gap-4 overflow-x-hidden xl:min-h-0 xl:flex-1 xl:grid-cols-[1.08fr_0.92fr] xl:items-stretch">
        <section className="rounded-none border border-apple-mist h-fit bg-white p-5 shadow-[0_10px_30px_rgba(24,83,43,0.07)] sm:rounded-[16px]">
          <h2 className="text-lg font-semibold text-apple-charcoal">
            Overtime Request Form
          </h2>
          <form
            className="mt-4 grid gap-3 md:grid-cols-2"
            onSubmit={handleSubmit}
          >
            <label className="space-y-1 text-sm text-apple-smoke">
              <span className="font-medium text-apple-charcoal">
                Employee Name <span className="text-rose-500">*</span>
              </span>
              <input
                value={employeeName}
                onChange={(event) => {
                  setEmployeeName(event.target.value);
                  setFormErrors((current) => ({
                    ...current,
                    employeeName: undefined,
                  }));
                }}
                className={baseInputClass(Boolean(formErrors.employeeName))}
                placeholder="Enter employee name"
              />
              {formErrors.employeeName ? (
                <p className="text-xs font-medium text-rose-600">
                  {formErrors.employeeName}
                </p>
              ) : null}
            </label>

            <label className="space-y-1 text-sm text-apple-smoke">
              <span className="font-medium text-apple-charcoal">
                Role / Occupation{" "}
                {approvalMode === "auto_on_date" ? (
                  <span className="text-rose-500">*</span>
                ) : null}
              </span>
              <select
                value={roleCode}
                onChange={(event) => {
                  setRoleCode(event.target.value as RoleCode | "");
                  setFormErrors((current) => ({
                    ...current,
                    roleCode: undefined,
                  }));
                }}
                className={baseInputClass(Boolean(formErrors.roleCode))}
              >
                <option value="">Select role</option>
                {ROLE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {ROLE_CODE_TO_NAME[code]} ({code})
                  </option>
                ))}
              </select>
              {formErrors.roleCode ? (
                <p className="text-xs font-medium text-rose-600">
                  {formErrors.roleCode}
                </p>
              ) : null}
            </label>

            <label className="space-y-1 text-sm text-apple-smoke">
              <span className="font-medium text-apple-charcoal">
                Site Name <span className="text-rose-500">*</span>
              </span>
              <input
                value={siteName}
                onChange={(event) => {
                  setSiteName(event.target.value);
                  setFormErrors((current) => ({
                    ...current,
                    siteName: undefined,
                  }));
                }}
                className={baseInputClass(Boolean(formErrors.siteName))}
                placeholder="Enter site"
              />
              {formErrors.siteName ? (
                <p className="text-xs font-medium text-rose-600">
                  {formErrors.siteName}
                </p>
              ) : null}
            </label>

            <label className="space-y-1 text-sm text-apple-smoke">
              <span className="font-medium text-apple-charcoal">
                Period Label (Optional)
              </span>
              <input
                value={periodLabel}
                onChange={(event) => setPeriodLabel(event.target.value)}
                className={baseInputClass(false)}
                placeholder="e.g. 2026-04-01 to 2026-04-15"
              />
            </label>

            <label className="space-y-1 text-sm text-apple-smoke md:col-span-2">
              <span className="font-medium text-apple-charcoal">
                Approval Type
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  <input
                    type="radio"
                    name="approvalMode"
                    value="auto_on_date"
                    checked={approvalMode === "auto_on_date"}
                    onChange={() => setApprovalMode("auto_on_date")}
                    className="h-4 w-4 accent-[#1f6a37]"
                  />
                  <span>
                    <span className="block font-semibold">
                      Auto approve on date
                    </span>
                    <span className="block text-xs text-emerald-700">
                      Included once payroll opens for that date.
                    </span>
                  </span>
                </label>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-apple-mist bg-white px-3 py-2 text-sm text-apple-smoke">
                  <input
                    type="radio"
                    name="approvalMode"
                    value="manual"
                    checked={approvalMode === "manual"}
                    onChange={() => setApprovalMode("manual")}
                    className="h-4 w-4 accent-[#1f6a37]"
                  />
                  <span>
                    <span className="block font-semibold text-apple-charcoal">
                      CEO manual approval
                    </span>
                    <span className="block text-xs text-apple-steel">
                      Keeps the existing approval queue.
                    </span>
                  </span>
                </label>
              </div>
            </label>

            <label className="space-y-1 text-sm text-apple-smoke">
              <span className="font-medium text-apple-charcoal">
                Work Date <span className="text-rose-500">*</span>
              </span>
              <input
                type="date"
                value={requestDate}
                onChange={(event) => {
                  setRequestDate(event.target.value);
                  setFormErrors((current) => ({
                    ...current,
                    requestDate: undefined,
                  }));
                }}
                className={baseInputClass(Boolean(formErrors.requestDate))}
              />
              {formErrors.requestDate ? (
                <p className="text-xs font-medium text-rose-600">
                  {formErrors.requestDate}
                </p>
              ) : null}
            </label>

            <label className="space-y-1 text-sm text-apple-smoke">
              <span className="font-medium text-apple-charcoal">
                Overtime Hours <span className="text-rose-500">*</span>
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={overtimeHours}
                onChange={(event) => {
                  const raw = event.target.value.replace(/[^0-9.-]/g, "");
                  setOvertimeHours(raw);
                  setFormErrors((current) => ({
                    ...current,
                    overtimeHours: undefined,
                  }));
                }}
                className={baseInputClass(Boolean(formErrors.overtimeHours))}
                placeholder="0.00"
              />
              {formErrors.overtimeHours ? (
                <p className="text-xs font-medium text-rose-600">
                  {formErrors.overtimeHours}
                </p>
              ) : null}
            </label>

            <label className="space-y-1 text-sm text-apple-smoke md:col-span-2">
              <span className="font-medium text-apple-charcoal">
                Reason (Optional)
              </span>
              <textarea
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  setFormErrors((current) => ({
                    ...current,
                    reason: undefined,
                  }));
                }}
                rows={3}
                className={`w-full rounded-xl border px-3 py-2 outline-none transition focus:border-emerald-400 ${
                  formErrors.reason
                    ? "border-rose-300 bg-rose-50/40"
                    : "border-apple-mist bg-white"
                }`}
                placeholder="Describe why overtime is requested"
              />
              {formErrors.reason ? (
                <p className="text-xs font-medium text-rose-600">
                  {formErrors.reason}
                </p>
              ) : null}
            </label>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1f6a37] px-4 text-sm font-semibold text-white transition hover:bg-[#18552d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <LoaderCircle size={14} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Review Request"
                )}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-none border border-apple-mist bg-white p-5 shadow-[0_10px_30px_rgba(24,83,43,0.07)] sm:rounded-[16px] xl:flex xl:h-full xl:min-h-0 xl:flex-col">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-apple-charcoal">
              Your Overtime Requests
            </h2>
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              {sortedRequests.length} request
              {sortedRequests.length === 1 ? "" : "s"}
            </span>
          </div>

          {sortedRequests.length === 0 ? (
            <p className="text-sm text-apple-steel">
              No overtime requests submitted yet.
            </p>
          ) : (
            <div className="max-h-[30rem] space-y-3 overflow-y-scroll pr-1 xl:min-h-0 xl:flex-1 xl:max-h-none">
              {sortedRequests.map((request) => (
                <article
                  key={request.id}
                  className="overflow-hidden rounded-2xl border border-apple-mist bg-white shadow-[0_6px_16px_rgba(15,23,42,0.07)]"
                >
                  <div className="space-y-4 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
                          {formatOvertimeRequesterRole(request.requester_role)}
                        </p>
                        <h3 className="mt-1 text-lg font-bold text-apple-charcoal">
                          {request.employee_name}
                        </h3>
                        <div className="mt-1 inline-flex items-center gap-1 text-sm text-apple-smoke">
                          <MapPin size={14} className="text-emerald-700" />
                          {request.site_name}
                        </div>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${getStatusClasses(request.status)}`}
                      >
                        {getStatusLabel(request.status)}
                      </span>
                    </div>

                    <div className="grid gap-2 rounded-xl border border-apple-mist bg-white/75 p-3 text-sm text-apple-smoke">
                      <p className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays
                            size={14}
                            className="text-emerald-700"
                          />
                          Work date
                        </span>
                        <span className="font-semibold text-apple-charcoal">
                          {request.request_date}
                        </span>
                      </p>
                      <p className="flex items-center justify-between gap-2">
                        <span>Approval</span>
                        <span className="font-semibold text-apple-charcoal">
                          {request.approval_mode === "auto_on_date"
                            ? request.auto_approved_at
                              ? "Auto-approved"
                              : "Auto on date"
                            : "CEO manual"}
                        </span>
                      </p>
                      {request.role_code ? (
                        <p className="flex items-center justify-between gap-2">
                          <span>Role</span>
                          <span className="font-semibold text-apple-charcoal">
                            {request.role_code}
                          </span>
                        </p>
                      ) : null}
                      <p className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 size={14} className="text-sky-700" />
                          Overtime hours
                        </span>
                        <span className="font-semibold text-sky-700">
                          {request.overtime_hours.toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </p>
                    </div>

                    {request.period_label ? (
                      <p className="text-sm text-apple-smoke">
                        Period:{" "}
                        <span className="font-semibold text-apple-charcoal">
                          {request.period_label}
                        </span>
                      </p>
                    ) : null}

                    <p className="text-sm text-apple-smoke">
                      Submitted:{" "}
                      <span className="font-semibold text-apple-charcoal">
                        {formatDateTime(request.created_at)}
                      </span>
                    </p>

                    {request.rejection_reason ? (
                      <p className="rounded-lg border border-[#cfe3d3] bg-[#eef7f0] px-3 py-2 text-sm text-[#2d6a4f]">
                        Return reason:{" "}
                        <span className="font-semibold">
                          {request.rejection_reason}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.24)]">
            <div className="border-b border-apple-mist bg-[linear-gradient(135deg,#112e1a,#1f4f2c,#245f34)] px-5 py-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                Confirm Submission
              </p>
              <h2 className="mt-2 text-lg font-semibold">
                Submit overtime request?
              </h2>
            </div>

            <div className="space-y-3 px-5 py-5 text-sm text-apple-smoke">
              <p>
                Employee:{" "}
                <span className="font-semibold text-apple-charcoal">
                  {employeeName.trim()}
                </span>
              </p>
              <p>
                Site:{" "}
                <span className="font-semibold text-apple-charcoal">
                  {siteName.trim()}
                </span>
              </p>
              <p>
                Work date:{" "}
                <span className="font-semibold text-apple-charcoal">
                  {requestDate}
                </span>
              </p>
              <p>
                Approval:{" "}
                <span className="font-semibold text-apple-charcoal">
                  {approvalMode === "auto_on_date"
                    ? "Auto approve on work date"
                    : "CEO manual approval"}
                </span>
              </p>
              {roleCode ? (
                <p>
                  Role:{" "}
                  <span className="font-semibold text-apple-charcoal">
                    {ROLE_CODE_TO_NAME[roleCode]} ({roleCode})
                  </span>
                </p>
              ) : null}
              <p>
                Overtime hours:{" "}
                <span className="font-semibold text-sky-700">
                  {Number(overtimeHours || 0).toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </p>
              {periodLabel.trim() ? (
                <p>
                  Period:{" "}
                  <span className="font-semibold text-apple-charcoal">
                    {periodLabel.trim()}
                  </span>
                </p>
              ) : null}
              {reason.trim() ? (
                <p>
                  Reason:{" "}
                  <span className="font-semibold text-apple-charcoal">
                    {reason.trim()}
                  </span>
                </p>
              ) : null}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setConfirmOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-apple-mist px-4 text-sm font-semibold text-apple-charcoal transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={submitRequest}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-[#1f6a37] px-4 text-sm font-semibold text-white transition hover:bg-[#18552d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <LoaderCircle size={15} className="mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Confirm Submit"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

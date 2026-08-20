"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  ATTENDANCE_CLASSIFICATIONS,
  type AttendanceClassification,
  type PayrollAttendanceDecision,
} from "@/features/payroll/types";
import {
  decimalHoursToSeconds,
  secondsToDecimalHours,
  type CutoffAttendanceDay,
  validateAttendanceDecision,
} from "@/features/payroll/utils/payrollAttendanceEngine";

interface AttendanceResolutionDialogProps {
  day: CutoffAttendanceDay | null;
  onClose: () => void;
  onSave: (decision: PayrollAttendanceDecision) => void;
}

export function AttendanceResolutionDialog({ day, onClose, onSave }: AttendanceResolutionDialogProps) {
  const [classification, setClassification] = useState<AttendanceClassification>("MANUAL_ATTENDANCE");
  const [regularHours, setRegularHours] = useState("8");
  const [overtimeHours, setOvertimeHours] = useState("0");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!day) return;
    setClassification(day.classification === "NO_BIOMETRIC" ? "MANUAL_ATTENDANCE" : day.classification);
    setRegularHours(String(secondsToDecimalHours(day.approvedRegularSeconds || 8 * 3600)));
    setOvertimeHours(String(secondsToDecimalHours(day.approvedOvertimeSeconds)));
    setReason(day.overrideReason ?? "");
    setError(null);
  }, [day]);

  if (!day) return null;

  function submit() {
    if (!day) return;
    const approvedRegularSeconds = decimalHoursToSeconds(Number(regularHours));
    const approvedOvertimeSeconds = decimalHoursToSeconds(Number(overtimeHours));
    try {
      validateAttendanceDecision(classification, approvedRegularSeconds, reason);
      onSave({
        date: day.date,
        classification,
        approvedRegularSeconds,
        approvedOvertimeSeconds,
        overtimeStatus: approvedOvertimeSeconds > 0 ? "approved" : "rejected",
        reason: reason.trim(),
        source: "manual",
        reviewedAt: new Date().toISOString(),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save resolution.");
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-4">
          <div>
            <h3 className="text-sm font-bold text-slate-950">Resolve Attendance</h3>
            <p className="mt-1 text-xs text-slate-500">{day.date} · Raw biometric {secondsToDecimalHours(day.biometricWorkedSeconds)} hrs</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close attendance resolution" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
            Classification
            <select value={classification} onChange={(event) => setClassification(event.target.value as AttendanceClassification)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal">
              {ATTENDANCE_CLASSIFICATIONS.map((value) => (
                <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Approved regular hours
            <input type="number" min="0" step="0.01" value={regularHours} onChange={(event) => setRegularHours(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono font-normal" />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Approved OT hours
            <input type="number" min="0" step="0.01" value={overtimeHours} onChange={(event) => setOvertimeHours(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono font-normal" />
          </label>
          <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
            Reason
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" />
          </label>
          {error ? <p className="text-xs text-red-600 sm:col-span-2">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
          <button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-700">Cancel</button>
          <button type="button" onClick={submit} className="h-9 rounded-lg bg-emerald-700 px-4 text-xs font-bold text-white">Save Resolution</button>
        </div>
      </div>
    </div>
  );
}

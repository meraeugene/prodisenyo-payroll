"use client";

import { ROLE_CODE_TO_NAME, type RoleCode } from "@/lib/payrollConfig";

interface PayrollRateModalProps {
  show: boolean;
  roleCodes: RoleCode[];
  payrollRateDraft: Record<RoleCode, number>;
  setPayrollRateDraft: (
    value:
      | Record<RoleCode, number>
      | ((prev: Record<RoleCode, number>) => Record<RoleCode, number>),
  ) => void;
  onClose: () => void;
  onApply: () => void;
}

export default function PayrollRateModal({
  show,
  roleCodes,
  payrollRateDraft,
  setPayrollRateDraft,
  onClose,
  onApply,
}: PayrollRateModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-2xl border border-apple-mist bg-white shadow-apple-xs p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-apple-charcoal">Edit Role Rates</h3>
          <p className="text-sm text-apple-smoke">
            Hourly rate is calculated as daily rate / 8.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {roleCodes.map((roleCode) => (
            <label key={roleCode} className="space-y-1.5">
              <span className="text-xs font-semibold text-apple-steel uppercase tracking-wider">
                {roleCode} - {ROLE_CODE_TO_NAME[roleCode]}
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={payrollRateDraft[roleCode]}
                onChange={(e) => {
                  const parsed = Number.parseFloat(e.target.value);
                  setPayrollRateDraft((prev) => ({
                    ...prev,
                    [roleCode]: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
                  }));
                }}
                className="w-full px-3 h-10 rounded-2xl border border-apple-silver bg-white text-sm text-apple-charcoal focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal transition-all"
              />
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-10 rounded-2xl border border-apple-silver text-sm font-semibold text-apple-ash hover:border-apple-charcoal transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onApply}
            className="px-4 h-10 rounded-2xl bg-apple-charcoal text-white text-sm font-semibold hover:bg-apple-black transition"
          >
            Save Rates
          </button>
        </div>
      </div>
    </div>
  );
}


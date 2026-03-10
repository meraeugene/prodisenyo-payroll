"use client";

import type { PayrollConfig } from "@/app/types";

interface RateConfigProps {
  config: PayrollConfig;
  onChange: (config: PayrollConfig) => void;
}

interface FieldProps {
  label: string;
  hint: string;
  value: number;
  prefix?: string;
  step?: string;
  onChange: (v: number) => void;
}

function Field({ label, hint, value, prefix = "₱", step = "0.01", onChange }: FieldProps) {
  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs font-semibold text-apple-charcoal tracking-tight">{label}</label>
        <p className="text-2xs text-apple-steel mt-0.5">{hint}</p>
      </div>
      <div className="relative">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-apple-smoke font-medium select-none">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value || ""}
          step={step}
          min={0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder="0.00"
          className={`
            w-full rounded-2xl border border-apple-silver bg-white
            py-3 text-sm font-medium text-apple-charcoal
            placeholder:text-apple-silver
            focus:outline-none focus:ring-2 focus:ring-apple-charcoal/20 focus:border-apple-charcoal
            transition-all duration-150
            ${prefix ? "pl-8 pr-4" : "px-4"}
          `}
        />
      </div>
    </div>
  );
}

export default function RateConfig({ config, onChange }: RateConfigProps) {
  function update(key: keyof PayrollConfig, value: number | string) {
    onChange({ ...config, [key]: value });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field
          label="Rate per Day"
          hint="Base daily wage"
          value={config.defaultRateDay}
          onChange={(v) => update("defaultRateDay", v)}
        />
        <Field
          label="Rate per Hour"
          hint="Regular hourly rate"
          value={config.defaultRateHour}
          onChange={(v) => update("defaultRateHour", v)}
        />
        <Field
          label="OT Multiplier"
          hint="e.g. 1.25× for overtime"
          value={config.otMultiplier}
          prefix="×"
          step="0.05"
          onChange={(v) => update("otMultiplier", v)}
        />
      </div>

      <div className="p-4 rounded-2xl bg-apple-snow border border-apple-mist">
        <p className="text-[11px] font-semibold text-apple-charcoal uppercase tracking-[0.16em] mb-2">
          Payroll Formula
        </p>
        <div className="space-y-1.5 text-xs text-apple-smoke leading-relaxed">
          <p>
            <span className="font-semibold text-apple-charcoal">Daily Pay</span>{" "}
            = Rate/Day × Days Worked
          </p>
          <p>
            <span className="font-semibold text-apple-charcoal">Overtime Pay</span>{" "}
            = Rate/Hour × OT Multiplier × OT Hours
          </p>
          <p className="pt-1">
            <span className="font-semibold text-apple-charcoal">Gross Pay</span>{" "}
            = Daily Pay + Overtime Pay
          </p>
          <p className="text-[11px] text-apple-steel pt-1">
            You can review and override individual employee rates in the payroll table below.
          </p>
        </div>
      </div>
    </div>
  );
}

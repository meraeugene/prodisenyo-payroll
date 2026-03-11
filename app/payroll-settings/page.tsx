"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import type { PayrollSettingsState } from "@/types";
import {
  defaultPayrollSettings,
  loadPayrollSettings,
  savePayrollSettings,
} from "@/app/lib/storage";
import { formatNumber } from "@/app/lib/payroll";

export default function PayrollSettingsPage() {
  const [settings, setSettings] =
    useState<PayrollSettingsState>(defaultPayrollSettings());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadPayrollSettings());
  }, []);

  const averageHoursPerDay = useMemo(() => {
    if (settings.roleRates.length === 0) return 8;
    return (
      settings.roleRates.reduce((sum, row) => sum + row.hoursPerDay, 0) /
      settings.roleRates.length
    );
  }, [settings.roleRates]);

  function updateRate(roleCode: string, field: "dailyRate" | "hoursPerDay", value: number) {
    setSaved(false);
    setSettings((prev) => ({
      roleRates: prev.roleRates.map((item) =>
        item.role === roleCode
          ? {
              ...item,
              [field]:
                field === "hoursPerDay"
                  ? Math.max(1, value || 8)
                  : Math.max(0, value || 0),
            }
          : item,
      ),
    }));
  }

  function saveChanges() {
    savePayrollSettings(settings);
    setSaved(true);
  }

  return (
    <main className="min-h-screen bg-apple-snow">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-apple-ash hover:text-apple-charcoal"
            >
              <ArrowLeft size={15} /> Back to Payroll
            </Link>
            <h1 className="text-2xl font-bold text-apple-charcoal mt-2">
              Payroll Settings
            </h1>
            <p className="text-sm text-apple-smoke mt-1">
              Configure daily rates and hours per day used by Step 3 payroll generation.
            </p>
          </div>

          <button
            onClick={saveChanges}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-apple-charcoal text-white"
          >
            <Save size={15} /> Save Settings
          </button>
        </div>

        {saved && (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Payroll settings saved.
          </div>
        )}

        <div className="rounded-3xl border border-apple-mist bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-apple-mist">
                {["Role", "Daily Rate", "Hours / Day", "Hourly Rate"].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-widest text-apple-steel"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {settings.roleRates.map((row) => (
                <tr key={row.role} className="border-b border-apple-mist/60 odd:bg-apple-snow/40">
                  <td className="px-4 py-3 font-semibold text-apple-charcoal">
                    {row.role} - {row.label}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.dailyRate}
                      onChange={(event) =>
                        updateRate(row.role, "dailyRate", Number(event.target.value))
                      }
                      className="w-40 h-9 px-3 rounded-xl border border-apple-silver text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={1}
                      step="0.25"
                      value={row.hoursPerDay}
                      onChange={(event) =>
                        updateRate(row.role, "hoursPerDay", Number(event.target.value))
                      }
                      className="w-32 h-9 px-3 rounded-xl border border-apple-silver text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-apple-ash">
                    {formatNumber(row.dailyRate / row.hoursPerDay, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-apple-mist bg-white px-4 py-4 text-sm text-apple-smoke space-y-1">
          <p>Payroll formulas:</p>
          <p>hourlyRate = dailyRate / hoursPerDay</p>
          <p>regularPay = hoursWorked × hourlyRate</p>
          <p>overtimePay = overtimeHours × hourlyRate</p>
          <p>netPay = regularPay + overtimePay + bonuses - deductions</p>
          <p>Current average hours/day: {formatNumber(averageHoursPerDay, 2)}</p>
        </div>
      </div>
    </main>
  );
}

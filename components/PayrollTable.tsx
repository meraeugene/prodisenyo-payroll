"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  AlertTriangle,
} from "lucide-react";
import type { Employee, EmployeeCalculated, PayrollConfig } from "@/types";
import { capitalize, formatNumber } from "@/lib/payroll";
import { RateInput } from "./RateInput";
import { InlineInput } from "./InlineInput";
import { PageButton } from "./PageButton";

const PER_PAGE = 10;

interface PayrollTableProps {
  employees: Employee[];
  calculated: EmployeeCalculated[];
  config: PayrollConfig;
  onUpdateEmployee: (id: number, patch: Partial<Employee>) => void;
}

export default function PayrollTable({
  employees,
  calculated,
  config,
  onUpdateEmployee,
}: PayrollTableProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perEmpRates, setPerEmpRates] = useState(false);
  const [deptFilter, setDeptFilter] = useState<string>("All");

  // const depts = useMemo(() => {
  //   const all = new Set(employees.map((e) => e.dept));
  //   return ["All", ...Array.from(all).sort()];
  // }, [employees]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return calculated.filter((e) =>
      // (deptFilter === "All" || e.dept === deptFilter) &&
      // e.name.toLowerCase().includes(q) || e.dept.toLowerCase().includes(q),
      e.name.toLowerCase().includes(q),
    );
  }, [calculated, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  function handleRateChange(
    id: number,
    field: "customRateDay" | "customRateHour",
    val: string,
  ) {
    const parsed = parseFloat(val);
    onUpdateEmployee(id, { [field]: isNaN(parsed) ? null : parsed });
  }

  function handleHoursChange(
    id: number,
    field: "days" | "regularHours" | "otHours",
    val: string,
  ) {
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateEmployee(id, { [field]: parsed });
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-full sm:max-w-xs">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-apple-steel"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search employee…"
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-apple-silver bg-white text-sm text-apple-charcoal
              placeholder:text-apple-silver focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15
              focus:border-apple-charcoal transition-all"
          />
        </div>

        {/* Dept filter */}
        {/* <select
          value={deptFilter}
          onChange={(e) => {
            setDeptFilter(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-auto px-3 py-2.5 rounded-2xl border border-apple-silver bg-white text-sm text-apple-charcoal
            focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal transition-all"
        >
          {depts.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select> */}

        {/* Per-emp toggle */}
        <button
          onClick={() => setPerEmpRates((v) => !v)}
          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl border text-xs font-semibold
            transition-all duration-200
            ${
              perEmpRates
                ? "bg-apple-charcoal border-apple-charcoal text-white"
                : "bg-white border-apple-silver text-apple-ash hover:border-apple-ash"
            }`}
        >
          <SlidersHorizontal size={13} />
          Per-employee rates
        </button>

        <span className="sm:ml-auto text-xs text-apple-steel font-medium">
          {filtered.length} employee{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-3xl border border-apple-mist bg-white shadow-apple-xs [-webkit-overflow-scrolling:touch]">
        <table className="w-full text-sm min-w-[920px]">
          <thead>
            <tr className="border-b border-apple-mist">
              {[
                "#",
                "Employee",
                "Days",
                "Reg. Hours",
                "OT Hours",
                ...(perEmpRates ? ["Rate/Day", "Rate/Hour"] : []),
                "Day Pay",
                "OT Pay",
                "Gross Pay",
              ].map((h, i) => (
                <th
                  key={i}
                  className={`px-4 py-3.5 text-2xs font-semibold uppercase tracking-widest text-apple-steel whitespace-nowrap
                    ${i === 1 ? "text-left" : "text-right"}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((emp, idx) => (
              <tr
                key={emp.id}
                className="border-b border-apple-mist/60 last:border-0 hover:bg-apple-snow/60 transition-colors group"
              >
                {/* # */}
                <td className="px-4 py-3.5 text-xs text-apple-silver font-mono text-right">
                  {(safePage - 1) * PER_PAGE + idx + 1}
                </td>

                {/* Name + dept */}
                <td className="px-4 py-3.5">
                  <p className="font-semibold text-apple-charcoal text-[13px] tracking-tight">
                    {capitalize(emp.name)}
                  </p>
                  {/* <p className="text-2xs text-apple-steel mt-0.5">{emp.dept}</p> */}
                </td>

                {/* Days editable */}
                <td className="px-4 py-3.5 text-right">
                  <div className="inline-flex justify-end">
                    <InlineInput
                      value={emp.days}
                      onChange={(v) => handleHoursChange(emp.id, "days", v)}
                      suffix="d"
                    />
                  </div>
                </td>

                {/* Reg Hours */}
                <td className="px-4 py-3.5 text-right">
                  <div className="inline-flex justify-end">
                    <InlineInput
                      value={emp.regularHours}
                      onChange={(v) =>
                        handleHoursChange(emp.id, "regularHours", v)
                      }
                      suffix="h"
                    />
                  </div>
                </td>

                {/* OT Hours */}
                <td className="px-4 py-3.5 text-right">
                  <div className="inline-flex justify-end">
                    <InlineInput
                      value={emp.otHours}
                      onChange={(v) => handleHoursChange(emp.id, "otHours", v)}
                      suffix="h"
                      highlight={emp.otHours > 0}
                    />
                  </div>
                </td>

                {/* Per-emp rate fields */}
                {perEmpRates && (
                  <>
                    <td className="px-4 py-3.5 text-right">
                      <RateInput
                        value={emp.customRateDay ?? config.defaultRateDay}
                        isCustom={emp.customRateDay !== null}
                        onChange={(v) =>
                          handleRateChange(emp.id, "customRateDay", v)
                        }
                        onClear={() =>
                          onUpdateEmployee(emp.id, { customRateDay: null })
                        }
                      />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <RateInput
                        value={emp.customRateHour ?? config.defaultRateHour}
                        isCustom={emp.customRateHour !== null}
                        onChange={(v) =>
                          handleRateChange(emp.id, "customRateHour", v)
                        }
                        onClear={() =>
                          onUpdateEmployee(emp.id, { customRateHour: null })
                        }
                      />
                    </td>
                  </>
                )}

                {/* Day Pay */}
                <td className="px-4 py-3.5 text-[13px] font-mono text-apple-ash text-right">
                  ₱{formatNumber(emp.dayPay)}
                </td>

                {/* OT Pay */}
                <td className="px-4 py-3.5 text-[13px] font-mono text-apple-smoke text-right">
                  {emp.otPay > 0 ? `₱${formatNumber(emp.otPay)}` : "—"}
                </td>

                {/* Gross */}
                <td className="px-4 py-3.5 text-right">
                  <div className="inline-flex flex-col items-end gap-0.5">
                    <span className="text-[13px] font-bold font-mono text-apple-charcoal">
                      ₱{formatNumber(emp.grossPay)}
                    </span>
                    {emp.days === 0 &&
                      emp.regularHours === 0 &&
                      emp.otHours === 0 &&
                      emp.grossPay === 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-amber-50 border border-amber-100 text-[10px] font-medium text-amber-700">
                          <AlertTriangle size={10} className="shrink-0" />
                          No attendance
                        </span>
                      )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-apple-steel">
            Page {safePage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <PageButton
              disabled={safePage === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={14} />
            </PageButton>
            {Array.from(
              { length: Math.min(totalPages, 7) },
              (_, i) => i + 1,
            ).map((p) => (
              <PageButton
                key={p}
                active={p === safePage}
                onClick={() => setPage(p)}
              >
                {p}
              </PageButton>
            ))}
            <PageButton
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </PageButton>
          </div>
        </div>
      )}
    </div>
  );
}

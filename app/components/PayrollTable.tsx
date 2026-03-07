"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Employee, EmployeeCalculated, PayrollConfig } from "@/app/types";
import { capitalize, formatNumber } from "@/app/lib/payroll";
import { RateInput } from "./RateInput";
import { InlineInput } from "./InlineInput";
import { PageButton } from "./PageButton";

const PER_PAGE = 5;

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
  const [showWithDurationOnly, setShowWithDurationOnly] = useState(false);
  const perEmpRates = true;
  const [selectedDetails, setSelectedDetails] =
    useState<EmployeeCalculated | null>(null);

  const filtered = useMemo(() => {
    // query
    const q = query.toLowerCase();

    return calculated.filter((e) => {
      const matchesQuery = e.name.toLowerCase().includes(q);

      const hasDuration = e.days > 0 || e.regularHours > 0 || e.otHours > 0;

      return matchesQuery && (!showWithDurationOnly || hasDuration);
    });
  }, [calculated, query, showWithDurationOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  const maxVisiblePages = 5;
  const halfWindow = Math.floor(maxVisiblePages / 2);
  const windowStart = Math.max(
    1,
    Math.min(safePage - halfWindow, totalPages - maxVisiblePages + 1),
  );
  const windowEnd = Math.min(totalPages, windowStart + maxVisiblePages - 1);

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
    if (isNaN(parsed) || parsed < 0) return;

    if (field === "days") {
      const days = parsed;
      onUpdateEmployee(id, {
        days,
        regularHours: days * 8, // <- auto-sync reg hours to days
      });
      return;
    }

    onUpdateEmployee(id, { [field]: parsed });
  }

  useEffect(() => {
    if (!selectedDetails) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedDetails(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedDetails]);

  useEffect(() => {
    if (!selectedDetails) return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [selectedDetails]);

  return (
    <div className="space-y-6">
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
            placeholder="Search employee..."
            className="w-full pl-9 pr-10 py-2.5 rounded-2xl border border-apple-silver bg-white text-sm text-apple-charcoal
              placeholder:text-apple-silver focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15
              focus:border-apple-charcoal transition-all"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setPage(1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full
                text-apple-steel hover:text-apple-charcoal hover:bg-apple-snow transition-colors
                flex items-center justify-center"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <button
          onClick={() => {
            setShowWithDurationOnly((v) => !v);
            setPage(1);
          }}
          className={`px-3.5 py-2.5 rounded-2xl border text-xs font-semibold transition-colors ${
            showWithDurationOnly
              ? "bg-apple-charcoal text-white border-apple-charcoal"
              : "bg-white text-apple-charcoal border-apple-silver hover:bg-apple-snow"
          }`}
        >
          Active Employees
        </button>

        <span className="sm:ml-auto text-xs text-apple-steel font-medium">
          {filtered.length} employee{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-apple-mist bg-white shadow-apple-xs">
        <table className="w-full text-xs sm:text-sm table-auto">
          <thead>
            <tr className="border-b border-apple-mist">
              {[
                "#",
                "Branch",
                "Employee",
                "Days",
                "Reg. Hours",
                "OT Hours",
                ...(perEmpRates ? ["Rate/Day", "Rate/Hour"] : []),
                "Day Pay",
                "OT Pay",
                "Gross Pay",
                "Details",
              ].map((h, i) => (
                <th
                  key={i}
                  className="bg-white px-4 py-3.5 text-left text-2xs font-semibold uppercase tracking-widest text-apple-steel whitespace-nowrap"
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
                <td className="px-4 py-3.5 text-xs text-apple-silver font-mono">
                  {(safePage - 1) * PER_PAGE + idx + 1}
                </td>

                <td className="px-4 py-3 text-xs text-apple-steel">
                  {emp.branch}
                </td>

                {/* Name*/}
                <td className="px-4 py-3.5">
                  <p className="font-semibold text-apple-charcoal text-[13px] tracking-tight">
                    {capitalize(emp.name)}
                  </p>
                </td>

                {/* Days editable */}
                <td className="px-4 py-3.5">
                  <InlineInput
                    value={emp.days}
                    onChange={(v) => handleHoursChange(emp.id, "days", v)}
                    suffix="d"
                    highlight={true}
                  />
                </td>

                {/* Reg Hours */}
                <td className="px-4 py-3.5">
                  <InlineInput
                    value={emp.regularHours}
                    onChange={(v) =>
                      handleHoursChange(emp.id, "regularHours", v)
                    }
                    suffix="h"
                    highlight={true}
                  />
                </td>

                {/* OT Hours */}
                <td className="px-4 py-3.5">
                  <InlineInput
                    value={emp.otHours}
                    onChange={(v) => handleHoursChange(emp.id, "otHours", v)}
                    suffix="h"
                    highlight={true}
                  />
                </td>

                {/* Per-emp rate fields */}
                {perEmpRates && (
                  <>
                    <td className="px-4 py-3.5">
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
                    <td className="px-4 py-3.5">
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
                <td className="px-4 py-3.5 text-[13px] font-mono text-apple-ash">
                  {"\u20B1"}
                  {formatNumber(emp.dayPay)}
                </td>

                {/* OT Pay */}
                <td className="px-4 py-3.5 text-[13px] font-mono text-apple-smoke">
                  {emp.otPay > 0 ? `\u20B1${formatNumber(emp.otPay)}` : "—"}
                </td>

                {/* Gross */}
                <td className="px-4 py-3.5">
                  <span className="text-[13px] font-bold font-mono text-apple-charcoal">
                    {"\u20B1"}
                    {formatNumber(emp.grossPay)}
                  </span>
                </td>

                {/* Details */}
                <td className="px-4 py-3.5">
                  <button
                    onClick={() => setSelectedDetails(emp)}
                    className="px-2.5 py-1.5 rounded-xl border border-apple-silver text-2xs font-semibold text-apple-charcoal
                      hover:bg-apple-snow transition-colors"
                  >
                    View
                  </button>
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
              wide
              disabled={safePage === 1}
              onClick={() => setPage(1)}
            >
              First
            </PageButton>
            <PageButton
              disabled={safePage === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={14} />
            </PageButton>
            {Array.from(
              { length: windowEnd - windowStart + 1 },
              (_, i) => windowStart + i,
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
            <PageButton
              wide
              disabled={safePage === totalPages}
              onClick={() => setPage(totalPages)}
            >
              Last
            </PageButton>
          </div>

          <div className="invisible"></div>
        </div>
      )}

      {selectedDetails &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-[1px] p-4 sm:p-8 overflow-hidden animate-overlay-in"
            onClick={() => setSelectedDetails(null)}
          >
            <div
              className="max-w-6xl mx-auto  bg-white rounded-lg border border-apple-mist shadow-apple-lg max-h-[90vh] overflow-y-auto animate-modal-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 sm:px-8 py-4 border-b border-apple-mist flex items-center justify-between sticky top-0 bg-white">
                <div>
                  <p className="text-2xs uppercase tracking-widest text-apple-steel font-semibold">
                    Calculation Details
                  </p>
                  <h3 className="text-lg font-bold text-apple-charcoal">
                    {capitalize(selectedDetails.name)} (ID: {selectedDetails.id}
                    )
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedDetails(null)}
                  className="w-8 h-8 rounded-full border border-apple-silver flex items-center justify-center text-apple-steel hover:text-apple-charcoal hover:bg-apple-snow transition-colors"
                  aria-label="Close details"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="px-5 sm:px-8 py-5 space-y-5">
                <div className="rounded-2xl border border-apple-mist p-4 bg-apple-snow/30">
                  <p className="text-sm text-apple-charcoal">
                    <span className="font-semibold">Reg Hours</span> =
                    Attendance Days x 8 ={" "}
                    <span className="font-mono">
                      {formatNumber(selectedDetails.days, 1)} x 8 ={" "}
                      {formatNumber(selectedDetails.regularHours, 1)}
                    </span>
                  </p>
                  <p className="text-sm text-apple-charcoal mt-2">
                    <span className="font-semibold">OT Hours</span> = OT Normal
                    + OT Special ={" "}
                    <span className="font-mono">
                      {formatNumber(
                        selectedDetails.calcDetails?.otNormalHours ?? 0,
                        1,
                      )}{" "}
                      +{" "}
                      {formatNumber(
                        selectedDetails.calcDetails?.otSpecialHours ?? 0,
                        1,
                      )}{" "}
                      = {formatNumber(selectedDetails.otHours, 1)}
                    </span>
                  </p>
                </div>

                <div className="rounded-2xl border border-apple-mist overflow-hidden">
                  <div className="px-4 py-3 bg-apple-snow/40 border-b border-apple-mist">
                    <p className="text-xs text-apple-steel font-semibold uppercase tracking-wide">
                      Source Summary
                    </p>
                    <p className="text-2xs text-apple-steel mt-0.5">
                      Sheet: {selectedDetails.calcDetails?.sourceSheet ?? "N/A"}
                    </p>
                  </div>
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <Cell
                      label="Absences (Day)"
                      value={selectedDetails.calcDetails?.absencesDay}
                    />
                    <Cell
                      label="Leave (Day)"
                      value={selectedDetails.calcDetails?.leaveDay}
                    />
                    <Cell
                      label="Business Trip (Day)"
                      value={selectedDetails.calcDetails?.businessTripDay}
                    />
                    <Cell
                      label="Attendance (Day)"
                      value={selectedDetails.calcDetails?.attendanceDay}
                    />
                    <Cell
                      label="OT Normal"
                      value={selectedDetails.calcDetails?.otNormalRaw ?? "0"}
                    />
                    <Cell
                      label="OT Special"
                      value={selectedDetails.calcDetails?.otSpecialRaw ?? "0"}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-apple-mist overflow-hidden">
                  <div className="px-4 py-3 bg-apple-snow/40 border-b border-apple-mist">
                    <p className="text-xs text-apple-steel font-semibold uppercase tracking-wide">
                      All Report Logs
                    </p>
                  </div>
                  <table className="w-full table-fixed text-xs">
                    <thead>
                      <tr className="border-b border-apple-mist">
                        {[
                          "Date/Week",
                          "Time1 In",
                          "Time1 Out",
                          "Time2 In",
                          "Time2 Out",
                          "OT In",
                          "OT Out",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-2 sm:px-3 py-2 text-left text-2xs uppercase tracking-wide text-apple-steel"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedDetails.calcDetails?.dailyLogs ?? []).length >
                      0 ? (
                        selectedDetails.calcDetails?.dailyLogs?.map((log) => (
                          <tr
                            key={`${log.dateWeek}-${log.time1In}-${log.time2Out}`}
                            className="border-b border-apple-mist/60 last:border-0"
                          >
                            <td className="px-2 sm:px-3 py-2 break-words">
                              {log.dateWeek}
                            </td>
                            <td className="px-2 sm:px-3 py-2 break-words">
                              {log.time1In || "-"}
                            </td>
                            <td className="px-2 sm:px-3 py-2 break-words">
                              {log.time1Out || "-"}
                            </td>
                            <td className="px-2 sm:px-3 py-2 break-words">
                              {log.time2In || "-"}
                            </td>
                            <td className="px-2 sm:px-3 py-2 break-words">
                              {log.time2Out || "-"}
                            </td>
                            <td className="px-2 sm:px-3 py-2 break-words">
                              {log.otIn || "-"}
                            </td>
                            <td className="px-2 sm:px-3 py-2 break-words">
                              {log.otOut || "-"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            className="px-3 py-3 text-apple-steel"
                            colSpan={7}
                          >
                            No detailed daily logs found for this employee.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function Cell({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="rounded-xl border border-apple-mist p-3 bg-white">
      <p className="text-2xs uppercase tracking-wide text-apple-steel">
        {label}
      </p>
      <p className="mt-1 text-sm font-mono text-apple-charcoal">{value ?? 0}</p>
    </div>
  );
}

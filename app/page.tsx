"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { X, Search, ArrowRight, ArrowLeft } from "lucide-react";
import StepIndicator from "@/components/StepIndicator";
import UploadZone from "@/components/UploadZone";
import type { AttendanceRecord, Employee, Step } from "@/types";
import type { ParseResult } from "@/app/lib/parser";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Area,
  AreaChart,
} from "recharts";
import { DailyLogRow, Step2Sort, Step2View } from "@/types/index";
import {
  compareStep2Rows,
  earlierTime,
  earliestNonEmptyTime,
  laterTime,
  latestNonEmptyTime,
  pairMinutes,
} from "@/lib/utils";
import { highlight } from "@/components/Highlight";

const PREVIEW_LIMIT = 8;

export default function HomePage() {
  const [step, setStep] = useState<Step>(1);
  const [step2View, setStep2View] = useState<Step2View>("daily");
  const [step2Sort, setStep2Sort] = useState<Step2Sort>("date-asc");
  const [recordsPage, setRecordsPage] = useState(1);
  const [step2SiteFilter, setStep2SiteFilter] = useState("ALL");
  const [step2NameFilter, setStep2NameFilter] = useState("");
  const [step2DateFilter, setStep2DateFilter] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [site, setSite] = useState("Unknown Site");
  const [employees, setEmployees] = useState<Employee[]>([]);

  const dailyRows = useMemo<DailyLogRow[]>(() => {
    const grouped = new Map<string, DailyLogRow>();

    for (const record of records) {
      const key = `${record.date}|||${record.employee.trim().toLowerCase()}`;
      const current = grouped.get(key) ?? {
        date: record.date,
        employee: record.employee,
        time1In: "",
        time1Out: "",
        time2In: "",
        time2Out: "",
        otIn: "",
        otOut: "",
        hours: 0,
        site: record.site,
      };

      if (!current.site && record.site) current.site = record.site;

      if (record.source === "Time1" && record.type === "IN") {
        current.time1In = earlierTime(current.time1In, record.logTime);
      } else if (record.source === "Time1" && record.type === "OUT") {
        current.time1Out = laterTime(current.time1Out, record.logTime);
      } else if (record.source === "Time2" && record.type === "IN") {
        current.time2In = earlierTime(current.time2In, record.logTime);
      } else if (record.source === "Time2" && record.type === "OUT") {
        current.time2Out = laterTime(current.time2Out, record.logTime);
      } else if (record.source === "OT" && record.type === "IN") {
        current.otIn = earlierTime(current.otIn, record.logTime);
      } else if (record.source === "OT" && record.type === "OUT") {
        current.otOut = laterTime(current.otOut, record.logTime);
      }

      grouped.set(key, current);
    }

    const rows = Array.from(grouped.values()).map((row) => {
      const regularIn = earliestNonEmptyTime(row.time1In, row.time2In);
      const regularOut = latestNonEmptyTime(row.time1Out, row.time2Out);

      // Some exports place late end-of-day punches in OT In/Out instead of regular Out.
      const otAsRegularOut = !regularOut
        ? latestNonEmptyTime(row.otOut, row.otIn)
        : "";
      const effectiveRegularOut = regularOut || otAsRegularOut;
      const regularMinutes = pairMinutes(regularIn, effectiveRegularOut);

      const usedOtAsRegularBoundary =
        !regularOut && Boolean(otAsRegularOut) && Boolean(regularIn);
      const otMinutes =
        row.otIn && row.otOut && !usedOtAsRegularBoundary
          ? pairMinutes(row.otIn, row.otOut)
          : 0;

      const minutes = regularMinutes + otMinutes;
      return {
        ...row,
        hours: Math.round((minutes / 60) * 100) / 100,
      };
    });

    return rows;
  }, [records]);

  const availableSites = useMemo(() => {
    return Array.from(
      new Set(
        records
          .map((record) => record.site.trim())
          .filter((value) => value.length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [records]);

  const filteredDetailedRecords = useMemo(() => {
    const nameFilter = step2NameFilter.trim().toLowerCase();
    const dateFilter = step2DateFilter.trim();

    const filtered = records.filter((record) => {
      if (step2SiteFilter !== "ALL" && record.site !== step2SiteFilter)
        return false;
      if (dateFilter && record.date !== dateFilter) return false;
      if (nameFilter && !record.employee.toLowerCase().includes(nameFilter))
        return false;
      return true;
    });

    filtered.sort((a, b) => {
      const byPrimary = compareStep2Rows(
        a.date,
        a.employee,
        b.date,
        b.employee,
        step2Sort,
      );
      if (byPrimary !== 0) return byPrimary;
      if (a.logTime !== b.logTime) return a.logTime.localeCompare(b.logTime);
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.source.localeCompare(b.source);
    });

    return filtered;
  }, [records, step2SiteFilter, step2DateFilter, step2NameFilter, step2Sort]);

  const filteredDailyRows = useMemo(() => {
    const nameFilter = step2NameFilter.trim().toLowerCase();
    const dateFilter = step2DateFilter.trim();

    const filtered = dailyRows.filter((row) => {
      if (step2SiteFilter !== "ALL" && row.site !== step2SiteFilter)
        return false;
      if (dateFilter && row.date !== dateFilter) return false;
      if (nameFilter && !row.employee.toLowerCase().includes(nameFilter))
        return false;
      return true;
    });

    filtered.sort((a, b) =>
      compareStep2Rows(a.date, a.employee, b.date, b.employee, step2Sort),
    );

    return filtered;
  }, [dailyRows, step2SiteFilter, step2DateFilter, step2NameFilter, step2Sort]);

  const activeRowsCount =
    step2View === "daily"
      ? filteredDailyRows.length
      : filteredDetailedRecords.length;
  const totalRowsForCurrentView =
    step2View === "daily" ? dailyRows.length : records.length;

  const totalRecordPages = useMemo(
    () => Math.max(1, Math.ceil(activeRowsCount / PREVIEW_LIMIT)),
    [activeRowsCount],
  );

  const previewStart = (recordsPage - 1) * PREVIEW_LIMIT;
  const previewEnd = previewStart + PREVIEW_LIMIT;

  const previewRecords = useMemo(() => {
    return filteredDetailedRecords.slice(previewStart, previewEnd);
  }, [filteredDetailedRecords, previewStart, previewEnd]);

  const previewDailyRows = useMemo(() => {
    return filteredDailyRows.slice(previewStart, previewEnd);
  }, [filteredDailyRows, previewStart, previewEnd]);

  const branchSummaries = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const record of records) {
      const siteKey = record.site?.trim();
      if (!siteKey) continue;
      if (!map.has(siteKey)) {
        map.set(siteKey, new Set<string>());
      }
      map.get(siteKey)!.add(record.employee.trim());
    }
    return Array.from(map.entries())
      .map(([siteName, employeesSet]) => ({
        siteName,
        employeeCount: employeesSet.size,
      }))
      .sort((a, b) => a.siteName.localeCompare(b.siteName));
  }, [records]);

  // Overtime by Branch
  const overtimeByBranch = useMemo(() => {
    const map = new Map<string, number>();

    employees.forEach((emp) => {
      const rec = records.find(
        (r) =>
          r.employee.trim().toLowerCase() === emp.name.trim().toLowerCase(),
      );

      const branch = rec?.site?.split(" ")[0] ?? "Unknown";

      map.set(branch, (map.get(branch) ?? 0) + emp.otHours);
    });

    return Array.from(map.entries())
      .map(([branch, hours]) => ({
        branch,
        hours: Number(hours.toFixed(2)),
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [employees, records]);

  // Workforce by Branch
  const workforceByBranch = useMemo(() => {
    const map = new Map<string, Set<string>>();

    records.forEach((r) => {
      const branch = r.site.split(" ")[0];
      if (!map.has(branch)) map.set(branch, new Set());
      map.get(branch)!.add(r.employee);
    });

    return Array.from(map.entries())
      .map(([branch, set]) => ({
        branch,
        employees: set.size,
      }))
      .sort((a, b) => b.employees - a.employees);
  }, [records]);

  // Daily Labor Hours
  const dailyLaborHours = useMemo(() => {
    const map = new Map<string, number>();

    records.forEach((r) => {
      map.set(r.date, (map.get(r.date) ?? 0) + 1);
    });

    return Array.from(map.entries())
      .map(([date, logs]) => ({
        date,
        hours: logs / 2,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [records]);

  // Top Overtime Employees
  const topOTEmployees = useMemo(() => {
    return [...employees]
      .sort((a, b) => b.otHours - a.otHours)
      .slice(0, 5)
      .map((e) => ({
        name: e.name,
        hours: e.otHours,
      }));
  }, [employees]);

  useEffect(() => {
    setRecordsPage((prev) => Math.min(prev, totalRecordPages));
  }, [totalRecordPages]);

  useEffect(() => {
    setRecordsPage(1);
  }, [step2View, step2Sort, step2SiteFilter, step2NameFilter, step2DateFilter]);

  useEffect(() => {
    if (
      step2SiteFilter !== "ALL" &&
      !availableSites.includes(step2SiteFilter)
    ) {
      setStep2SiteFilter("ALL");
    }
  }, [availableSites, step2SiteFilter]);

  useEffect(() => {
    if (step === 2) {
      window.scrollTo({ top: 500, behavior: "smooth" });
    }
  }, [step]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("searchEmployee")?.focus();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setRecordsPage((p) => Math.min(totalRecordPages, p + 1));
      }
      if (e.key === "ArrowLeft") {
        setRecordsPage((p) => Math.max(1, p - 1));
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [totalRecordPages]);

  const handleParsed = useCallback((result: ParseResult) => {
    setEmployees(result.employees);
    setRecords(result.records);
    setStep2View("daily");
    setStep2Sort("date-asc");
    setStep2SiteFilter("ALL");
    setStep2NameFilter("");
    setStep2DateFilter("");
    setRecordsPage(1);
    setSite(result.site);
    setStep(2);
  }, []);

  function handleReset() {
    setRecords([]);
    setStep2View("daily");
    setStep2Sort("date-asc");
    setStep2SiteFilter("ALL");
    setStep2NameFilter("");
    setStep2DateFilter("");
    setRecordsPage(1);
    setSite("Unknown Site");
    setStep(1);
  }

  const pages = useMemo(() => {
    const arr = [];
    const maxVisible = 5;

    let start = Math.max(1, recordsPage - 2);
    let end = Math.min(totalRecordPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      arr.push(i);
    }

    return arr;
  }, [recordsPage, totalRecordPages]);

  return (
    <div className="min-h-screen bg-apple-snow">
      <Nav step={step} handleReset={handleReset} />

      <div className="md:hidden border-b border-apple-mist bg-white px-5 py-3">
        <StepIndicator current={step} />
      </div>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* Step 1: Upload Attendance Reports */}
        <section
          className="animate-fade-up"
          style={{ animationFillMode: "both" }}
        >
          <div className="bg-white rounded-3xl border border-apple-mist shadow-apple-xs overflow-hidden">
            <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6 border-b border-apple-mist flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xs font-mono font-semibold text-apple-steel uppercase tracking-widest">
                    Step 1
                  </span>
                  {step > 1 && (
                    <span className="text-2xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                      Complete
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-apple-charcoal tracking-tight">
                  Upload Attendance Reports
                </h2>
                <p className="text-sm text-apple-smoke mt-1">
                  Upload one or more biometric attendance exports as XLS, XLSX,
                  or CSV.
                </p>
              </div>
            </div>

            <div
              className={`px-5 sm:px-8 py-6 sm:py-8 transition-opacity duration-300 ${step > 1 ? "opacity-50 pointer-events-none" : ""}`}
            >
              <UploadZone onParsed={handleParsed} />
            </div>
          </div>
        </section>
        {/* Step 2: Review Attendance Logs */}
        {step >= 2 && (
          <section
            className="animate-fade-up"
            style={{ animationFillMode: "both", animationDelay: "40ms" }}
          >
            <div className="bg-white rounded-3xl border border-apple-mist shadow-apple-xs overflow-hidden">
              <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6 border-b border-apple-mist">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-2xs font-mono font-semibold text-apple-steel uppercase tracking-widest">
                    Step 2
                  </span>
                  <span className="text-2xs font-semibold text-apple-smoke bg-apple-snow px-2 py-0.5 rounded-full border border-apple-mist">
                    {site}
                  </span>
                  {step > 2 && (
                    <span className="text-2xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                      Complete
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-apple-charcoal tracking-tight">
                  Review Attendance Logs
                </h2>
                <p className="text-sm text-apple-smoke mt-1">
                  Your biometric files are cleaned and converted into readable
                  daily time logs.
                </p>
              </div>

              <div className="px-5 sm:px-8 py-6 sm:py-8 space-y-5">
                {branchSummaries.length > 0 && (
                  <div className="rounded-2xl border border-apple-mist bg-white px-5 py-4">
                    <p className="text-2xs font-semibold text-apple-steel uppercase tracking-widest mb-4">
                      Branch Summary
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {branchSummaries.map((branch) => (
                        <div
                          key={branch.siteName}
                          className="rounded-xl border border-apple-mist bg-apple-snow px-4 py-3 hover:shadow-sm transition"
                        >
                          <p className="text-[11px] text-apple-steel uppercase tracking-wider">
                            Branch
                          </p>

                          <p className="text-sm font-semibold text-apple-charcoal mt-1">
                            {branch.siteName.split(" ")[0]}
                          </p>

                          <p className="text-xs text-apple-steel mt-1">
                            {branch.employeeCount}{" "}
                            {branch.employeeCount === 1
                              ? "employee"
                              : "employees"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {records.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setStep2View("daily");
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150
                        ${
                          step2View === "daily"
                            ? "bg-apple-charcoal text-white border-apple-charcoal"
                            : "bg-white text-apple-charcoal border-apple-silver hover:border-apple-charcoal"
                        }`}
                    >
                      Daily View
                    </button>
                    <button
                      onClick={() => {
                        setStep2View("detailed");
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150
                        ${
                          step2View === "detailed"
                            ? "bg-apple-charcoal text-white border-apple-charcoal"
                            : "bg-white text-apple-charcoal border-apple-silver hover:border-apple-charcoal"
                        }`}
                    >
                      Detailed Logs
                    </button>
                  </div>
                )}

                {records.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <select
                      value={step2SiteFilter}
                      onChange={(e) => setStep2SiteFilter(e.target.value)}
                      className="w-full px-3 h-10 rounded-2xl border border-apple-silver bg-white text-sm text-apple-charcoal
                        focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal transition-all"
                    >
                      <option value="ALL">All files/sites</option>
                      {availableSites.map((siteOption) => (
                        <option key={siteOption} value={siteOption}>
                          {siteOption}
                        </option>
                      ))}
                    </select>

                    <div className="relative w-full">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-silver"
                        size={16}
                      />

                      <input
                        type="text"
                        value={step2NameFilter}
                        onChange={(e) => setStep2NameFilter(e.target.value)}
                        placeholder="Search employee… ( / )"
                        id="searchEmployee"
                        className="w-full pl-9 pr-9 py-2.5 rounded-2xl border border-apple-silver bg-white text-sm"
                      />

                      {step2NameFilter && (
                        <button
                          onClick={() => setStep2NameFilter("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-apple-steel"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <input
                      type="date"
                      value={step2DateFilter}
                      onChange={(e) => setStep2DateFilter(e.target.value)}
                      className="w-full px-3 h-10 rounded-2xl border border-apple-silver bg-white text-sm text-apple-charcoal
                        focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal transition-all"
                    />

                    <select
                      value={step2Sort}
                      onChange={(e) =>
                        setStep2Sort(e.target.value as Step2Sort)
                      }
                      className="w-full px-3 h-10 rounded-2xl border border-apple-silver bg-white text-sm text-apple-charcoal
                        focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal transition-all"
                    >
                      <option value="date-asc">Date first (oldest)</option>
                      <option value="date-desc">Date first (newest)</option>
                      <option value="name-asc">Name first (A-Z)</option>
                      <option value="name-desc">Name first (Z-A)</option>
                    </select>

                    <button
                      onClick={() => {
                        setStep2SiteFilter("ALL");
                        setStep2NameFilter("");
                        setStep2DateFilter("");
                        setStep2Sort("date-asc");
                      }}
                      className="w-full px-3 h-10 rounded-2xl border border-apple-silver bg-white text-sm font-semibold text-apple-charcoal
                        hover:border-apple-charcoal transition-all"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}

                {records.length > 0 ? (
                  step2View === "daily" ? (
                    <div className="rounded-3xl border border-apple-mist bg-white shadow-apple-xs w-full">
                      <table className="w-full text-sm table-auto">
                        <thead>
                          <tr className="border-b border-apple-mist">
                            {[
                              "Date",
                              "Employee",
                              "Time1 In",
                              "Time1 Out",
                              "Time2 In",
                              "Time2 Out",
                              "OT In",
                              "OT Out",
                              "Hrs",
                              "Site",
                            ].map((h) => (
                              <th
                                key={h}
                                className="px-4 py-3.5 text-left text-2xs font-semibold uppercase tracking-widest text-apple-steel"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewDailyRows.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="py-10">
                                <div className="flex flex-col items-center justify-center text-center gap-3 text-apple-steel">
                                  <Search
                                    size={22}
                                    className="text-apple-silver"
                                  />

                                  <p className="text-sm font-semibold text-apple-charcoal">
                                    No employees found
                                  </p>

                                  <p className="text-xs text-apple-steel max-w-sm">
                                    Try clearing filters, searching another
                                    name, or changing the date.
                                  </p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            previewDailyRows.map((row) => (
                              <tr
                                key={`${row.date}-${row.employee}`}
                                className="border-b border-apple-mist/60 last:border-0 odd:bg-apple-snow/40 hover:bg-apple-snow/70 transition"
                              >
                                <td className="px-4 py-3 text-sm font-mono text-apple-ash">
                                  {row.date}
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                                  {highlight(row.employee, step2NameFilter)}
                                </td>
                                <td className="px-4 py-3 text-sm font-mono text-apple-ash">
                                  {row.time1In || "--:--"}
                                </td>
                                <td className="px-4 py-3 text-sm font-mono text-apple-ash">
                                  {row.time1Out || "--:--"}
                                </td>
                                <td className="px-4 py-3 text-sm font-mono text-apple-ash">
                                  {row.time2In || "--:--"}
                                </td>
                                <td className="px-4 py-3 text-sm font-mono text-apple-ash">
                                  {row.time2Out || "--:--"}
                                </td>
                                <td className="px-4 py-3 text-sm font-mono text-apple-ash">
                                  {row.otIn || "--:--"}
                                </td>
                                <td className="px-4 py-3 text-sm font-mono text-apple-ash">
                                  {row.otOut || "--:--"}
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                                  {row.hours.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-xs text-apple-smoke">
                                  {row.site.split(" ")[0]}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-3xl border border-apple-mist bg-white shadow-apple-xs [-webkit-overflow-scrolling:touch]">
                      <table className="w-full text-sm table-auto">
                        <thead>
                          <tr className="border-b border-apple-mist">
                            {[
                              "Date",
                              "Employee",
                              "Log Time",
                              "Type",
                              "Source",
                              "Site",
                            ].map((h) => (
                              <th
                                key={h}
                                className="px-4 py-3.5 text-left text-2xs font-semibold uppercase tracking-widest text-apple-steel"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRecords.map((r, idx) => (
                            <tr
                              key={`${r.employee}-${r.date}-${r.logTime}-${r.type}-${idx}`}
                              className="border-b border-apple-mist/60 last:border-0 odd:bg-apple-snow/40 hover:bg-apple-snow/70 transition"
                            >
                              <td className="px-4 py-3 text-sm font-mono text-apple-ash">
                                {r.date}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                                {r.employee}
                              </td>
                              <td className="px-4 py-3 text-sm font-mono text-apple-ash">
                                {r.logTime}
                              </td>
                              <td className="px-4 py-3 text-xs font-semibold text-apple-charcoal">
                                {r.type}
                              </td>
                              <td className="px-4 py-3 text-xs font-semibold text-apple-steel">
                                {r.source}
                              </td>
                              <td className="px-4 py-3 text-xs text-apple-smoke">
                                {r.site}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-apple-smoke">
                    No detailed time logs detected. Upload a raw biometric
                    attendance sheet with Date/Week or Date/Weekday and IN/OUT
                    time columns.
                  </p>
                )}

                {activeRowsCount > 0 && (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-apple-steel">
                      Showing {previewStart + 1}-
                      {Math.min(previewEnd, activeRowsCount)} of{" "}
                      {activeRowsCount}{" "}
                      {step2View === "daily"
                        ? "employee-day rows"
                        : "cleaned logs"}
                      {activeRowsCount !== totalRowsForCurrentView
                        ? ` (filtered from ${totalRowsForCurrentView}).`
                        : "."}
                    </p>

                    {activeRowsCount > PREVIEW_LIMIT && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {/* First */}
                        <button
                          onClick={() => setRecordsPage(1)}
                          disabled={recordsPage === 1}
                          className={`px-2.5 h-8 rounded-xl text-xs font-semibold border
      ${
        recordsPage === 1
          ? "border-apple-mist text-apple-silver cursor-not-allowed"
          : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
      }`}
                        >
                          First
                        </button>

                        {/* Previous */}
                        <button
                          onClick={() =>
                            setRecordsPage((p) => Math.max(1, p - 1))
                          }
                          disabled={recordsPage === 1}
                          className={`px-3 h-8 rounded-xl text-xs font-semibold border
      ${
        recordsPage === 1
          ? "border-apple-mist text-apple-silver cursor-not-allowed"
          : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
      }`}
                        >
                          <ArrowLeft size={16} />
                        </button>

                        {/* Page numbers */}
                        {pages.map((p) => (
                          <button
                            key={p}
                            onClick={() => setRecordsPage(p)}
                            className={`w-8 h-8 rounded-lg text-xs font-semibold border transition
        ${
          recordsPage === p
            ? "bg-apple-charcoal text-white border-apple-charcoal"
            : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
        }`}
                          >
                            {p}
                          </button>
                        ))}

                        {/* Next */}
                        <button
                          onClick={() =>
                            setRecordsPage((p) =>
                              Math.min(totalRecordPages, p + 1),
                            )
                          }
                          disabled={recordsPage === totalRecordPages}
                          className={`px-3 h-8 rounded-xl text-xs font-semibold border
      ${
        recordsPage === totalRecordPages
          ? "border-apple-mist text-apple-silver cursor-not-allowed"
          : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
      }`}
                        >
                          <ArrowRight size={16} />
                        </button>

                        {/* Last */}
                        <button
                          onClick={() => setRecordsPage(totalRecordPages)}
                          disabled={recordsPage === totalRecordPages}
                          className={`px-2.5 h-8 rounded-xl text-xs font-semibold border
      ${
        recordsPage === totalRecordPages
          ? "border-apple-mist text-apple-silver cursor-not-allowed"
          : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
      }`}
                        >
                          Last
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
        {/* Charts */}
        {employees.length > 0 && records.length > 0 && (
          <section
            className="animate-fade-up"
            style={{ animationFillMode: "both", animationDelay: "40ms" }}
          >
            <div className="bg-white rounded-3xl border border-[#F5F5F7] shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6 border-b border-[#F5F5F7]">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] font-mono font-semibold text-[#86868B] uppercase tracking-widest">
                    Data Analytics
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#1D1D1F] tracking-tight">
                  Visualized Attendance Data
                </h2>
                <p className="text-sm text-[#86868B] mt-1">
                  Overview of labor distribution and overtime trends across all
                  sites.
                </p>
              </div>

              {/* Content Area */}
              <div className="px-5 sm:px-8 py-6 sm:py-8 space-y-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Overtime Hours */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider ">
                      Overtime Hours by Branch
                    </h3>
                    <div className="h-[300px] w-full bg-white rounded-2xl border border-[#F5F5F7] p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={overtimeByBranch}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <XAxis
                            dataKey="branch"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#86868B", fontSize: 11 }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#86868B", fontSize: 11 }}
                          />
                          <Tooltip
                            cursor={{ fill: "#F5F5F7" }}
                            contentStyle={{
                              backgroundColor: "#fff",
                              borderRadius: "12px",
                              border: "1px solid #F5F5F7",
                              fontSize: "12px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                            }}
                          />
                          <Bar
                            dataKey="hours"
                            fill="#1D1D1F"
                            radius={[4, 4, 0, 0]}
                            barSize={48}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Workforce */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider">
                      Employees per Branch
                    </h3>
                    <div className="h-[300px] w-full bg-white rounded-2xl border border-[#F5F5F7] p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={workforceByBranch}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <XAxis
                            dataKey="branch"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#86868B", fontSize: 11 }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#86868B", fontSize: 11 }}
                          />
                          <Tooltip
                            cursor={{ fill: "#F5F5F7" }}
                            contentStyle={{
                              backgroundColor: "#fff",
                              borderRadius: "12px",
                              border: "1px solid #F5F5F7",
                            }}
                          />
                          <Bar
                            dataKey="employees"
                            fill="#1D1D1F"
                            radius={[4, 4, 0, 0]}
                            barSize={48}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Interactive Daily Labor Utilization */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider">
                        Daily Labor Utilization
                      </h3>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-[#1D1D1F]"></div>
                          <span className="text-[10px] font-medium text-[#1D1D1F]">
                            Current Period
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-[#86868B]">
                          LIVE TRACKING
                        </span>
                      </div>
                    </div>
                    <div className="h-[360px] w-full bg-white rounded-2xl border border-[#F5F5F7] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={dailyLaborHours}
                          margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                          onMouseMove={(e) => {
                            /* You can hook into state here for custom hover effects elsewhere */
                          }}
                        >
                          <defs>
                            <linearGradient
                              id="colorHours"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#1D1D1F"
                                stopOpacity={0.15}
                              />
                              <stop
                                offset="95%"
                                stopColor="#1D1D1F"
                                stopOpacity={0.01}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#F5F5F7"
                          />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fill: "#86868B",
                              fontSize: 10,
                              fontWeight: 500,
                            }}
                            dy={10}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#86868B", fontSize: 10 }}
                          />
                          <Tooltip
                            cursor={{
                              stroke: "#1D1D1F",
                              strokeWidth: 2,
                              strokeDasharray: "6 6",
                            }}
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-[#1D1D1F] text-white p-3 rounded-xl shadow-xl border border-white/10 backdrop-blur-md">
                                    <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1">
                                      {label}
                                    </p>
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-lg font-bold">
                                        {payload[0].value}
                                      </span>
                                      <span className="text-[10px] opacity-80">
                                        hrs utilized
                                      </span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="hours"
                            stroke="#1D1D1F"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorHours)"
                            animationBegin={200}
                            animationDuration={1200}
                            activeDot={{
                              r: 6,
                              fill: "#1D1D1F",
                              stroke: "#fff",
                              strokeWidth: 3,
                              style: {
                                filter:
                                  "drop-shadow(0px 2px 4px rgba(0,0,0,0.2))",
                              },
                            }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top OT Employees */}
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider">
                      Top Overtime Performers
                    </h3>
                    <div className="h-[350px] w-full bg-white rounded-2xl border border-[#F5F5F7] p-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topOTEmployees}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        >
                          <XAxis type="number" hide />
                          <YAxis
                            dataKey="name"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fill: "#1D1D1F",
                              fontSize: 12,
                              fontWeight: 500,
                            }}
                            width={140}
                          />
                          <Tooltip
                            cursor={{ fill: "#F5F5F7" }}
                            contentStyle={{
                              backgroundColor: "#fff",
                              borderRadius: "12px",
                              border: "1px solid #F5F5F7",
                            }}
                          />
                          <Bar
                            dataKey="hours"
                            fill="#1D1D1F"
                            radius={[0, 4, 4, 0]}
                            barSize={32}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

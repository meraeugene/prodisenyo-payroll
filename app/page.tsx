"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Download, ChevronRight } from "lucide-react";

import StepIndicator from "@/app/components/StepIndicator";
import UploadZone from "@/app/components/UploadZone";
import RateConfig from "@/app/components/RateConfig";
import SummaryCards from "@/app/components/SummaryCards";
import PayrollTable from "@/app/components/PayrollTable";
import ChartCard from "@/app/components/ChartCard";

import type { AttendanceRecord, Employee, PayrollConfig, Step } from "@/app/types";
import { calculateAll, getSummary, exportToCSV, exportLogsToCSV } from "@/app/lib/payroll";
import type { ParseResult } from "@/app/lib/parser";
import Footer from "./components/Footer";
import Nav from "./components/Nav";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

const DEFAULT_CONFIG: PayrollConfig = {
  defaultRateDay: 500,
  defaultRateHour: 62.5,
  otMultiplier: 1.25,
  periodLabel: "Current Period",
};

const PREVIEW_LIMIT = 40;

type Step2View = "daily" | "detailed";
type Step2Sort = "date-asc" | "date-desc" | "name-asc" | "name-desc";

interface DailyLogRow {
  date: string;
  employee: string;
  time1In: string;
  time1Out: string;
  time2In: string;
  time2Out: string;
  otIn: string;
  otOut: string;
  hours: number;
  site: string;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function earlierTime(current: string, incoming: string): string {
  if (!current) return incoming;
  return timeToMinutes(incoming) < timeToMinutes(current) ? incoming : current;
}

function laterTime(current: string, incoming: string): string {
  if (!current) return incoming;
  return timeToMinutes(incoming) > timeToMinutes(current) ? incoming : current;
}

function pairMinutes(inTime: string, outTime: string): number {
  if (!inTime || !outTime) return 0;
  const inMinutes = timeToMinutes(inTime);
  const outMinutes = timeToMinutes(outTime);
  if (outMinutes >= inMinutes) return outMinutes - inMinutes;
  return outMinutes + 24 * 60 - inMinutes;
}

function earliestNonEmptyTime(...times: string[]): string {
  const valid = times.filter(Boolean);
  if (valid.length === 0) return "";
  return valid.reduce((earliest, current) =>
    timeToMinutes(current) < timeToMinutes(earliest) ? current : earliest,
  );
}

function latestNonEmptyTime(...times: string[]): string {
  const valid = times.filter(Boolean);
  if (valid.length === 0) return "";
  return valid.reduce((latest, current) =>
    timeToMinutes(current) > timeToMinutes(latest) ? current : latest,
  );
}

function compareStep2Rows(
  aDate: string,
  aName: string,
  bDate: string,
  bName: string,
  sortMode: Step2Sort,
): number {
  if (sortMode === "date-asc") {
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    return aName.localeCompare(bName);
  }
  if (sortMode === "date-desc") {
    if (aDate !== bDate) return bDate.localeCompare(aDate);
    return aName.localeCompare(bName);
  }
  if (sortMode === "name-asc") {
    if (aName !== bName) return aName.localeCompare(bName);
    return aDate.localeCompare(bDate);
  }
  if (aName !== bName) return bName.localeCompare(aName);
  return aDate.localeCompare(bDate);
}

export default function HomePage() {
  const [step, setStep] = useState<Step>(1);
  const [step2View, setStep2View] = useState<Step2View>("daily");
  const [step2Sort, setStep2Sort] = useState<Step2Sort>("date-asc");
  const [recordsPage, setRecordsPage] = useState(1);
  const [step2SiteFilter, setStep2SiteFilter] = useState("ALL");
  const [step2NameFilter, setStep2NameFilter] = useState("");
  const [step2DateFilter, setStep2DateFilter] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [config, setConfig] = useState<PayrollConfig>(DEFAULT_CONFIG);
  const [period, setPeriod] = useState("Current Period");
  const [site, setSite] = useState("Unknown Site");
  const [rawRows, setRawRows] = useState(0);
  const [removedEntries, setRemovedEntries] = useState(0);

  const calculated = useMemo(
    () => calculateAll(employees, config),
    [employees, config],
  );
  const summary = useMemo(() => getSummary(calculated), [calculated]);

// Payroll Cost by Branch
const payrollByBranch = useMemo(() => {
  const map = new Map<string, number>();

  calculated.forEach((emp) => {
    const rec = records.find(
      (r) =>
        r.employee.trim().toLowerCase() === emp.name.trim().toLowerCase()
    );

    const branch = rec?.site?.split(" ")[0] ?? "Unknown";

    map.set(branch, (map.get(branch) ?? 0) + emp.grossPay);
  });

  return Array.from(map.entries())
  .map(([branch, payroll]) => ({
    branch,
    payroll: Math.round(payroll),
  }))
  .sort((a, b) => b.payroll - a.payroll);
}, [calculated, records]);

// Overtime by Branch
const overtimeByBranch = useMemo(() => {
  const map = new Map<string, number>();

  employees.forEach((emp) => {
    const rec = records.find(
      (r) =>
        r.employee.trim().toLowerCase() === emp.name.trim().toLowerCase()
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
      const otAsRegularOut = !regularOut ? latestNonEmptyTime(row.otOut, row.otIn) : "";
      const effectiveRegularOut = regularOut || otAsRegularOut;
      const regularMinutes = pairMinutes(regularIn, effectiveRegularOut);

      const usedOtAsRegularBoundary = !regularOut && Boolean(otAsRegularOut) && Boolean(regularIn);
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
        records.map((record) => record.site.trim()).filter((value) => value.length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [records]);

  const filteredDetailedRecords = useMemo(() => {
    const nameFilter = step2NameFilter.trim().toLowerCase();
    const dateFilter = step2DateFilter.trim();

    const filtered = records.filter((record) => {
      if (step2SiteFilter !== "ALL" && record.site !== step2SiteFilter) return false;
      if (dateFilter && record.date !== dateFilter) return false;
      if (nameFilter && !record.employee.toLowerCase().includes(nameFilter)) return false;
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
      if (step2SiteFilter !== "ALL" && row.site !== step2SiteFilter) return false;
      if (dateFilter && row.date !== dateFilter) return false;
      if (nameFilter && !row.employee.toLowerCase().includes(nameFilter)) return false;
      return true;
    });

    filtered.sort((a, b) =>
      compareStep2Rows(a.date, a.employee, b.date, b.employee, step2Sort),
    );

    return filtered;
  }, [dailyRows, step2SiteFilter, step2DateFilter, step2NameFilter, step2Sort]);

  const totalDailyHours = useMemo(
    () => filteredDailyRows.reduce((sum, row) => sum + row.hours, 0),
    [filteredDailyRows],
  );

  const workedDays = useMemo(
    () => filteredDailyRows.filter((row) => row.hours > 0).length,
    [filteredDailyRows],
  );

  const averageHoursPerWorkedDay = useMemo(
    () => (workedDays > 0 ? totalDailyHours / workedDays : 0),
    [totalDailyHours, workedDays],
  );

  const activeRowsCount =
    step2View === "daily" ? filteredDailyRows.length : filteredDetailedRecords.length;
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

  useEffect(() => {
    setRecordsPage((prev) => Math.min(prev, totalRecordPages));
  }, [totalRecordPages]);

  useEffect(() => {
    setRecordsPage(1);
  }, [step2View, step2Sort, step2SiteFilter, step2NameFilter, step2DateFilter]);

  useEffect(() => {
    if (step2SiteFilter !== "ALL" && !availableSites.includes(step2SiteFilter)) {
      setStep2SiteFilter("ALL");
    }
  }, [availableSites, step2SiteFilter]);

  const handleParsed = useCallback((result: ParseResult) => {
    setEmployees(result.employees);
    setRecords(result.records);
    setStep2View("daily");
    setStep2Sort("date-asc");
    setStep2SiteFilter("ALL");
    setStep2NameFilter("");
    setStep2DateFilter("");
    setRecordsPage(1);
    setPeriod(result.period);
    setSite(result.site);
    setRawRows(result.rawRows);
    setRemovedEntries(result.removedEntries);
    setConfig((c) => ({ ...c, periodLabel: result.period }));
    setStep(2);
  }, []);

  const handleUpdateEmployee = useCallback(
    (id: number, patch: Partial<Employee>) => {
      setEmployees((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );
    },
    [],
  );

  function handleReset() {
    setEmployees([]);
    setRecords([]);
    setStep2View("daily");
    setStep2Sort("date-asc");
    setStep2SiteFilter("ALL");
    setStep2NameFilter("");
    setStep2DateFilter("");
    setRecordsPage(1);
    setConfig(DEFAULT_CONFIG);
    setPeriod("Current Period");
    setSite("Unknown Site");
    setRawRows(0);
    setRemovedEntries(0);
    setStep(1);
  }

  return (
    <div className="min-h-screen bg-apple-snow">
      <Nav step={step} handleReset={handleReset} />

      <div className="md:hidden border-b border-apple-mist bg-white px-5 py-3">
        <StepIndicator current={step} />
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <section className="animate-fade-up" style={{ animationFillMode: "both" }}>
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
                <h2 className="text-[22px] font-bold text-apple-charcoal tracking-tight">
                  Upload Attendance Reports
                </h2>
                <p className="text-sm text-apple-smoke mt-1">
                  Upload one or more biometric attendance exports as XLS, XLSX, or CSV.
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
                <h2 className="text-[22px] font-bold text-apple-charcoal tracking-tight">
                  Review Attendance Logs
                </h2>
                <p className="text-sm text-apple-smoke mt-1">
                  Your biometric files are cleaned and converted into readable daily time logs.
                </p>
              </div>

              <div className="px-5 sm:px-8 py-6 sm:py-8 space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-apple-mist bg-apple-snow px-4 py-3">
                    <p className="text-2xs text-apple-steel uppercase tracking-widest">Raw Rows</p>
                    <p className="text-xl font-bold text-apple-charcoal mt-1">{rawRows}</p>
                  </div>
                  <div className="rounded-2xl border border-apple-mist bg-apple-snow px-4 py-3">
                    <p className="text-2xs text-apple-steel uppercase tracking-widest">Clean Logs</p>
                    <p className="text-xl font-bold text-apple-charcoal mt-1">{records.length}</p>
                  </div>
                  <div className="rounded-2xl border border-apple-mist bg-apple-snow px-4 py-3">
                    <p className="text-2xs text-apple-steel uppercase tracking-widest">Removed</p>
                    <p className="text-xl font-bold text-apple-charcoal mt-1">{removedEntries}</p>
                  </div>
                  <div className="rounded-2xl border border-apple-mist bg-apple-snow px-4 py-3">
                    <p className="text-2xs text-apple-steel uppercase tracking-widest">
                      Employees Processed
                    </p>
                    <p className="text-xl font-bold text-apple-charcoal mt-1">
                      {employees.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-apple-mist bg-apple-snow px-4 py-3">
                    <p className="text-2xs text-apple-steel uppercase tracking-widest">Total Hrs</p>
                    <p className="text-xl font-bold text-apple-charcoal mt-1">{totalDailyHours.toFixed(2)}</p>
                  </div>
                  <div className="rounded-2xl border border-apple-mist bg-apple-snow px-4 py-3">
                    <p className="text-2xs text-apple-steel uppercase tracking-widest">Avg Hrs/Day</p>
                    <p className="text-xl font-bold text-apple-charcoal mt-1">
                      {averageHoursPerWorkedDay.toFixed(2)}
                    </p>
                  </div>
                </div>

                {branchSummaries.length > 0 && (
                  <div className="rounded-2xl border border-apple-mist bg-white px-4 py-3">
                    <p className="text-2xs font-semibold text-apple-steel uppercase tracking-widest mb-1.5">
                      Branch Summary
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {branchSummaries.map((branch) => (
                        <span
                          key={branch.siteName}
                          className="inline-flex items-center gap-1 rounded-full border border-apple-mist bg-apple-snow px-3 py-1 text-[11px] text-apple-charcoal"
                        >
                          <span className="font-semibold">{branch.siteName}</span>
                          <span className="text-apple-steel">
                            – {branch.employeeCount}{" "}
                            {branch.employeeCount === 1 ? "employee" : "employees"}
                          </span>
                        </span>
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
                        ${step2View === "daily"
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
                        ${step2View === "detailed"
                          ? "bg-apple-charcoal text-white border-apple-charcoal"
                          : "bg-white text-apple-charcoal border-apple-silver hover:border-apple-charcoal"
                        }`}
                    >
                      Detailed Logs
                    </button>
                  </div>
                )}

                {records.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                    <select
                      value={step2SiteFilter}
                      onChange={(e) => setStep2SiteFilter(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-2xl border border-apple-silver bg-white text-sm text-apple-charcoal
                        focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal transition-all"
                    >
                      <option value="ALL">All files/sites</option>
                      {availableSites.map((siteOption) => (
                        <option key={siteOption} value={siteOption}>
                          {siteOption}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={step2NameFilter}
                      onChange={(e) => setStep2NameFilter(e.target.value)}
                      placeholder="Search employee name"
                      className="w-full px-3 py-2.5 rounded-2xl border border-apple-silver bg-white text-sm text-apple-charcoal
                        placeholder:text-apple-silver focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15
                        focus:border-apple-charcoal transition-all"
                    />

                    <input
                      type="date"
                      value={step2DateFilter}
                      onChange={(e) => setStep2DateFilter(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-2xl border border-apple-silver bg-white text-sm text-apple-charcoal
                        focus:outline-none focus:ring-2 focus:ring-apple-charcoal/15 focus:border-apple-charcoal transition-all"
                    />

                    <select
                      value={step2Sort}
                      onChange={(e) => setStep2Sort(e.target.value as Step2Sort)}
                      className="w-full px-3 py-2.5 rounded-2xl border border-apple-silver bg-white text-sm text-apple-charcoal
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
                      className="w-full px-3 py-2.5 rounded-2xl border border-apple-silver bg-white text-sm font-semibold text-apple-charcoal
                        hover:border-apple-charcoal transition-all"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}

                {records.length > 0 ? (
                  step2View === "daily" ? (
                    <div className="overflow-x-auto rounded-3xl border border-apple-mist bg-white shadow-apple-xs [-webkit-overflow-scrolling:touch]">
                      <table className="w-full text-sm min-w-[1120px]">
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
                          {previewDailyRows.map((row) => (
                            <tr
                              key={`${row.date}-${row.employee}`}
                              className="border-b border-apple-mist/60 last:border-0"
                            >
                              <td className="px-4 py-3 text-xs font-mono text-apple-ash">{row.date}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">{row.employee}</td>
                              <td className="px-4 py-3 text-xs font-mono text-apple-ash">{row.time1In || "--:--"}</td>
                              <td className="px-4 py-3 text-xs font-mono text-apple-ash">{row.time1Out || "--:--"}</td>
                              <td className="px-4 py-3 text-xs font-mono text-apple-ash">{row.time2In || "--:--"}</td>
                              <td className="px-4 py-3 text-xs font-mono text-apple-ash">{row.time2Out || "--:--"}</td>
                              <td className="px-4 py-3 text-xs font-mono text-apple-ash">{row.otIn || "--:--"}</td>
                              <td className="px-4 py-3 text-xs font-mono text-apple-ash">{row.otOut || "--:--"}</td>
                              <td className="px-4 py-3 text-xs font-semibold text-apple-charcoal">{row.hours.toFixed(2)}</td>
                              <td className="px-4 py-3 text-xs text-apple-smoke">{row.site}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-3xl border border-apple-mist bg-white shadow-apple-xs [-webkit-overflow-scrolling:touch]">
                      <table className="w-full text-sm min-w-[720px]">
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
                              className="border-b border-apple-mist/60 last:border-0"
                            >
                              <td className="px-4 py-3 text-xs font-mono text-apple-ash">{r.date}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">{r.employee}</td>
                              <td className="px-4 py-3 text-xs font-mono text-apple-ash">{r.logTime}</td>
                              <td className="px-4 py-3 text-xs font-semibold text-apple-charcoal">{r.type}</td>
                              <td className="px-4 py-3 text-xs font-semibold text-apple-steel">{r.source}</td>
                              <td className="px-4 py-3 text-xs text-apple-smoke">{r.site}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-apple-smoke">
                    No detailed time logs detected. Upload a raw biometric attendance sheet with Date/Week or Date/Weekday and IN/OUT time columns.
                  </p>
                )}

                {activeRowsCount > 0 && (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-apple-steel">
                      Showing {previewStart + 1}-{Math.min(previewEnd, activeRowsCount)} of {activeRowsCount}{" "}
                      {step2View === "daily" ? "employee-day rows" : "cleaned logs"}
                      {activeRowsCount !== totalRowsForCurrentView
                        ? ` (filtered from ${totalRowsForCurrentView}).`
                        : "."}
                    </p>

                    {activeRowsCount > PREVIEW_LIMIT && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setRecordsPage((p) => Math.max(1, p - 1))}
                          disabled={recordsPage === 1}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150
                            ${recordsPage === 1
                              ? "border-apple-mist text-apple-silver cursor-not-allowed"
                              : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
                            }`}
                        >
                          Previous
                        </button>

                        <span className="text-xs font-semibold text-apple-ash min-w-[72px] text-center">
                          Page {recordsPage} / {totalRecordPages}
                        </span>

                        <button
                          onClick={() => setRecordsPage((p) => Math.min(totalRecordPages, p + 1))}
                          disabled={recordsPage === totalRecordPages}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150
                            ${recordsPage === totalRecordPages
                              ? "border-apple-mist text-apple-silver cursor-not-allowed"
                              : "border-apple-silver text-apple-charcoal hover:border-apple-charcoal"
                            }`}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                  {step === 2 ? (
                    <button
                      onClick={() => setStep(3)}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl
                        bg-apple-charcoal text-white text-sm font-semibold
                        hover:bg-apple-black transition-all duration-150 active:scale-[0.98]
                        shadow-apple-lg"
                    >
                      Continue to Configure Rates
                      <ChevronRight size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setStep(3)}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl
                        bg-white border border-apple-silver text-apple-charcoal text-sm font-semibold
                        hover:border-apple-charcoal transition-all duration-150 active:scale-[0.98]"
                    >
                      Open Configure Rates
                      <ChevronRight size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {step >= 3 && (
          <>
            <section
              className="animate-fade-up"
              style={{ animationFillMode: "both", animationDelay: "80ms" }}
            >
              <div className="bg-white rounded-3xl border border-apple-mist shadow-apple-xs overflow-hidden">
                <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6 border-b border-apple-mist">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xs font-mono font-semibold text-apple-steel uppercase tracking-widest">
                      Step 3
                    </span>
                    <span className="text-2xs font-semibold text-apple-smoke bg-apple-snow px-2 py-0.5 rounded-full border border-apple-mist">
                      {period}
                    </span>
                  </div>
                  <h2 className="text-[22px] font-bold text-apple-charcoal tracking-tight">
                    Review Payroll Settings
                  </h2>
                  <p className="text-sm text-apple-smoke mt-1">
                    Set default daily and hourly rates. You can fine-tune per employee in the table.
                  </p>
                </div>
                <div className="px-5 sm:px-8 py-6 sm:py-8">
                  <RateConfig config={config} onChange={setConfig} />
                </div>
              </div>
            </section>

            <section
              className="animate-fade-up"
              style={{ animationFillMode: "both", animationDelay: "120ms" }}
            >
              <SummaryCards summary={summary} period={period} />
            </section>

            <div className="flex justify-between items-center gap-2 pb-2 no-print flex-wrap">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl
                  bg-white border border-apple-silver text-apple-charcoal text-sm font-semibold
                  hover:border-apple-charcoal transition-all duration-150 active:scale-[0.98]"
              >
                Back to Attendance Review
              </button>

              {step === 3 ? (
                <button
                  onClick={() => setStep(4)}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl
                    bg-apple-charcoal text-white text-sm font-semibold
                    hover:bg-apple-black transition-all duration-150 active:scale-[0.98]
                    shadow-apple-lg"
                >
                  Continue to Review Payroll
                  <ChevronRight size={15} />
                </button>
              ) : (
                <button
                  onClick={() => setStep(4)}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl
                    bg-white border border-apple-silver text-apple-charcoal text-sm font-semibold
                    hover:border-apple-charcoal transition-all duration-150 active:scale-[0.98]"
                >
                  Open Review Payroll
                  <ChevronRight size={15} />
                </button>
              )}
            </div>
          </>
        )}

        {step >= 4 && (
  <section className="animate-fade-up">
    <div className="bg-white rounded-3xl border border-apple-mist shadow-apple-xs p-6 sm:p-8 space-y-6">

      <div>
        <h2 className="text-[22px] font-bold text-apple-charcoal">
          Payroll Insights
        </h2>
        <p className="text-sm text-apple-smoke">
          Financial overview across branches.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* Payroll by Branch */}
        <ChartCard title="Payroll Cost by Branch">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={payrollByBranch}>
              <XAxis dataKey="branch" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="payroll" fill="#111827" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Overtime by Branch */}
        <ChartCard title="Overtime Hours by Branch">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overtimeByBranch}>
              <XAxis dataKey="branch" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="#4b5563" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Workforce */}
        <ChartCard title="Employees per Branch">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workforceByBranch}>
              <XAxis dataKey="branch" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="employees" fill="#1f2937" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Daily Labor */}
        <ChartCard title="Daily Labor Hours">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyLaborHours}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="hours"
                stroke="#111827"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top OT Employees */}
        <ChartCard title="Top Overtime Employees">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topOTEmployees} layout="vertical">
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip />
              <Bar dataKey="hours" fill="#111827" radius={[0,6,6,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>
    </div>
  </section>
)}
      </main>

      <Footer />
    </div>
  );
}

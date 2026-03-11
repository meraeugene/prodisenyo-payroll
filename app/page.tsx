"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Pencil,
  Search,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import StepIndicator from "@/components/StepIndicator";
import UploadZone from "@/components/UploadZone";
import ChartTooltip from "@/components/charts/ChartTooltip";
import { highlight } from "@/components/Highlight";
import type {
  AttendanceRecord,
  AuditLogEntry,
  PayrollEntry,
  PayrollSettingsState,
  Step,
  Step2Sort,
  Step2View,
} from "@/types";
import type { ParseResult } from "@/app/lib/parser";
import {
  buildDailyLogRows,
  exportPayrollToXlsx,
  formatNumber,
  formatPHP,
  generatePayrollEntries,
  recalculatePayrollEntry,
  summarizePayroll,
} from "@/app/lib/payroll";
import {
  defaultPayrollSettings,
  loadPayrollSettings,
  saveAttendanceSnapshot,
} from "@/app/lib/storage";
import { compareStep2Rows } from "@/lib/utils";

const STEP2_PER_PAGE = 12;
const STEP3_PER_PAGE = 10;

const AUDIT_FIELDS: Array<{ key: keyof PayrollEntry; label: string }> = [
  { key: "date", label: "Date" },
  { key: "hoursWorked", label: "Hours Worked" },
  { key: "overtimeHours", label: "Overtime Hours" },
  { key: "rate", label: "Rate" },
  { key: "bonuses", label: "Bonuses" },
  { key: "deductions", label: "Deductions" },
];

export default function HomePage() {
  const [step, setStep] = useState<Step>(1);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [periodLabel, setPeriodLabel] = useState("Current Period");
  const [siteLabel, setSiteLabel] = useState("Unknown Site");
  const [removedEntries, setRemovedEntries] = useState(0);
  const [step2View, setStep2View] = useState<Step2View>("daily");
  const [step2Sort, setStep2Sort] = useState<Step2Sort>("date-asc");
  const [step2SiteFilter, setStep2SiteFilter] = useState("ALL");
  const [step2DateFilter, setStep2DateFilter] = useState("");
  const [step2NameFilter, setStep2NameFilter] = useState("");
  const [step2Page, setStep2Page] = useState(1);
  const [payrollSettings, setPayrollSettings] =
    useState<PayrollSettingsState>(defaultPayrollSettings());
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<PayrollEntry | null>(null);
  const [editDraft, setEditDraft] = useState<PayrollEntry | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => setPayrollSettings(loadPayrollSettings()), []);
  useEffect(() => {
    const refresh = () => setPayrollSettings(loadPayrollSettings());
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  useEffect(() => {
    setPayrollEntries((prev) =>
      prev.map((entry) => recalculatePayrollEntry(entry, payrollSettings)),
    );
  }, [payrollSettings]);

  const dailyRows = useMemo(() => buildDailyLogRows(records), [records]);
  const availableSites = useMemo(
    () =>
      Array.from(new Set(records.map((record) => record.site).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [records],
  );

  const filteredDailyRows = useMemo(() => {
    const nameQuery = step2NameFilter.trim().toLowerCase();
    return dailyRows
      .filter((row) => {
        if (step2SiteFilter !== "ALL" && row.site !== step2SiteFilter) return false;
        if (step2DateFilter && row.date !== step2DateFilter) return false;
        if (nameQuery && !row.workerName.toLowerCase().includes(nameQuery)) return false;
        return true;
      })
      .sort((a, b) =>
        compareStep2Rows(a.date, a.workerName, b.date, b.workerName, step2Sort),
      );
  }, [dailyRows, step2DateFilter, step2NameFilter, step2SiteFilter, step2Sort]);

  const filteredRecords = useMemo(() => {
    const nameQuery = step2NameFilter.trim().toLowerCase();
    return records
      .filter((record) => {
        if (step2SiteFilter !== "ALL" && record.site !== step2SiteFilter) return false;
        if (step2DateFilter && record.date !== step2DateFilter) return false;
        if (nameQuery && !record.workerName.toLowerCase().includes(nameQuery)) return false;
        return true;
      })
      .sort((a, b) => {
        const byPrimary = compareStep2Rows(
          a.date,
          a.workerName,
          b.date,
          b.workerName,
          step2Sort,
        );
        if (byPrimary !== 0) return byPrimary;
        if (a.logTime !== b.logTime) return a.logTime.localeCompare(b.logTime);
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.source.localeCompare(b.source);
      });
  }, [records, step2DateFilter, step2NameFilter, step2SiteFilter, step2Sort]);

  const step2Count = step2View === "daily" ? filteredDailyRows.length : filteredRecords.length;
  const step2Pages = Math.max(1, Math.ceil(step2Count / STEP2_PER_PAGE));
  const step2Start = (step2Page - 1) * STEP2_PER_PAGE;
  const step2Rows =
    step2View === "daily"
      ? filteredDailyRows.slice(step2Start, step2Start + STEP2_PER_PAGE)
      : filteredRecords.slice(step2Start, step2Start + STEP2_PER_PAGE);

  useEffect(() => setStep2Page((prev) => Math.min(prev, step2Pages)), [step2Pages]);
  useEffect(() => setStep2Page(1), [
    step2View,
    step2Sort,
    step2SiteFilter,
    step2DateFilter,
    step2NameFilter,
  ]);

  const chartOT = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of dailyRows) map.set(row.site, (map.get(row.site) ?? 0) + row.overtimeHours);
    return Array.from(map.entries()).map(([site, hours]) => ({ site, hours: Number(hours.toFixed(2)) }));
  }, [dailyRows]);
  const chartWorkers = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const record of records) {
      if (!map.has(record.site)) map.set(record.site, new Set());
      map.get(record.site)?.add(record.mergeKey);
    }
    return Array.from(map.entries()).map(([site, workers]) => ({ site, workers: workers.size }));
  }, [records]);
  const chartDailyHours = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of dailyRows) map.set(row.date, (map.get(row.date) ?? 0) + row.totalHours);
    return Array.from(map.entries())
      .map(([date, hours]) => ({ date: formatDateDisplay(date), hours: Number(hours.toFixed(2)) }))
      .sort((a, b) => dateDisplayToIso(a.date).localeCompare(dateDisplayToIso(b.date)));
  }, [dailyRows]);
  const chartTopOT = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of dailyRows) map.set(row.workerName, (map.get(row.workerName) ?? 0) + row.overtimeHours);
    return Array.from(map.entries())
      .map(([worker, hours]) => ({ worker, hours: Number(hours.toFixed(2)) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);
  }, [dailyRows]);

  const handleParsed = useCallback((result: ParseResult) => {
    setRecords(result.records);
    setPeriodLabel(result.period);
    setSiteLabel(result.site);
    setRemovedEntries(result.removedEntries);
    setStep2View("daily");
    setStep2Sort("date-asc");
    setStep2SiteFilter("ALL");
    setStep2DateFilter("");
    setStep2NameFilter("");
    setStep2Page(1);
    setPayrollEntries([]);
    setAuditLogs([]);
    setStep(2);
    saveAttendanceSnapshot({
      period: result.period,
      site: result.site,
      records: result.records,
      savedAt: new Date().toISOString(),
    });
  }, []);

  const clearFilters = () => {
    setStep2Sort("date-asc");
    setStep2SiteFilter("ALL");
    setStep2DateFilter("");
    setStep2NameFilter("");
    setStep2Page(1);
  };
  const handleReset = useCallback(() => {
    setStep(1);
    setRecords([]);
    setPeriodLabel("Current Period");
    setSiteLabel("Unknown Site");
    setRemovedEntries(0);
    clearFilters();
    setStep2View("daily");
    setPayrollEntries([]);
    setAuditLogs([]);
    setEditingEntry(null);
    setEditDraft(null);
  }, []);

  const handleGeneratePayroll = () =>
    setPayrollEntries(generatePayrollEntries(dailyRows, payrollSettings));

  const handleExportPayroll = async () => {
    if (payrollEntries.length === 0 || exporting) return;
    setExporting(true);
    try {
      await exportPayrollToXlsx(payrollEntries, summarizePayroll(payrollEntries).rows, periodLabel);
    } finally {
      setExporting(false);
    }
  };

  const saveEdit = () => {
    if (!editingEntry || !editDraft) return;
    const roleSetting = payrollSettings.roleRates.find((item) => item.role === editDraft.role) ?? payrollSettings.roleRates[0];
    const nextEntry = recalculatePayrollEntry(
      {
        ...editDraft,
        customRate: Math.abs(editDraft.rate - roleSetting.dailyRate) > 0.0001,
        id: `${editDraft.date}|||${editDraft.site.toLowerCase()}|||${editDraft.mergeKey}`,
      },
      payrollSettings,
    );
    const logs: AuditLogEntry[] = [];
    for (const field of AUDIT_FIELDS) {
      const oldValue = normalizeAuditValue(editingEntry[field.key]);
      const newValue = normalizeAuditValue(nextEntry[field.key]);
      if (oldValue !== newValue) {
        logs.push({
          id: `${Date.now()}-${field.key}-${logs.length}`,
          user: "Payroll Manager",
          worker: `${editingEntry.workerName} (${editingEntry.role})`,
          field: field.label,
          oldValue,
          newValue,
          changedAt: new Date().toLocaleString("en-PH", {
            month: "short",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
      }
    }
    setPayrollEntries((prev) => prev.map((entry) => (entry.id === editingEntry.id ? nextEntry : entry)));
    if (logs.length > 0) setAuditLogs((prev) => [...logs.reverse(), ...prev].slice(0, 250));
    setEditingEntry(null);
    setEditDraft(null);
  };

  return (
    <div className="min-h-screen bg-apple-snow">
      <Nav step={step} handleReset={handleReset} />
      <div className="md:hidden border-b border-apple-mist bg-white px-5 py-3">
        <StepIndicator current={step} />
      </div>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <section className="bg-white rounded-3xl border border-apple-mist shadow-apple-xs overflow-hidden">
          <div className="px-5 sm:px-8 py-6 border-b border-apple-mist">
            <p className="text-2xs uppercase font-semibold tracking-widest text-apple-steel">Step 1</p>
            <h2 className="text-xl sm:text-2xl font-bold text-apple-charcoal">Upload Attendance</h2>
          </div>
          <div className={`px-5 sm:px-8 py-6 ${step > 1 ? "opacity-50 pointer-events-none" : ""}`}>
            <UploadZone onParsed={handleParsed} />
          </div>
        </section>

        {step >= 2 && (
          <section className="bg-white rounded-3xl border border-apple-mist shadow-apple-xs overflow-hidden">
            <div className="px-5 sm:px-8 py-6 border-b border-apple-mist">
              <p className="text-2xs uppercase font-semibold tracking-widest text-apple-steel">Step 2</p>
              <h2 className="text-xl sm:text-2xl font-bold text-apple-charcoal">Review Attendance</h2>
              <p className="text-sm text-apple-smoke mt-1">
                Site: {siteLabel} | Period: {periodLabel} | Removed entries: {removedEntries}
              </p>
            </div>
            <div className="px-5 sm:px-8 py-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setStep2View("daily")} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${step2View === "daily" ? "bg-apple-charcoal text-white border-apple-charcoal" : "bg-white border-apple-silver text-apple-charcoal"}`}>Attendance Viewer</button>
                <button onClick={() => setStep2View("detailed")} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${step2View === "detailed" ? "bg-apple-charcoal text-white border-apple-charcoal" : "bg-white border-apple-silver text-apple-charcoal"}`}>Raw Logs</button>
                <button onClick={() => setStep(3)} className="ml-auto px-4 py-2 rounded-xl bg-apple-charcoal text-white text-sm font-semibold">Continue to Step 3</button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                <select
                  value={step2SiteFilter}
                  onChange={(event) => setStep2SiteFilter(event.target.value)}
                  className="h-10 px-3 rounded-2xl border border-apple-silver bg-white text-sm"
                >
                  <option value="ALL">All Sites</option>
                  {availableSites.map((site) => (
                    <option key={site} value={site}>
                      {site}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={step2DateFilter}
                  onChange={(event) => setStep2DateFilter(event.target.value)}
                  className="h-10 px-3 rounded-2xl border border-apple-silver bg-white text-sm"
                />
                <div className="relative lg:col-span-2">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-silver"
                  />
                  <input
                    value={step2NameFilter}
                    onChange={(event) => setStep2NameFilter(event.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-2xl border border-apple-silver bg-white text-sm"
                    placeholder="Search worker"
                  />
                </div>
                <select
                  value={step2Sort}
                  onChange={(event) => setStep2Sort(event.target.value as Step2Sort)}
                  className="h-10 px-3 rounded-2xl border border-apple-silver bg-white text-sm"
                >
                  <option value="date-asc">Date (oldest first)</option>
                  <option value="date-desc">Date (newest first)</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                </select>
              </div>
              <div className="flex justify-between items-center gap-3 flex-wrap">
                <p className="text-xs text-apple-steel">
                  Showing {step2Count === 0 ? 0 : step2Start + 1}-
                  {Math.min(step2Start + STEP2_PER_PAGE, step2Count)} of {step2Count}.
                </p>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-apple-silver text-xs font-semibold text-apple-charcoal"
                >
                  <X size={12} />
                  Clear Filters
                </button>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-apple-mist">
                {step2View === "daily" ? (
                  <AttendanceViewer
                    rows={step2Rows as ReturnType<typeof buildDailyLogRows>}
                    query={step2NameFilter}
                  />
                ) : (
                  <RawLogsViewer rows={step2Rows as AttendanceRecord[]} query={step2NameFilter} />
                )}
              </div>
              <Pagination page={step2Page} totalPages={step2Pages} onChange={setStep2Page} />
            </div>
          </section>
        )}

        {records.length > 0 && (
          <section className="bg-white rounded-3xl border border-apple-mist shadow-apple-xs overflow-hidden">
            <div className="px-5 sm:px-8 py-6 border-b border-apple-mist">
              <h2 className="text-xl sm:text-2xl font-bold text-apple-charcoal">
                Attendance Charts
              </h2>
              <p className="text-sm text-apple-smoke mt-1">
                Quick visual summaries across all uploaded sites.
              </p>
            </div>
            <div className="px-5 sm:px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Overtime Hours by Site">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartOT}>
                    <XAxis dataKey="site" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip content={(props) => <ChartTooltip {...props} unit="OT hrs" />} />
                    <Bar dataKey="hours" fill="#1D1D1F" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Workers per Site">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartWorkers}>
                    <XAxis dataKey="site" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip content={(props) => <ChartTooltip {...props} unit="workers" />} />
                    <Bar dataKey="workers" fill="#1D1D1F" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Daily Labor Hours">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartDailyHours}>
                    <defs>
                      <linearGradient id="hoursFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1D1D1F" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#1D1D1F" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F2" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip content={(props) => <ChartTooltip {...props} unit="hours" />} />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      stroke="#1D1D1F"
                      fill="url(#hoursFill)"
                      strokeWidth={1.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Top Overtime Workers">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartTopOT} layout="vertical" margin={{ left: 40 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="worker"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11 }}
                      width={120}
                    />
                    <Tooltip content={(props) => <ChartTooltip {...props} unit="OT hrs" />} />
                    <Bar dataKey="hours" fill="#1D1D1F" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </section>
        )}

        {step >= 3 && (
          <section className="bg-white rounded-3xl border border-apple-mist shadow-apple-xs overflow-hidden">
            <div className="px-5 sm:px-8 py-6 border-b border-apple-mist">
              <p className="text-2xs uppercase font-semibold tracking-widest text-apple-steel">
                Step 3
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-apple-charcoal">
                Generate Payroll
              </h2>
            </div>
            <div className="px-5 sm:px-8 py-6 space-y-5">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleGeneratePayroll}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-apple-charcoal text-white"
                >
                  Generate Payroll
                </button>
                <button
                  onClick={handleExportPayroll}
                  disabled={payrollEntries.length === 0 || exporting}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 ${payrollEntries.length > 0 ? "border border-apple-silver text-apple-charcoal bg-white" : "bg-apple-mist text-apple-steel cursor-not-allowed"}`}
                >
                  <Download size={14} />
                  {exporting ? "Exporting..." : "Export Excel"}
                </button>
                <Link href="/payroll-settings" className="px-4 py-2 rounded-xl border border-apple-silver text-sm font-semibold text-apple-charcoal">Edit Rates</Link>
                <Link href="/attendance-logs" className="px-4 py-2 rounded-xl border border-apple-silver text-sm font-semibold text-apple-charcoal">View Attendance Logs</Link>
              </div>
              <PayrollSummaryTables entries={payrollEntries} onEdit={(entry) => {
                setEditingEntry(entry);
                setEditDraft({ ...entry });
              }} />
              <AuditTable logs={auditLogs} />
            </div>
          </section>
        )}
      </main>

      <Footer />

      {editingEntry && editDraft && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl mx-auto bg-white rounded-3xl border border-apple-mist shadow-apple-lg p-6 space-y-4"
          >
            <h3 className="text-lg font-bold text-apple-charcoal">Edit Payroll Entry</h3>
            <p className="text-sm text-apple-smoke">{editingEntry.workerName} ({editingEntry.role}) - {editingEntry.site}</p>
            <EditField type="date" label="Date" value={editDraft.date} onChange={(value) => setEditDraft((prev) => (prev ? { ...prev, date: value } : prev))} />
            <EditField type="number" label="Hours Worked" value={editDraft.hoursWorked} onChange={(value) => setEditDraft((prev) => (prev ? { ...prev, hoursWorked: Number(value) || 0 } : prev))} />
            <EditField type="number" label="Daily Rate" value={editDraft.rate} onChange={(value) => setEditDraft((prev) => (prev ? { ...prev, rate: Number(value) || 0 } : prev))} />
            <EditField type="number" label="Overtime Hours" value={editDraft.overtimeHours} onChange={(value) => setEditDraft((prev) => (prev ? { ...prev, overtimeHours: Number(value) || 0 } : prev))} />
            <EditField type="number" label="Bonuses" value={editDraft.bonuses} onChange={(value) => setEditDraft((prev) => (prev ? { ...prev, bonuses: Number(value) || 0 } : prev))} />
            <EditField type="number" label="Deductions" value={editDraft.deductions} onChange={(value) => setEditDraft((prev) => (prev ? { ...prev, deductions: Number(value) || 0 } : prev))} />
            <div className="pt-2 flex justify-end gap-2">
              <button onClick={() => { setEditingEntry(null); setEditDraft(null); }} className="px-4 py-2 rounded-xl border border-apple-silver text-sm font-semibold">Cancel</button>
              <button onClick={saveEdit} className="px-4 py-2 rounded-xl bg-apple-charcoal text-sm font-semibold text-white">Save Changes</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function AttendanceViewer({
  rows,
  query,
}: {
  rows: ReturnType<typeof buildDailyLogRows>;
  query: string;
}) {
  return (
    <table className="w-full text-sm min-w-[980px]">
      <thead>
        <tr className="border-b border-apple-mist">
          {["Worker", "Role", "Site", "Date", "Time In", "Time Out", "Hours"].map((header) => (
            <th key={header} className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-widest text-apple-steel">{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.date}-${row.site}-${row.mergeKey}`} className="border-b border-apple-mist/60 odd:bg-apple-snow/40">
            <td className="px-4 py-3 font-semibold text-apple-charcoal">{highlight(row.workerName, query)}</td>
            <td className="px-4 py-3 text-xs text-apple-ash">{row.role}</td>
            <td className="px-4 py-3 text-xs text-apple-ash">{row.site}</td>
            <td className="px-4 py-3 text-sm font-mono text-apple-ash">{formatDateDisplay(row.date)}</td>
            <td className="px-4 py-3 text-sm font-mono text-apple-ash">{row.timeIn || "-"}</td>
            <td className="px-4 py-3 text-sm font-mono text-apple-ash">{row.timeOut || "-"}</td>
            <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">{formatNumber(row.totalHours, 2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RawLogsViewer({ rows, query }: { rows: AttendanceRecord[]; query: string }) {
  return (
    <table className="w-full text-sm min-w-[900px]">
      <thead>
        <tr className="border-b border-apple-mist">
          {["Date", "Worker", "Role", "Site", "Time", "Type", "Source"].map((header) => (
            <th key={header} className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-widest text-apple-steel">{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((record, index) => (
          <tr key={`${record.date}-${record.mergeKey}-${record.logTime}-${index}`} className="border-b border-apple-mist/60 odd:bg-apple-snow/40">
            <td className="px-4 py-3 text-sm font-mono text-apple-ash">{formatDateDisplay(record.date)}</td>
            <td className="px-4 py-3 font-semibold text-apple-charcoal">{highlight(record.workerName, query)}</td>
            <td className="px-4 py-3 text-xs text-apple-ash">{record.role}</td>
            <td className="px-4 py-3 text-xs text-apple-ash">{record.site}</td>
            <td className="px-4 py-3 text-sm font-mono text-apple-ash">{record.logTime}</td>
            <td className="px-4 py-3 text-xs text-apple-charcoal">{record.type}</td>
            <td className="px-4 py-3 text-xs text-apple-steel">{record.source}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PayrollSummaryTables({
  entries,
  onEdit,
}: {
  entries: PayrollEntry[];
  onEdit: (entry: PayrollEntry) => void;
}) {
  const summary = summarizePayroll(entries);
  const [entryPage, setEntryPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(entries.length / STEP3_PER_PAGE));
  const start = (entryPage - 1) * STEP3_PER_PAGE;
  const pageRows = entries.slice(start, start + STEP3_PER_PAGE);

  useEffect(() => setEntryPage((prev) => Math.min(prev, totalPages)), [totalPages]);
  useEffect(() => setEntryPage(1), [entries.length]);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card label="Workers" value={`${summary.summary.totalWorkers}`} />
        <Card label="Days" value={`${summary.summary.totalDays}`} />
        <Card label="Hours" value={formatNumber(summary.summary.totalHours, 2)} />
        <Card label="Net Pay" value={formatPHP(summary.summary.totalNetPay)} />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-apple-mist">
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr className="border-b border-apple-mist">
              {["Worker", "Role", "Site", "Days", "Rate", "Total Pay"].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-widest text-apple-steel">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row) => (
              <tr key={`${row.site}-${row.mergeKey}`} className="border-b border-apple-mist/60 odd:bg-apple-snow/40">
                <td className="px-4 py-3 font-semibold text-apple-charcoal">{row.workerName}</td>
                <td className="px-4 py-3 text-xs text-apple-ash">{row.role}</td>
                <td className="px-4 py-3 text-xs text-apple-ash">{row.site}</td>
                <td className="px-4 py-3 text-sm font-mono text-apple-ash">{row.days}</td>
                <td className="px-4 py-3 text-sm font-mono text-apple-ash">{formatPHP(row.rate)}</td>
                <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">{formatPHP(row.totalPay)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-apple-mist">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="border-b border-apple-mist">
              {["Worker", "Role", "Site", "Date", "Hours", "OT", "Rate", "Net", "Edit"].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-widest text-apple-steel">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((entry) => (
              <tr key={entry.id} className="border-b border-apple-mist/60 odd:bg-apple-snow/40">
                <td className="px-4 py-3 font-semibold text-apple-charcoal">{entry.workerName}</td>
                <td className="px-4 py-3 text-xs text-apple-ash">{entry.role}</td>
                <td className="px-4 py-3 text-xs text-apple-ash">{entry.site}</td>
                <td className="px-4 py-3 text-sm font-mono text-apple-ash">{formatDateDisplay(entry.date)}</td>
                <td className="px-4 py-3 text-sm font-mono text-apple-ash">{formatNumber(entry.hoursWorked, 2)}</td>
                <td className="px-4 py-3 text-sm font-mono text-apple-ash">{formatNumber(entry.overtimeHours, 2)}</td>
                <td className="px-4 py-3 text-sm font-mono text-apple-ash">{formatPHP(entry.rate)}</td>
                <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">{formatPHP(entry.netPay)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => onEdit(entry)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold border-apple-silver text-apple-charcoal"><Pencil size={12} /> Edit</button>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-apple-smoke">Generate payroll to show entries.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={entryPage} totalPages={totalPages} onChange={setEntryPage} />
    </>
  );
}

function AuditTable({ logs }: { logs: AuditLogEntry[] }) {
  return (
    <div className="rounded-2xl border border-apple-mist overflow-x-auto">
      <table className="w-full text-sm min-w-[860px]">
        <thead>
          <tr className="border-b border-apple-mist">
            {["User", "Worker", "Field", "Old", "New", "Time"].map((header) => (
              <th key={header} className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-widest text-apple-steel">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-apple-mist/60">
              <td className="px-4 py-3 text-xs text-apple-charcoal">{log.user}</td>
              <td className="px-4 py-3 text-xs text-apple-charcoal">{log.worker}</td>
              <td className="px-4 py-3 text-xs text-apple-ash">{log.field}</td>
              <td className="px-4 py-3 text-xs font-mono text-apple-ash">{log.oldValue}</td>
              <td className="px-4 py-3 text-xs font-mono text-apple-charcoal">{log.newValue}</td>
              <td className="px-4 py-3 text-xs text-apple-steel">{log.changedAt}</td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-apple-smoke">No payroll edits yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void; }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-apple-steel">Page {page} of {totalPages}</p>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} className={`h-8 px-2 rounded-lg border ${page === 1 ? "border-apple-mist text-apple-silver" : "border-apple-silver text-apple-charcoal"}`}><ArrowLeft size={14} /></button>
        <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className={`h-8 px-2 rounded-lg border ${page === totalPages ? "border-apple-mist text-apple-silver" : "border-apple-silver text-apple-charcoal"}`}><ArrowRight size={14} /></button>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3">{title}</h3>
      <div className="h-[280px] w-full rounded-2xl border border-apple-mist bg-white p-4">{children}</div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-apple-mist bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-apple-steel">{label}</p>
      <p className="text-lg font-bold text-apple-charcoal mt-1">{value}</p>
    </div>
  );
}

function EditField({ label, type, value, onChange }: { label: string; type: "date" | "number"; value: string | number; onChange: (value: string) => void; }) {
  return (
    <label className="block text-xs text-apple-steel">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full h-10 px-3 rounded-xl border border-apple-silver" />
    </label>
  );
}

function normalizeAuditValue(value: PayrollEntry[keyof PayrollEntry]): string {
  if (typeof value === "number") return formatNumber(value, 2);
  return String(value);
}

function formatDateDisplay(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [year, month, day] = isoDate.split("-");
  return `${month}/${day}/${year}`;
}

function dateDisplayToIso(mmddyyyy: string): string {
  const [month, day, year] = mmddyyyy.split("/");
  if (!year || !month || !day) return mmddyyyy;
  return `${year}-${month}-${day}`;
}

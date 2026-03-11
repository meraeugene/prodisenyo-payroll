"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { buildDailyLogRows, formatNumber } from "@/app/lib/payroll";
import { loadAttendanceSnapshot } from "@/app/lib/storage";

export default function AttendanceLogsPage() {
  const snapshot = loadAttendanceSnapshot();
  const records = snapshot?.records ?? [];

  const [siteFilter, setSiteFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");

  const dailyRows = useMemo(() => buildDailyLogRows(records), [records]);

  const sites = useMemo(
    () =>
      Array.from(new Set(dailyRows.map((row) => row.site).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [dailyRows],
  );

  const filteredRows = useMemo(() => {
    const q = nameFilter.trim().toLowerCase();
    const date = dateFilter.trim();
    return dailyRows.filter((row) => {
      if (siteFilter !== "ALL" && row.site !== siteFilter) return false;
      if (date && row.date !== date) return false;
      if (q && !row.workerName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [dailyRows, dateFilter, nameFilter, siteFilter]);

  return (
    <main className="min-h-screen bg-apple-snow">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-5">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-apple-ash hover:text-apple-charcoal"
          >
            <ArrowLeft size={15} /> Back to Payroll
          </Link>
          <h1 className="text-2xl font-bold text-apple-charcoal mt-2">
            Attendance Logs
          </h1>
          <p className="text-sm text-apple-smoke mt-1">
            Worker attendance viewer for HR. Source site: {snapshot?.site ?? "N/A"}.
          </p>
        </div>

        {records.length === 0 ? (
          <div className="rounded-2xl border border-apple-mist bg-white px-5 py-6 text-sm text-apple-smoke">
            No uploaded attendance data found. Upload attendance files first on the main page.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-apple-steel uppercase tracking-widest">
                  Site
                </label>
                <select
                  value={siteFilter}
                  onChange={(event) => setSiteFilter(event.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-apple-silver bg-white text-sm"
                >
                  <option value="ALL">All Sites</option>
                  {sites.map((site) => (
                    <option key={site} value={site}>
                      {site}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-apple-steel uppercase tracking-widest">
                  Date
                </label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-apple-silver bg-white text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-apple-steel uppercase tracking-widest">
                  Search Worker
                </label>
                <div className="mt-1 relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-silver"
                  />
                  <input
                    value={nameFilter}
                    onChange={(event) => setNameFilter(event.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-apple-silver bg-white text-sm"
                    placeholder="Search worker"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-apple-mist bg-white overflow-x-auto">
              <table className="w-full text-sm min-w-[980px]">
                <thead>
                  <tr className="border-b border-apple-mist">
                    {[
                      "Worker",
                      "Role",
                      "Site",
                      "Date",
                      "Time In",
                      "Time Out",
                      "Hours Worked",
                    ].map((header) => (
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
                  {filteredRows.map((row) => (
                    <tr
                      key={`${row.date}-${row.site}-${row.mergeKey}`}
                      className="border-b border-apple-mist/60 odd:bg-apple-snow/40"
                    >
                      <td className="px-4 py-3 font-semibold text-apple-charcoal">
                        {row.workerName}
                      </td>
                      <td className="px-4 py-3 text-xs text-apple-ash">{row.role}</td>
                      <td className="px-4 py-3 text-xs text-apple-ash">{row.site}</td>
                      <td className="px-4 py-3 text-sm font-mono text-apple-ash">{row.date}</td>
                      <td className="px-4 py-3 text-sm font-mono text-apple-ash">
                        {row.timeIn || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-apple-ash">
                        {row.timeOut || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-apple-charcoal">
                        {formatNumber(row.totalHours, 2)}
                      </td>
                    </tr>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-apple-smoke">
                        No attendance rows for current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

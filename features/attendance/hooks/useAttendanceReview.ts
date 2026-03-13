import { useEffect, useMemo, useState } from "react";
import type { AttendanceRecord, DailyLogRow, Step2Sort, Step2View } from "@/types";
import { buildVisiblePages } from "@/features/shared/pagination";
import {
  buildDailyRows,
  filterDailyRows,
  filterDetailedRecords,
  selectAvailableSites,
  selectBranchSummaries,
} from "@/features/attendance/utils/attendanceSelectors";

const PREVIEW_LIMIT = 10;

export interface UseAttendanceReviewResult {
  step2View: Step2View;
  setStep2View: (value: Step2View) => void;
  step2Sort: Step2Sort;
  setStep2Sort: (value: Step2Sort) => void;
  recordsPage: number;
  setRecordsPage: (value: number | ((prev: number) => number)) => void;
  step2SiteFilter: string;
  setStep2SiteFilter: (value: string) => void;
  step2NameFilter: string;
  setStep2NameFilter: (value: string) => void;
  step2DateFilter: string;
  setStep2DateFilter: (value: string) => void;
  dailyRows: DailyLogRow[];
  availableSites: string[];
  filteredDetailedRecords: AttendanceRecord[];
  filteredDailyRows: DailyLogRow[];
  activeRowsCount: number;
  totalRowsForCurrentView: number;
  totalRecordPages: number;
  previewStart: number;
  previewEnd: number;
  previewRecords: AttendanceRecord[];
  previewDailyRows: DailyLogRow[];
  branchSummaries: { siteName: string; employeeCount: number }[];
  step2Pages: number[];
  clearFilters: () => void;
  resetAttendanceReview: () => void;
}

export function useAttendanceReview(
  records: AttendanceRecord[],
): UseAttendanceReviewResult {
  const [step2View, setStep2View] = useState<Step2View>("daily");
  const [step2Sort, setStep2Sort] = useState<Step2Sort>("date-asc");
  const [recordsPage, setRecordsPage] = useState(1);
  const [step2SiteFilter, setStep2SiteFilter] = useState("ALL");
  const [step2NameFilter, setStep2NameFilter] = useState("");
  const [step2DateFilter, setStep2DateFilter] = useState("");

  const dailyRows = useMemo(() => buildDailyRows(records), [records]);

  const availableSites = useMemo(() => selectAvailableSites(records), [records]);

  const filteredDetailedRecords = useMemo(
    () =>
      filterDetailedRecords(records, {
        siteFilter: step2SiteFilter,
        nameFilter: step2NameFilter,
        dateFilter: step2DateFilter,
        sort: step2Sort,
      }),
    [records, step2SiteFilter, step2NameFilter, step2DateFilter, step2Sort],
  );

  const filteredDailyRows = useMemo(
    () =>
      filterDailyRows(dailyRows, {
        siteFilter: step2SiteFilter,
        nameFilter: step2NameFilter,
        dateFilter: step2DateFilter,
        sort: step2Sort,
      }),
    [dailyRows, step2SiteFilter, step2NameFilter, step2DateFilter, step2Sort],
  );

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

  const previewRecords = useMemo(
    () => filteredDetailedRecords.slice(previewStart, previewEnd),
    [filteredDetailedRecords, previewStart, previewEnd],
  );

  const previewDailyRows = useMemo(
    () => filteredDailyRows.slice(previewStart, previewEnd),
    [filteredDailyRows, previewStart, previewEnd],
  );

  const branchSummaries = useMemo(() => selectBranchSummaries(records), [records]);

  const step2Pages = useMemo(
    () => buildVisiblePages(recordsPage, totalRecordPages),
    [recordsPage, totalRecordPages],
  );

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

  function clearFilters() {
    setStep2SiteFilter("ALL");
    setStep2NameFilter("");
    setStep2DateFilter("");
    setStep2Sort("date-asc");
  }

  function resetAttendanceReview() {
    setStep2View("daily");
    setStep2Sort("date-asc");
    setStep2SiteFilter("ALL");
    setStep2NameFilter("");
    setStep2DateFilter("");
    setRecordsPage(1);
  }

  return {
    step2View,
    setStep2View,
    step2Sort,
    setStep2Sort,
    recordsPage,
    setRecordsPage,
    step2SiteFilter,
    setStep2SiteFilter,
    step2NameFilter,
    setStep2NameFilter,
    step2DateFilter,
    setStep2DateFilter,
    dailyRows,
    availableSites,
    filteredDetailedRecords,
    filteredDailyRows,
    activeRowsCount,
    totalRowsForCurrentView,
    totalRecordPages,
    previewStart,
    previewEnd,
    previewRecords,
    previewDailyRows,
    branchSummaries,
    step2Pages,
    clearFilters,
    resetAttendanceReview,
  };
}


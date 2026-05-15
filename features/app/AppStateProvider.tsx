"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ParseResult } from "@/lib/parser";
import type { PayrollRunStatus } from "@/types/database";
import type {
  AttendanceRecord,
  Employee,
  ThemeMode,
  UploadedFileItem,
} from "@/types";
import {
  useAttendanceReview,
  type UseAttendanceReviewResult,
} from "@/features/attendance/hooks/useAttendanceReview";
import {
  usePayrollState,
  type UsePayrollStateResult,
} from "@/features/payroll/hooks/usePayrollState";
import { buildDailyRows } from "@/features/attendance/utils/attendanceSelectors";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { calculateDailyWorkMinutes } from "@/lib/utils";

const STORAGE_KEY = "prodisenyo-dashboard-ui-state-v2";
const LEGACY_STORAGE_KEY = "prodisenyo-dashboard-state-v1";
const RESET_FLAG_KEY = "prodisenyo-workspace-reset-v1";
const RESET_COOKIE_KEY = "prodisenyo-workspace-reset";

interface PersistedDashboardUiState {
  theme: ThemeMode;
  attendanceUi: {
    step2View: UseAttendanceReviewResult["step2View"];
    step2Sort: UseAttendanceReviewResult["step2Sort"];
    recordsPage: number;
    step2SiteFilter: string;
    step2NameFilter: string;
    step2DateFilter: string;
  };
  payrollUi: {
    payrollTab: UsePayrollStateResult["payrollTab"];
    payrollPage: number;
    payrollSiteFilter: string;
    payrollNameFilter: string;
    payrollDateFilter: string;
    payrollSort: UsePayrollStateResult["payrollSort"];
    payrollRoleFilter: UsePayrollStateResult["payrollRoleFilter"];
  };
}

type RestoredAttendanceImport = {
  id: string;
  site_name: string;
  period_label: string;
  period_start: string | null;
  period_end: string | null;
  original_filename: string;
};

type RestoredPayrollRunMeta = {
  id: string;
  status: PayrollRunStatus;
};

interface AppStateContextValue {
  hydrated: boolean;
  uploadedFiles: UploadedFileItem[];
  currentAttendanceImportId: string | null;
  currentPayrollRunId: string | null;
  currentPayrollRunStatus: PayrollRunStatus | null;
  records: AttendanceRecord[];
  site: string;
  attendancePeriod: string;
  employees: Employee[];
  theme: ThemeMode;
  attendance: UseAttendanceReviewResult;
  payroll: UsePayrollStateResult;
  hasAttendanceData: boolean;
  workspaceReset: boolean;
  overviewStats: {
    employees: number;
    records: number;
    reviewRows: number;
    payrollRows: number;
    payrollTotal: number;
  };
  setTheme: (nextTheme: ThemeMode) => void;
  setUploadedFiles: (
    value:
      | UploadedFileItem[]
      | ((prev: UploadedFileItem[]) => UploadedFileItem[]),
  ) => void;
  setCurrentAttendanceImportId: (value: string | null) => void;
  setCurrentPayrollRunMeta: (
    value: { id: string | null; status: PayrollRunStatus | null },
  ) => void;
  handleParsed: (result: ParseResult) => void;
  handleClearAttendanceData: () => void;
  handleReset: () => void;
  handleGeneratePayroll: () => boolean;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

function isThemeMode(value: string): value is ThemeMode {
  return value === "prodisenyo";
}

function normalizeThemeMode(value: string | null): ThemeMode | null {
  if (!value || !isThemeMode(value)) return null;
  return value;
}

function mapAttendanceRecords(
  rows: Array<{
    employee_name: string;
    log_date: string;
    log_time: string;
    log_type: "IN" | "OUT";
    log_source: "Time1" | "Time2" | "OT";
    site_name: string;
  }>,
): AttendanceRecord[] {
  return rows.map((row) => ({
    date: row.log_date,
    employee: row.employee_name,
    logTime: row.log_time,
    type: row.log_type,
    source: row.log_source,
    site: row.site_name,
  }));
}

function buildEmployeesFromRecords(records: AttendanceRecord[]): Employee[] {
  const dailyRows = buildDailyRows(records);
  const grouped = new Map<
    string,
    {
      name: string;
      days: Set<string>;
      regularHours: number;
      otHours: number;
    }
  >();

  for (const row of dailyRows) {
    const key = row.employee.trim().toLowerCase();
    const current = grouped.get(key) ?? {
      name: row.employee,
      days: new Set<string>(),
      regularHours: 0,
      otHours: 0,
    };

    current.days.add(row.date);

    const dailyMinutes = calculateDailyWorkMinutes(row);
    const regularHours = dailyMinutes.regularMinutes / 60;
    const otHours = dailyMinutes.overtimeMinutes / 60;

    current.regularHours += regularHours;
    current.otHours += otHours;
    grouped.set(key, current);
  }

  return Array.from(grouped.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((employee, index) => ({
      id: index + 1,
      name: employee.name,
      days: employee.days.size,
      regularHours: Math.round(employee.regularHours * 100) / 100,
      otHours: Math.round(employee.otHours * 100) / 100,
      customRateDay: null,
      customRateHour: null,
    }));
}

function buildStoredPeriodLabel(
  periodStart: string | null,
  periodEnd: string | null,
  fallbackLabel: string | null,
): string {
  if (periodStart && periodEnd) {
    return `${periodStart} to ${periodEnd}`;
  }

  const trimmedFallback = fallbackLabel?.trim();
  return trimmedFallback || "Current Period";
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [currentAttendanceImportId, setCurrentAttendanceImportId] =
    useState<string | null>(null);
  const [currentPayrollRunId, setCurrentPayrollRunId] = useState<string | null>(
    null,
  );
  const [currentPayrollRunStatus, setCurrentPayrollRunStatus] =
    useState<PayrollRunStatus | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [site, setSite] = useState("Unknown Site");
  const [attendancePeriod, setAttendancePeriod] = useState("Current Period");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [theme, setTheme] = useState<ThemeMode>("prodisenyo");
  const [workspaceReset, setWorkspaceReset] = useState(false);

  const attendance = useAttendanceReview(records);
  const payroll = usePayrollState({
    dailyRows: attendance.dailyRows,
    attendancePeriod,
    availableSites: attendance.availableSites,
    currentAttendanceImportId,
  });

  const setWorkspaceResetCookie = useCallback((value: boolean) => {
    document.cookie = `${RESET_COOKIE_KEY}=${value ? "true" : "false"}; path=/; max-age=${value ? 60 * 60 * 24 * 30 : 0}; SameSite=Lax`;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreState() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const resetFlag = window.localStorage.getItem(RESET_FLAG_KEY) === "true";
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        setWorkspaceReset(resetFlag);
        setWorkspaceResetCookie(resetFlag);

        if (raw) {
          const parsed = JSON.parse(raw) as Partial<PersistedDashboardUiState>;

          const persistedTheme = normalizeThemeMode(parsed.theme ?? null);
          if (persistedTheme) {
            setTheme(persistedTheme);
          }

          if (parsed.attendanceUi) {
            attendance.setStep2View(parsed.attendanceUi.step2View ?? "daily");
            attendance.setStep2Sort(parsed.attendanceUi.step2Sort ?? "date-asc");
            attendance.setRecordsPage(parsed.attendanceUi.recordsPage ?? 1);
            attendance.setStep2SiteFilter(parsed.attendanceUi.step2SiteFilter ?? "ALL");
            attendance.setStep2NameFilter(parsed.attendanceUi.step2NameFilter ?? "");
            attendance.setStep2DateFilter(parsed.attendanceUi.step2DateFilter ?? "");
          }

          if (parsed.payrollUi) {
            payroll.setPayrollTab(parsed.payrollUi.payrollTab ?? "payroll");
            payroll.setPayrollPage(parsed.payrollUi.payrollPage ?? 1);
            payroll.setPayrollSiteFilter(parsed.payrollUi.payrollSiteFilter ?? "ALL");
            payroll.setPayrollNameFilter(parsed.payrollUi.payrollNameFilter ?? "");
            payroll.setPayrollDateFilter(parsed.payrollUi.payrollDateFilter ?? "");
            payroll.setPayrollSort(parsed.payrollUi.payrollSort ?? "date-asc");
            payroll.setPayrollRoleFilter(parsed.payrollUi.payrollRoleFilter ?? "ALL");
          }
        }

        if (resetFlag) return;

        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || cancelled) return;

        const { data: importData, error: importError } = await supabase
          .from("attendance_imports")
          .select(
            "id, site_name, period_label, period_start, period_end, original_filename",
          )
          .eq("uploaded_by", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const latestImport = (importData ?? null) as RestoredAttendanceImport | null;

        if (importError || !latestImport || cancelled) return;

        const { data: attendanceRows, error: attendanceError } = await supabase
          .from("attendance_records")
          .select(
            "employee_name, log_date, log_time, log_type, log_source, site_name",
          )
          .eq("import_id", latestImport.id)
          .order("log_date", { ascending: true })
          .order("log_time", { ascending: true });

        if (attendanceError || cancelled) return;

        const nextRecords = mapAttendanceRecords(
          (attendanceRows ?? []) as Array<{
            employee_name: string;
            log_date: string;
            log_time: string;
            log_type: "IN" | "OUT";
            log_source: "Time1" | "Time2" | "OT";
            site_name: string;
          }>,
        );

        setCurrentAttendanceImportId(latestImport.id);
        setSite(latestImport.site_name ?? "Unknown Site");
        setAttendancePeriod(
          buildStoredPeriodLabel(
            latestImport.period_start ?? null,
            latestImport.period_end ?? null,
            latestImport.period_label ?? null,
          ),
        );
        setRecords(nextRecords);
        setEmployees(buildEmployeesFromRecords(nextRecords));

        const fileNames = (latestImport.original_filename ?? "")
          .split("|")
          .map((item) => item.trim())
          .filter(Boolean);

        setUploadedFiles(
          fileNames.map((name) => ({
            name,
            size: 0,
            lastModified: 0,
            file: null,
            persisted: true,
          })),
        );

        const { data: runData } = await supabase
          .from("payroll_runs")
          .select("id, status")
          .eq("attendance_import_id", latestImport.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const latestRun = (runData ?? null) as RestoredPayrollRunMeta | null;

        if (cancelled) return;

        setCurrentPayrollRunId(latestRun?.id ?? null);
        setCurrentPayrollRunStatus(latestRun?.status ?? null);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    void restoreState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!hydrated) return;

    const payload: PersistedDashboardUiState = {
      theme,
      attendanceUi: {
        step2View: attendance.step2View,
        step2Sort: attendance.step2Sort,
        recordsPage: attendance.recordsPage,
        step2SiteFilter: attendance.step2SiteFilter,
        step2NameFilter: attendance.step2NameFilter,
        step2DateFilter: attendance.step2DateFilter,
      },
      payrollUi: {
        payrollTab: payroll.payrollTab,
        payrollPage: payroll.payrollPage,
        payrollSiteFilter: payroll.payrollSiteFilter,
        payrollNameFilter: payroll.payrollNameFilter,
        payrollDateFilter: payroll.payrollDateFilter,
        payrollSort: payroll.payrollSort,
        payrollRoleFilter: payroll.payrollRoleFilter,
      },
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    hydrated,
    theme,
    attendance.step2View,
    attendance.step2Sort,
    attendance.recordsPage,
    attendance.step2SiteFilter,
    attendance.step2NameFilter,
    attendance.step2DateFilter,
    payroll.payrollTab,
    payroll.payrollPage,
    payroll.payrollSiteFilter,
    payroll.payrollNameFilter,
    payroll.payrollDateFilter,
    payroll.payrollSort,
    payroll.payrollRoleFilter,
  ]);

  const handleParsed = useCallback(
    (result: ParseResult) => {
      setEmployees(result.employees);
      setRecords(result.records);
      setAttendancePeriod(result.period);
      setSite(result.site);
      setCurrentPayrollRunId(null);
      setCurrentPayrollRunStatus(null);
      setWorkspaceReset(false);
      window.localStorage.removeItem(RESET_FLAG_KEY);
      setWorkspaceResetCookie(false);
      attendance.resetAttendanceReview();
      payroll.resetPayrollState();
    },
    [attendance, payroll, setWorkspaceResetCookie],
  );

  const handleClearAttendanceData = useCallback(() => {
    setUploadedFiles([]);
    setRecords([]);
    setEmployees([]);
    setSite("Unknown Site");
    setAttendancePeriod("Current Period");
    setCurrentAttendanceImportId(null);
    setCurrentPayrollRunId(null);
    setCurrentPayrollRunStatus(null);
    attendance.resetAttendanceReview();
    payroll.resetPayrollState();
  }, [attendance, payroll]);

  const handleReset = useCallback(() => {
    handleClearAttendanceData();
    setWorkspaceReset(true);
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    window.localStorage.setItem(RESET_FLAG_KEY, "true");
    setWorkspaceResetCookie(true);
  }, [handleClearAttendanceData, setWorkspaceResetCookie]);

  const setCurrentPayrollRunMeta = useCallback(
    (value: { id: string | null; status: PayrollRunStatus | null }) => {
      setCurrentPayrollRunId(value.id);
      setCurrentPayrollRunStatus(value.status);
    },
    [],
  );

  const handleGeneratePayroll = useCallback(() => {
    return payroll.handleGeneratePayroll();
  }, [payroll]);

  const value = useMemo<AppStateContextValue>(
    () => ({
      hydrated,
      uploadedFiles,
      currentAttendanceImportId,
      currentPayrollRunId,
      currentPayrollRunStatus,
      records,
      site,
      attendancePeriod,
      employees,
      theme,
      attendance,
      payroll,
      hasAttendanceData: records.length > 0,
      workspaceReset,
      overviewStats: {
        employees: employees.length,
        records: records.length,
        reviewRows: attendance.dailyRows.length,
        payrollRows: payroll.filteredPayrollRows.length,
        payrollTotal: payroll.payrollTotals.pay,
      },
      setTheme,
      setUploadedFiles,
      setCurrentAttendanceImportId,
      setCurrentPayrollRunMeta,
      handleParsed,
      handleClearAttendanceData,
      handleReset,
      handleGeneratePayroll,
    }),
    [
      hydrated,
      uploadedFiles,
      currentAttendanceImportId,
      currentPayrollRunId,
      currentPayrollRunStatus,
      records,
      site,
      attendancePeriod,
      employees,
      theme,
      attendance,
      payroll,
      workspaceReset,
      setCurrentPayrollRunMeta,
      handleParsed,
      handleClearAttendanceData,
      handleReset,
      handleGeneratePayroll,
    ],
  );

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider.");
  }
  return context;
}

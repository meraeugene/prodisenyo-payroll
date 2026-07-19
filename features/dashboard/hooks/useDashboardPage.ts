"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type HistoricalDashboardAttendanceLog,
  type HistoricalDashboardDailyTotal,
  type HistoricalDashboardPayrollItem,
  type HistoricalDashboardPeriodOption,
  type HistoricalDashboardSelectedRun,
  type RecentPayrollActivityRow,
  useHistoricalDashboardData,
} from "@/features/dashboard/hooks/useHistoricalDashboardData";
import type {
  DashboardPayrollDistributionDatum,
  DashboardWorkforceDatum,
  PayrollSummaryCardDefinition,
  PayrollSummaryCardKey,
} from "@/features/dashboard/types";
import {
  extractDashboardBranchName,
  roundDashboardValue,
} from "@/features/dashboard/utils/dashboardFormatters";
import { selectWorkforceByBranch } from "@/features/analytics/utils/analyticsSelectors";
import { formatPayrollNumber } from "@/features/payroll/utils/payrollFormatters";
import { buildPayrollInsightsData } from "@/lib/payrollInsights";
import {
  aggregateDailyPaidPoints,
  buildDailyPaidPointsFromPayrollRuns,
  buildDailyPaidPointsFromStoredTotals,
  buildWeeklyPointsFromPayrollReports,
  type PayrollRunDailyTotalInput,
  type PayrollTrendAttendanceLogInput,
  type PayrollTrendRunInput,
  type PayrollTrendRunItemInput,
  type TrendPoint,
  type TrendRange,
} from "@/lib/payrollTrend";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";

const OVERVIEW_CHART_COLORS = [
  "rgb(var(--theme-chart-1))",
  "rgb(var(--theme-chart-2))",
  "rgb(var(--theme-chart-3))",
  "rgb(var(--theme-chart-4))",
  "rgb(var(--theme-chart-5))",
];
const PESO_SIGN = "\u20B1";

type DashboardPayrollRunRow = Pick<
  Database["public"]["Tables"]["payroll_runs"]["Row"],
  | "id"
  | "attendance_import_id"
  | "period_label"
  | "period_start"
  | "period_end"
  | "submitted_at"
  | "created_at"
  | "net_total"
  | "status"
>;

type DashboardPayrollRunItemRow = Pick<
  Database["public"]["Tables"]["payroll_run_items"]["Row"],
  | "payroll_run_id"
  | "employee_name"
  | "site_name"
  | "hours_worked"
  | "total_pay"
>;

type DashboardAttendanceLogRow = Pick<
  Database["public"]["Tables"]["attendance_records"]["Row"],
  | "import_id"
  | "employee_name"
  | "log_date"
  | "log_time"
  | "log_type"
  | "log_source"
  | "site_name"
>;

type DashboardPayrollDailyTotalRow = Pick<
  Database["public"]["Tables"]["payroll_run_daily_totals"]["Row"],
  "payroll_run_id" | "payout_date" | "total_pay"
>;

export function useDashboardPage() {
  const router = useRouter();
  const {
    data,
    loading,
    error,
    selectedPeriodKey,
    setSelectedPeriodKey,
    refreshData,
  } = useHistoricalDashboardData();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ceoTrendRange, setCeoTrendRange] = useState<TrendRange>("daily");
  const [ceoSubmittedRuns, setCeoSubmittedRuns] = useState<
    PayrollTrendRunInput[]
  >([]);
  const [ceoDailyTotals, setCeoDailyTotals] = useState<
    PayrollRunDailyTotalInput[]
  >([]);
  const [ceoFallbackRunItems, setCeoFallbackRunItems] = useState<
    PayrollTrendRunItemInput[]
  >([]);
  const [ceoFallbackAttendanceLogs, setCeoFallbackAttendanceLogs] = useState<
    PayrollTrendAttendanceLogInput[]
  >([]);
  const [ceoTrendLoading, setCeoTrendLoading] = useState(true);
  const [ceoTrendReady, setCeoTrendReady] = useState(false);
  const [ceoTrendReloadNonce, setCeoTrendReloadNonce] = useState(0);
  const [activeSummaryCard, setActiveSummaryCard] =
    useState<PayrollSummaryCardKey | null>(null);

  const payrollRows = useMemo(
    () => data?.payrollRows ?? [],
    [data?.payrollRows],
  );
  const payrollAttendanceInputs = useMemo(
    () => data?.payrollAttendanceInputs ?? [],
    [data?.payrollAttendanceInputs],
  );
  const records = useMemo(() => data?.records ?? [], [data?.records]);
  const payrollInsights = useMemo(
    () => buildPayrollInsightsData(payrollRows, payrollAttendanceInputs),
    [payrollAttendanceInputs, payrollRows],
  );

  const totalPayroll = payrollInsights.kpis.totalPayroll;
  const grossPayroll = Math.round(totalPayroll * 1.12 * 100) / 100;
  const deductions =
    Math.round(Math.max(0, grossPayroll - totalPayroll) * 100) / 100;
  const netPayroll = Math.max(0, totalPayroll);

  const workforceByBranch = useMemo<DashboardWorkforceDatum[]>(
    () =>
      selectWorkforceByBranch(records).map((item, index) => ({
        ...item,
        shortBranch: extractDashboardBranchName(item.branch),
        fill: OVERVIEW_CHART_COLORS[index % OVERVIEW_CHART_COLORS.length],
      })),
    [records],
  );

  const payrollDistributionData = useMemo<DashboardPayrollDistributionDatum[]>(
    () =>
      payrollInsights.payrollDistributionByProject.map((item, index) => ({
        ...item,
        shortName: extractDashboardBranchName(item.name),
        fill: OVERVIEW_CHART_COLORS[index % OVERVIEW_CHART_COLORS.length],
      })),
    [payrollInsights.payrollDistributionByProject],
  );

  const summaryCards = useMemo<PayrollSummaryCardDefinition[]>(
    () => [
      {
        key: "gross",
        title: "Gross Payroll",
        badge: "",
        helper:
          "Starts from net payroll analytics, then applies the current 12% uplift used on the dashboard.",
        formula: `Gross payroll = Net payroll (${PESO_SIGN} ${formatPayrollNumber(netPayroll)}) x 1.12`,
        amount: grossPayroll,
        steps: [
          `The dashboard first reads the synced payroll analytics total of ${PESO_SIGN} ${formatPayrollNumber(netPayroll)}.`,
          "It applies the current dashboard gross-up rule of 12% to that synced payroll total.",
          `That gives ${PESO_SIGN} ${formatPayrollNumber(grossPayroll)} for the Gross Payroll card.`,
        ],
      },
      {
        key: "deductions",
        title: "Deductions",
        badge: "",
        helper:
          "This card shows the gap between the gross payroll card and the synced net payroll card.",
        formula: `Deductions = Gross payroll (${PESO_SIGN} ${formatPayrollNumber(grossPayroll)}) - Net payroll (${PESO_SIGN} ${formatPayrollNumber(netPayroll)})`,
        amount: deductions,
        steps: [
          `Gross payroll is currently ${PESO_SIGN} ${formatPayrollNumber(grossPayroll)}.`,
          `Net payroll released is currently ${PESO_SIGN} ${formatPayrollNumber(netPayroll)}.`,
          `Subtracting those values leaves ${PESO_SIGN} ${formatPayrollNumber(deductions)} in deductions.`,
        ],
      },
      {
        key: "net",
        title: "Net Payroll Released",
        badge: "",
        helper:
          "This card mirrors the net payroll total coming from the payroll analytics dataset for the selected period.",
        formula: `Net payroll released = Synced payroll analytics total (${PESO_SIGN} ${formatPayrollNumber(totalPayroll)})`,
        amount: netPayroll,
        steps: [
          "The selected payroll period is loaded from saved payroll run items.",
          "The payroll analytics total is summed from those payroll rows.",
          `That synced result is shown directly here as ${PESO_SIGN} ${formatPayrollNumber(netPayroll)}.`,
        ],
      },
    ],
    [deductions, grossPayroll, netPayroll, totalPayroll],
  );

  const activeSummaryCardDetails =
    summaryCards.find((card) => card.key === activeSummaryCard) ?? null;

  const attendancePeriod =
    data?.attendancePeriod ?? "No recorded payroll period yet";
  const activityRows = data?.recentActivity ?? [];
  const selectedRun = data?.selectedRun ?? null;
  const selectedPayrollItems = data?.selectedPayrollItems ?? [];
  const selectedAttendanceLogs = data?.selectedAttendanceLogs ?? [];
  const selectedPayrollDailyTotals = data?.selectedPayrollDailyTotals ?? [];
  const periodOptions = data?.periodOptions ?? [];

  const ceoDailyTrend = useMemo(() => {
    const storedDailyPoints =
      buildDailyPaidPointsFromStoredTotals(ceoDailyTotals);
    const totalsByDate = new Map<string, number>(
      storedDailyPoints.map((point) => [point.date, point.total]),
    );
    const runIdsWithStoredDailyTotals = new Set(
      ceoDailyTotals.map((row) => row.payroll_run_id),
    );
    const runsNeedingFallback = ceoSubmittedRuns.filter(
      (run) => !runIdsWithStoredDailyTotals.has(run.id),
    );

    if (runsNeedingFallback.length === 0 || ceoFallbackRunItems.length === 0) {
      return storedDailyPoints;
    }

    const fallbackDailyPoints = buildDailyPaidPointsFromPayrollRuns(
      runsNeedingFallback,
      ceoFallbackRunItems,
      ceoFallbackAttendanceLogs,
    );

    fallbackDailyPoints.forEach((point) => {
      totalsByDate.set(
        point.date,
        roundDashboardValue((totalsByDate.get(point.date) ?? 0) + point.total),
      );
    });

    return Array.from(totalsByDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, total]) => ({ date, total: roundDashboardValue(total) }));
  }, [
    ceoDailyTotals,
    ceoFallbackAttendanceLogs,
    ceoFallbackRunItems,
    ceoSubmittedRuns,
  ]);

  const ceoPayrollTrend = useMemo<TrendPoint[]>(() => {
    if (ceoTrendRange === "weekly") {
      return buildWeeklyPointsFromPayrollReports(ceoSubmittedRuns);
    }
    return aggregateDailyPaidPoints(ceoDailyTrend, ceoTrendRange);
  }, [ceoDailyTrend, ceoSubmittedRuns, ceoTrendRange]);

  const ceoLatestTrendPoint =
    ceoPayrollTrend[ceoPayrollTrend.length - 1] ?? null;
  const ceoPreviousTrendPoint =
    ceoPayrollTrend[ceoPayrollTrend.length - 2] ?? null;
  const ceoOverallSubmittedPayroll = useMemo(
    () =>
      Math.round(
        ceoSubmittedRuns.reduce((sum, run) => sum + (run.net_total ?? 0), 0) *
          100,
      ) / 100,
    [ceoSubmittedRuns],
  );
  const ceoSubmittedReportCount = ceoSubmittedRuns.length;
  const ceoTrendPercent =
    ceoLatestTrendPoint &&
    ceoPreviousTrendPoint &&
    ceoPreviousTrendPoint.total > 0
      ? ((ceoLatestTrendPoint.total - ceoPreviousTrendPoint.total) /
          ceoPreviousTrendPoint.total) *
        100
      : null;

  useEffect(() => {
    let cancelled = false;
    async function loadCeoTrendData() {
      setCeoTrendReady(false);
      setCeoTrendLoading(true);
      const supabase = createSupabaseBrowserClient();
      const { data: runsData, error: runsError } = await supabase
        .from("payroll_runs")
        .select(
          "id, attendance_import_id, period_label, period_start, period_end, submitted_at, created_at, net_total, status",
        )
        .eq("status", "approved")
        .order("submitted_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (runsError) {
        setCeoSubmittedRuns([]);
        setCeoDailyTotals([]);
        setCeoFallbackRunItems([]);
        setCeoFallbackAttendanceLogs([]);
        setCeoTrendLoading(false);
        setCeoTrendReady(true);
        return;
      }
      const runs = (runsData ?? []) as DashboardPayrollRunRow[];
      const runIds = runs.map((run) => run.id);
      if (runIds.length === 0) {
        setCeoSubmittedRuns([]);
        setCeoDailyTotals([]);
        setCeoFallbackRunItems([]);
        setCeoFallbackAttendanceLogs([]);
        setCeoTrendLoading(false);
        setCeoTrendReady(true);
        return;
      }
      const { data: dailyTotalsData, error: dailyTotalsError } = await supabase
        .from("payroll_run_daily_totals")
        .select("payroll_run_id, payout_date, total_pay")
        .in("payroll_run_id", runIds)
        .order("payout_date", { ascending: true });
      if (cancelled) return;
      const dailyTotalsRows = dailyTotalsError
        ? []
        : ((dailyTotalsData ?? []) as DashboardPayrollDailyTotalRow[]);
      const runIdsWithDailyTotals = new Set(
        dailyTotalsRows.map((row) => row.payroll_run_id),
      );
      const fallbackRuns = runs.filter(
        (run) => !runIdsWithDailyTotals.has(run.id),
      );
      const fallbackRunIds = fallbackRuns.map((run) => run.id);
      const fallbackImportIds = Array.from(
        new Set(
          fallbackRuns
            .map((run) => run.attendance_import_id)
            .filter((value): value is string => Boolean(value)),
        ),
      );
      const fallbackItemsResult =
        fallbackRunIds.length > 0
          ? await supabase
              .from("payroll_run_items")
              .select(
                "payroll_run_id, employee_name, site_name, hours_worked, total_pay",
              )
              .in("payroll_run_id", fallbackRunIds)
          : { data: [], error: null };
      const fallbackAttendanceResult =
        fallbackImportIds.length > 0
          ? await supabase
              .from("attendance_records")
              .select(
                "import_id, employee_name, log_date, log_time, log_type, log_source, site_name",
              )
              .in("import_id", fallbackImportIds)
              .order("log_date", { ascending: true })
              .order("log_time", { ascending: true })
          : { data: [], error: null };
      if (cancelled) return;
      setCeoSubmittedRuns(
        runs.map((run) => ({
          id: run.id,
          attendance_import_id: run.attendance_import_id,
          period_label: run.period_label,
          period_start: run.period_start,
          period_end: run.period_end,
          submitted_at: run.submitted_at,
          created_at: run.created_at,
          net_total: run.net_total,
        })),
      );
      setCeoDailyTotals(
        dailyTotalsRows.map((row) => ({
          payroll_run_id: row.payroll_run_id,
          payout_date: row.payout_date,
          total_pay: row.total_pay,
        })),
      );
      setCeoFallbackRunItems(
        fallbackItemsResult.error
          ? []
          : (
              (fallbackItemsResult.data ?? []) as DashboardPayrollRunItemRow[]
            ).map((item) => ({
              payroll_run_id: item.payroll_run_id,
              employee_name: item.employee_name,
              site_name: item.site_name,
              hours_worked: item.hours_worked,
              total_pay: item.total_pay,
            })),
      );
      setCeoFallbackAttendanceLogs(
        fallbackAttendanceResult.error
          ? []
          : (
              (fallbackAttendanceResult.data ??
                []) as DashboardAttendanceLogRow[]
            ).map((row) => ({
              import_id: row.import_id,
              employee_name: row.employee_name,
              log_date: row.log_date,
              log_time: row.log_time,
              log_type: row.log_type,
              log_source: row.log_source,
              site_name: row.site_name,
            })),
      );
      setCeoTrendLoading(false);
      setCeoTrendReady(true);
    }
    void loadCeoTrendData();
    return () => {
      cancelled = true;
    };
  }, [ceoTrendReloadNonce]);

  async function handleSync() {
    setIsRefreshing(true);
    try {
      refreshData();
      setCeoTrendReloadNonce((value) => value + 1);
      router.refresh();
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    } finally {
      setIsRefreshing(false);
    }
  }

  return {
    error,
    selectedPeriodKey,
    setSelectedPeriodKey,
    shouldShowSkeleton: loading && !data && !error,
    shouldWaitForCeoDashboard: !error && !ceoTrendReady,
    isRefreshing,
    handleSync,
    ceoTrendLoading,
    ceoTrendRange,
    setCeoTrendRange,
    ceoPayrollTrend,
    ceoTrendPercent,
    ceoLatestTrendPoint,
    ceoOverallSubmittedPayroll,
    ceoSubmittedReportCount,
    summaryCards,
    activeSummaryCardDetails,
    setActiveSummaryCard,
    attendancePeriod,
    activityRows: activityRows as RecentPayrollActivityRow[],
    selectedRun: selectedRun as HistoricalDashboardSelectedRun | null,
    selectedPayrollItems:
      selectedPayrollItems as HistoricalDashboardPayrollItem[],
    selectedAttendanceLogs:
      selectedAttendanceLogs as HistoricalDashboardAttendanceLog[],
    selectedPayrollDailyTotals:
      selectedPayrollDailyTotals as HistoricalDashboardDailyTotal[],
    periodOptions: periodOptions as HistoricalDashboardPeriodOption[],
    workforceByBranch,
    payrollDistributionData,
  };
}

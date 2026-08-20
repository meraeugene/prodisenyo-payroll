import { useEffect, useMemo, useState } from "react";
import type { DailyLogRow } from "@/types";
import type {
  PayrollAttendanceDecision,
  PayrollAttendanceDecisionMap,
} from "@/features/payroll/types";
import {
  buildCutoffAttendance,
  collectPayrollExceptions,
  type CutoffAttendanceDay,
} from "@/features/payroll/utils/payrollAttendanceEngine";
import { calculateDailyWorkMinutes } from "@/lib/utils";

interface UseCutoffAttendanceReviewInput {
  identity: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  logs: DailyLogRow[];
  paidHolidayDates: Set<string>;
  initialDecisions?: PayrollAttendanceDecisionMap;
  dailyRateCentavos: number;
}

export function useCutoffAttendanceReview(
  input: UseCutoffAttendanceReviewInput,
) {
  const [decisions, setDecisions] = useState<PayrollAttendanceDecisionMap>({});
  const [resolvingDay, setResolvingDay] = useState<CutoffAttendanceDay | null>(null);

  useEffect(() => {
    setDecisions(input.initialDecisions ?? {});
    setResolvingDay(null);
  }, [input.identity, input.initialDecisions]);

  const days = useMemo(() => {
    if (!input.periodStart || !input.periodEnd) return [];
    return buildCutoffAttendance({
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      biometricDays: input.logs.map((log) => {
        const calculated = calculateDailyWorkMinutes(log);
        return {
          date: log.date,
          timeIn: log.time1In || log.time2In || log.otIn || null,
          timeOut: log.otOut || log.time2Out || log.time1Out || null,
          rawWorkedSeconds: calculated.rawRegularMinutes * 60,
          breakSeconds: calculated.lunchDeductionMinutes * 60,
          calculatedRegularSeconds: calculated.regularMinutes * 60,
          detectedOvertimeSeconds: calculated.overtimeMinutes * 60,
        };
      }),
      holidays: [...input.paidHolidayDates].map((date) => ({
        date,
        classification: "REGULAR_HOLIDAY" as const,
        payableSeconds: 8 * 3600,
      })),
      decisions,
    });
  }, [
    decisions,
    input.logs,
    input.paidHolidayDates,
    input.periodEnd,
    input.periodStart,
  ]);

  const exceptions = useMemo(
    () => collectPayrollExceptions(days, input.dailyRateCentavos),
    [days, input.dailyRateCentavos],
  );

  function saveDecision(decision: PayrollAttendanceDecision) {
    setDecisions((current) => ({ ...current, [decision.date]: decision }));
    setResolvingDay(null);
  }

  return {
    days,
    decisions,
    exceptions,
    resolvingDay,
    openResolution: setResolvingDay,
    closeResolution: () => setResolvingDay(null),
    saveDecision,
  };
}

"use client";

import type { ReactNode } from "react";
import type { DailyLogRow } from "@/types";
import type {
  PayrollAllowanceEntry,
  PayrollCashAdvanceEntry,
  PayrollDeductionEntry,
  PayrollOvertimeEntry,
  PayrollPaidLeaveEntry,
} from "@/features/payroll/types";
import type { AdjustmentFormType } from "@/features/payroll/utils/payrollEditModalHelpers";
import { PayrollAdjustmentEntries } from "@/features/payroll/components/payroll-edit/PayrollAdjustmentEntries";
import { PayrollAttendanceLogsTable } from "@/features/payroll/components/payroll-edit/PayrollAttendanceLogsTable";
import {
  PayrollCalculationFooter,
  PayrollOvertimeConfirmation,
} from "@/features/payroll/components/payroll-edit/PayrollCalculationActions";
import { PayrollCalculationHeader } from "@/features/payroll/components/payroll-edit/PayrollCalculationHeader";
import { PayrollCalculationSidebar } from "@/features/payroll/components/payroll-edit/PayrollCalculationSidebar";
import { PayrollSummaryCards } from "@/features/payroll/components/payroll-edit/PayrollSummaryCards";
import { CutoffAttendanceTable } from "@/features/payroll/components/payroll-edit/CutoffAttendanceTable";
import type { CutoffAttendanceDay } from "@/features/payroll/utils/payrollAttendanceEngine";

interface BranchRateRow {
  site: string;
  hours: number;
  payableDays: number;
  ratePerDay: number;
}

export interface PayrollCalculationWorkspaceProps {
  employeeName: string;
  roleName: string;
  siteLabel: string;
  periodLabel: string | null;
  logs: DailyLogRow[];
  visibleLogs: DailyLogRow[];
  page: number;
  totalPages: number;
  showAllLogs: boolean;
  paidHolidayDates: Set<string>;
  attendanceDays: number;
  daysWorked: number;
  actualWorkedHours: number;
  regularWorkedHours: number;
  overtimeHours: number;
  baseWorkedPay: number;
  overtimePay: number;
  grossPay: number;
  adjustedTotalPay: number;
  adjustmentTotal: number;
  hasBiometricOvertime: boolean;
  biometricOvertimeHours: number;
  biometricOvertimeStatus: "approved" | "rejected" | null;
  confirmBiometricOvertimeStatus: "approved" | "rejected" | null;
  cashAdvanceEntries: PayrollCashAdvanceEntry[];
  overtimeEntries: PayrollOvertimeEntry[];
  paidLeaveEntries: PayrollPaidLeaveEntry[];
  allowanceEntries: PayrollAllowanceEntry[];
  deductionEntries: PayrollDeductionEntry[];
  branchRates: BranchRateRow[];
  showBranchRates: boolean;
  isPayrollManager: boolean;
  isSaving: boolean;
  adjustmentDialog: ReactNode;
  attendanceResolutionDialog?: ReactNode;
  cutoffAttendanceDays?: CutoffAttendanceDay[];
  onResolveAttendance?: (day: CutoffAttendanceDay) => void;
  getRegularHours: (log: DailyLogRow) => number;
  getOvertimeHours: (log: DailyLogRow) => number;
  onUpdateHour: (
    log: DailyLogRow,
    field: "regularHours" | "overtimeHours",
    value: string,
  ) => void;
  onPageChange: (page: number) => void;
  onToggleAllLogs: () => void;
  onToggleBranchRates: () => void;
  onOpenAdjustment: (form: Exclude<AdjustmentFormType, null>) => void;
  onRemoveCashAdvance: (id: string) => void;
  onRemoveOvertime: (id: string) => void;
  onRemovePaidLeave: (id: string) => void;
  onRemoveAllowance: (id: string) => void;
  onBiometricDecision: (status: "approved" | "rejected") => void;
  onCancelBiometricDecision: () => void;
  onConfirmBiometricDecision: () => void;
  onClose: () => void;
  onSave: () => void;
}

export function PayrollCalculationWorkspace(
  props: PayrollCalculationWorkspaceProps,
) {
  const summaryProps = {
    attendanceDays: props.attendanceDays,
    daysWorked: props.daysWorked,
    actualWorkedHours: props.actualWorkedHours,
    regularWorkedHours: props.regularWorkedHours,
    overtimeHours: props.overtimeHours,
    adjustedTotalPay: props.adjustedTotalPay,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-0 sm:p-3">
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden border border-slate-200 bg-[#f8faf9] shadow-2xl sm:h-[94vh] sm:max-w-[1540px] sm:rounded-2xl">
        <PayrollCalculationHeader
          employeeName={props.employeeName}
          roleName={props.roleName}
          siteLabel={props.siteLabel}
          periodLabel={props.periodLabel}
          onClose={props.onClose}
        />
        <PayrollSummaryCards {...summaryProps} />

        <main className="min-h-0 flex-1 overflow-y-auto p-2.5 sm:p-3 xl:overflow-hidden">
          <div className="grid gap-3 xl:h-full xl:grid-cols-[minmax(0,1.9fr)_minmax(330px,0.72fr)]">
            <div className="space-y-3 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
              {props.cutoffAttendanceDays?.length && props.onResolveAttendance ? (
                <CutoffAttendanceTable
                  days={props.cutoffAttendanceDays}
                  onResolve={props.onResolveAttendance}
                />
              ) : null}
              <details open={!props.cutoffAttendanceDays?.length} className="group">
                <summary className="mb-2 cursor-pointer text-[10px] font-semibold text-slate-500 hover:text-emerald-700">
                  Biometric log editing
                </summary>
                <PayrollAttendanceLogsTable
                logs={props.logs}
                visibleLogs={props.visibleLogs}
                page={props.page}
                totalPages={props.totalPages}
                showAllLogs={props.showAllLogs}
                paidHolidayDates={props.paidHolidayDates}
                getRegularHours={props.getRegularHours}
                getOvertimeHours={props.getOvertimeHours}
                onUpdateHour={props.onUpdateHour}
                onPageChange={props.onPageChange}
                onToggleAllLogs={props.onToggleAllLogs}
                />
              </details>
              <PayrollAdjustmentEntries
                cashAdvanceEntries={props.cashAdvanceEntries}
                overtimeEntries={props.overtimeEntries}
                paidLeaveEntries={props.paidLeaveEntries}
                allowanceEntries={props.allowanceEntries}
                deductionEntries={props.deductionEntries}
                onRemoveCashAdvance={props.onRemoveCashAdvance}
                onRemoveOvertime={props.onRemoveOvertime}
                onRemovePaidLeave={props.onRemovePaidLeave}
                onRemoveAllowance={props.onRemoveAllowance}
              />
            </div>

            <PayrollCalculationSidebar
              {...summaryProps}
              baseWorkedPay={props.baseWorkedPay}
              overtimePay={props.overtimePay}
              grossPay={props.grossPay}
              adjustmentTotal={props.adjustmentTotal}
              hasBiometricOvertime={props.hasBiometricOvertime}
              biometricOvertimeHours={props.biometricOvertimeHours}
              biometricOvertimeStatus={props.biometricOvertimeStatus}
              branchRates={props.branchRates}
              showBranchRates={props.showBranchRates}
              isPayrollManager={props.isPayrollManager}
              onToggleBranchRates={props.onToggleBranchRates}
              onOpenAdjustment={props.onOpenAdjustment}
              onBiometricDecision={props.onBiometricDecision}
            />
          </div>
        </main>

        <PayrollCalculationFooter
          isSaving={props.isSaving}
          saveDisabled={
            props.isSaving ||
            (props.hasBiometricOvertime && props.biometricOvertimeStatus === null)
          }
          onClose={props.onClose}
          onSave={props.onSave}
        />
      </div>

      {props.adjustmentDialog}
      {props.attendanceResolutionDialog}
      <PayrollOvertimeConfirmation
        isOpen={props.confirmBiometricOvertimeStatus !== null}
        onCancel={props.onCancelBiometricDecision}
        onConfirm={props.onConfirmBiometricDecision}
      />
    </div>
  );
}

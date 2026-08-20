import type { PayrollBreakdown } from "@/features/payroll/utils/payrollAttendanceEngine";

export interface PayrollReconciliationCategory {
  category: string;
  differenceCentavos: number;
  explanation: string;
}

export interface PayrollReconciliationResult {
  systemPayCentavos: number;
  manualExpectedPayCentavos: number;
  differenceCentavos: number;
  categories: PayrollReconciliationCategory[];
  isMatched: boolean;
}

export function reconcilePayroll(input: {
  calculation: PayrollBreakdown;
  manualExpectedPayCentavos: number;
  categories?: PayrollReconciliationCategory[];
}): PayrollReconciliationResult {
  const systemPayCentavos = input.calculation.netPayCentavos;
  const manualExpectedPayCentavos = Math.round(input.manualExpectedPayCentavos);
  const differenceCentavos = manualExpectedPayCentavos - systemPayCentavos;
  const explained = (input.categories ?? []).reduce(
    (sum, category) => sum + Math.round(category.differenceCentavos),
    0,
  );
  const categories = [...(input.categories ?? [])];

  if (explained !== differenceCentavos) {
    categories.push({
      category: "Unexplained precision / rounding",
      differenceCentavos: differenceCentavos - explained,
      explanation:
        "The source displays rounded daily hours and does not expose the underlying precision needed to allocate this difference safely.",
    });
  }

  return {
    systemPayCentavos,
    manualExpectedPayCentavos,
    differenceCentavos,
    categories,
    isMatched: differenceCentavos === 0,
  };
}

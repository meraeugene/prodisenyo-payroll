"use client";

import PayrollEditModal from "@/features/payroll/components/PayrollEditModal";
import PayrollRateModal from "@/features/payroll/components/PayrollRateModal";
import { useAppState } from "@/features/app/AppStateProvider";
import type { AppRole } from "@/types/database";

export default function DashboardOverlays({ role }: { role: AppRole | null }) {
  const { payroll } = useAppState();

  return (
    <>
      <PayrollRateModal payroll={payroll} />
      <PayrollEditModal payroll={payroll} currentUserRole={role} />
    </>
  );
}

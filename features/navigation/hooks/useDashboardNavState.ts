"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AppRole } from "@/types/database";

export type DashboardNavState = {
  hasSavedAttendance: boolean;
  hasSavedPayroll: boolean;
};

const EMPTY_NAV_STATE: DashboardNavState = {
  hasSavedAttendance: false,
  hasSavedPayroll: false,
};

export function useDashboardNavState(userId: string | null, role: AppRole | null) {
  const [navState, setNavState] = useState<DashboardNavState>(() =>
    role === "ceo"
      ? { hasSavedAttendance: true, hasSavedPayroll: true }
      : EMPTY_NAV_STATE,
  );

  useEffect(() => {
    if (role === "ceo") {
      setNavState({ hasSavedAttendance: true, hasSavedPayroll: true });
      return;
    }

    if (role !== "payroll_manager" || !userId) {
      setNavState(EMPTY_NAV_STATE);
      return;
    }

    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    void Promise.all([
      supabase
        .from("attendance_imports")
        .select("id", { count: "exact", head: true })
        .eq("uploaded_by", userId),
      supabase
        .from("payroll_runs")
        .select("id", { count: "exact", head: true })
        .eq("created_by", userId),
    ]).then(([attendanceResult, payrollResult]) => {
      if (cancelled) return;
      setNavState({
        hasSavedAttendance: (attendanceResult.count ?? 0) > 0,
        hasSavedPayroll: (payrollResult.count ?? 0) > 0,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [role, userId]);

  return navState;
}

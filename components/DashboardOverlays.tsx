"use client";

import { useEffect, useState } from "react";
import PayrollEditModal from "@/features/payroll/components/PayrollEditModal";
import PayrollRateModal from "@/features/payroll/components/PayrollRateModal";
import { useAppState } from "@/features/app/AppStateProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AppRole } from "@/types/database";

export default function DashboardOverlays() {
  const { payroll } = useAppState();
  const [role, setRole] = useState<AppRole | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        setRole(null);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!cancelled) {
        setRole(((data ?? null) as { role?: AppRole } | null)?.role ?? null);
      }
    }

    void loadRole();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PayrollRateModal payroll={payroll} />
      <PayrollEditModal payroll={payroll} currentUserRole={role} />
    </>
  );
}

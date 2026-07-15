"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type NotificationCounts = {
  overtime: number;
  payrollReports: number;
  estimateReviews: number;
};

const EMPTY_COUNTS: NotificationCounts = {
  overtime: 0,
  payrollReports: 0,
  estimateReviews: 0,
};

let activeRequest: Promise<NotificationCounts | null> | null = null;

function loadNotificationCounts() {
  if (activeRequest) return activeRequest;

  const supabase = createSupabaseBrowserClient();
  activeRequest = Promise.all([
    supabase
      .from("payroll_adjustments")
      .select("id", { count: "exact", head: true })
      .eq("adjustment_type", "overtime")
      .eq("status", "pending"),
    supabase
      .from("overtime_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("payroll_runs")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted"),
    supabase
      .from("project_estimates")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted"),
  ])
    .then(([payrollOvertime, requestOvertime, payrollReports, estimates]) => {
      if (
        payrollOvertime.error ||
        requestOvertime.error ||
        payrollReports.error ||
        estimates.error
      ) {
        return null;
      }

      return {
        overtime: (payrollOvertime.count ?? 0) + (requestOvertime.count ?? 0),
        payrollReports: payrollReports.count ?? 0,
        estimateReviews: estimates.count ?? 0,
      };
    })
    .finally(() => {
      activeRequest = null;
    });

  return activeRequest;
}

export function useSidebarNotificationCounts(enabled: boolean) {
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const previousCounts = useRef<NotificationCounts | null>(null);
  const canPlaySound = useRef(false);

  useEffect(() => {
    const enableSound = () => {
      canPlaySound.current = true;
    };
    window.addEventListener("pointerdown", enableSound, { once: true });
    window.addEventListener("keydown", enableSound, { once: true });
    return () => {
      window.removeEventListener("pointerdown", enableSound);
      window.removeEventListener("keydown", enableSound);
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setCounts(EMPTY_COUNTS);
      previousCounts.current = null;
      return;
    }

    let cancelled = false;

    async function refresh() {
      if (document.visibilityState === "hidden") return;
      const nextCounts = await loadNotificationCounts();
      if (!nextCounts || cancelled) return;

      const previous = previousCounts.current;
      setCounts(nextCounts);

      if (
        previous &&
        canPlaySound.current &&
        (nextCounts.overtime > previous.overtime ||
          nextCounts.estimateReviews > previous.estimateReviews)
      ) {
        const audio = new Audio("/sounds/overtime-approval.mp3");
        audio.volume = 0.9;
        void audio.play().catch(() => undefined);
      }
      previousCounts.current = nextCounts;
    }

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const intervalId = window.setInterval(() => void refresh(), 30000);

    void refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("payroll:pending-count-changed", refresh);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("payroll:pending-count-changed", refresh);
    };
  }, [enabled]);

  return counts;
}

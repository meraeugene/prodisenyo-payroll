"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardPageHero from "@/components/DashboardPageHero";
import AttendanceReviewSection from "@/features/attendance/components/AttendanceReviewSection";
import { useAppState } from "@/features/app/AppStateProvider";

export default function ReviewAttendancePage() {
  const router = useRouter();
  const { hydrated, records, site, attendance, workspaceReset } = useAppState();

  useEffect(() => {
    if (hydrated && (workspaceReset || records.length === 0)) {
      router.replace("/upload-attendance");
    }
  }, [hydrated, records.length, router, workspaceReset]);

  if (!hydrated || workspaceReset || records.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 p-0 sm:p-4">
      <DashboardPageHero
        eyebrow="Attendance"
        title="Review Attendance"
        description="Check cleaned employee logs, verify branch records, and confirm attendance before payroll generation."
      />
      <AttendanceReviewSection
        step={records.length > 0 ? 2 : 1}
        site={site}
        records={records}
        attendance={attendance}
      />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import PayrollInsightsDashboard from "@/components/PayrollInsightsDashboard";
import StepIndicator from "@/components/StepIndicator";
import UploadZone from "@/components/UploadZone";
import AttendanceAnalyticsSection from "@/features/analytics/components/AttendanceAnalyticsSection";
import AttendanceReviewSection from "@/features/attendance/components/AttendanceReviewSection";
import { useAttendanceReview } from "@/features/attendance/hooks/useAttendanceReview";
import PayrollEditModal from "@/features/payroll/components/PayrollEditModal";
import PayrollRateModal from "@/features/payroll/components/PayrollRateModal";
import PayrollSection from "@/features/payroll/components/PayrollSection";
import { usePayrollState } from "@/features/payroll/hooks/usePayrollState";
import type { ParseResult } from "@/lib/parser";
import type { AttendanceRecord, Employee, Step } from "@/types";

export default function HomePage() {
  const [step, setStep] = useState<Step>(1);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [site, setSite] = useState("Unknown Site");
  const [attendancePeriod, setAttendancePeriod] = useState("Current Period");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [uploadResetSignal, setUploadResetSignal] = useState(0);

  const attendance = useAttendanceReview(records);
  const payroll = usePayrollState({
    dailyRows: attendance.dailyRows,
    attendancePeriod,
    availableSites: attendance.availableSites,
  });

  function handleParsed(result: ParseResult) {
    setEmployees(result.employees);
    setRecords(result.records);
    setAttendancePeriod(result.period);
    setSite(result.site);
    attendance.resetAttendanceReview();
    payroll.resetPayrollState();
    setStep(2);
  }

  function handleReset() {
    setRecords([]);
    setEmployees([]);
    setSite("Unknown Site");
    setAttendancePeriod("Current Period");
    setUploadResetSignal((prev) => prev + 1);
    attendance.resetAttendanceReview();
    payroll.resetPayrollState();
    setStep(1);
  }

  function handleGeneratePayroll() {
    if (payroll.handleGeneratePayroll()) {
      setStep(3);
    }
  }

  useEffect(() => {
    if (step === 2) {
      window.scrollTo({ top: 500, behavior: "smooth" });
    }
  }, [step]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "/") {
        event.preventDefault();

        if (step === 3 && payroll.payrollGenerated) {
          document.getElementById("searchPayrollEmployee")?.focus();
        } else {
          document.getElementById("searchEmployee")?.focus();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step, payroll.payrollGenerated]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        if (step === 3 && payroll.payrollGenerated) {
          payroll.setPayrollPage((page) =>
            Math.min(payroll.payrollTotalPages, page + 1),
          );
        } else {
          attendance.setRecordsPage((page) =>
            Math.min(attendance.totalRecordPages, page + 1),
          );
        }
      }

      if (event.key === "ArrowLeft") {
        if (step === 3 && payroll.payrollGenerated) {
          payroll.setPayrollPage((page) => Math.max(1, page - 1));
        } else {
          attendance.setRecordsPage((page) => Math.max(1, page - 1));
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    step,
    payroll.payrollGenerated,
    payroll.payrollTotalPages,
    payroll.setPayrollPage,
    attendance.totalRecordPages,
    attendance.setRecordsPage,
    payroll,
    attendance,
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-apple-snow">
      <Nav step={step} handleReset={handleReset} />

      <div className="md:hidden border-b border-apple-mist bg-white px-5 py-3">
        <StepIndicator current={step} />
      </div>

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <section
          className="animate-fade-up"
          style={{ animationFillMode: "both" }}
        >
          <div className="bg-white rounded-3xl border border-apple-mist shadow-apple-xs overflow-hidden">
            <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6 border-b border-apple-mist flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xs font-mono font-semibold text-apple-steel uppercase tracking-widest">
                    Step 1
                  </span>
                  {step > 1 && (
                    <span className="text-2xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                      Complete
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-apple-charcoal tracking-tight">
                  Upload Attendance Reports
                </h2>
                <p className="text-sm text-apple-smoke mt-1">
                  Upload one or more biometric attendance exports as XLS, XLSX,
                  or CSV.
                </p>
              </div>
            </div>

            <div
              className={`px-5 sm:px-8 py-6 sm:py-8 transition-opacity duration-300 ${
                step > 1 ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <UploadZone
                onParsed={handleParsed}
                resetSignal={uploadResetSignal}
              />
            </div>
          </div>
        </section>

        <AttendanceReviewSection
          step={step}
          site={site}
          records={records}
          attendance={attendance}
        />

        <AttendanceAnalyticsSection employees={employees} records={records} />

        <PayrollSection
          dailyRowsCount={attendance.dailyRows.length}
          availableSites={attendance.availableSites}
          payroll={payroll}
          onGeneratePayroll={handleGeneratePayroll}
        />

        {payroll.payrollTab === "payroll" && (
          <PayrollInsightsDashboard
            payrollRows={payroll.payrollRows}
            attendanceRows={payroll.payrollAttendanceInputs}
          />
        )}
      </main>

      <PayrollRateModal
        show={payroll.showPayrollRateModal}
        roleCodes={payroll.roleCodes}
        payrollRateDraft={payroll.payrollRateDraft}
        setPayrollRateDraft={payroll.setPayrollRateDraft}
        onClose={payroll.closePayrollRateModal}
        onApply={payroll.applyPayrollRates}
      />

      <PayrollEditModal payroll={payroll} />

      <Footer />
    </div>
  );
}

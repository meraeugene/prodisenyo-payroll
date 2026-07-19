"use client";

import DashboardPageHero from "@/components/DashboardPageHero";
import OvertimeRequestApprovalQueue from "@/features/payroll/components/OvertimeRequestApprovalQueue";
import PayrollApprovalQueue from "@/features/payroll/components/PayrollApprovalQueue";
import type { OvertimeRequestRecord } from "@/features/overtime-requests/types";
import type { PendingOvertimeRequest } from "@/features/payroll/utils/payrollApprovalQueueHelpers";

export default function OvertimeApprovalsPageClient({
  initialRequests,
  initialOvertimeRequests,
}: {
  initialRequests: PendingOvertimeRequest[];
  initialOvertimeRequests: OvertimeRequestRecord[];
}) {
  return (
    <div className="space-y-4 p-0 sm:p-6">
      <DashboardPageHero eyebrow="CEO Review" title="Overtime Approvals" />

      <div className="grid gap-4 xl:grid-cols-2 xl:items-stretch">
        <div className="min-w-0 xl:h-[calc(100vh-15rem)]">
          <PayrollApprovalQueue role="ceo" initialRequests={initialRequests} />
        </div>
        <div className="min-w-0 xl:h-[calc(100vh-15rem)]">
          <OvertimeRequestApprovalQueue
            initialRequests={initialOvertimeRequests}
          />
        </div>
      </div>
    </div>
  );
}

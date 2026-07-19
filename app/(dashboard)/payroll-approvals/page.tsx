import { requireRole } from "@/lib/auth";
import PayrollReportsPageClient from "@/features/payroll-reports/components/PayrollReportsPageClient";
import { getPayrollReportsDataAction } from "@/actions/payroll";

export default async function PayrollApprovalsPage() {
  await requireRole("ceo");
  const initialData = await getPayrollReportsDataAction();

  return <PayrollReportsPageClient initialData={initialData} />;
}

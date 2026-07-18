import { APP_ROLES, requireRole } from "@/lib/auth";
import PurchasingApprovalsPageClient from "@/features/purchasing-approvals/components/PurchasingApprovalsPageClient";

export default async function Page() {
  await requireRole(APP_ROLES.CEO);
  return <PurchasingApprovalsPageClient />;
}

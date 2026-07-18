import { APP_ROLES, requireRole } from "@/lib/auth";
import MaterialApprovalsPageClient from "@/features/material-approvals/components/MaterialApprovalsPageClient";

export default async function Page() {
  await requireRole(APP_ROLES.CEO);
  return <MaterialApprovalsPageClient />;
}

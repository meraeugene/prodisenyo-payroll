import { APP_ROLES, requireRole } from "@/lib/auth";
import PurchasingWorkspace from "@/features/purchasing-approvals/components/PurchasingWorkspace";

export default async function Page() {
  await requireRole(APP_ROLES.PURCHASER);

  return <PurchasingWorkspace />;
}

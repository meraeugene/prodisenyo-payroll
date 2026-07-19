import { APP_ROLES, requireRole } from "@/lib/auth";
import ResetDataPageClient from "@/features/reset-data/components/ResetDataPageClient";

export default async function ResetDataPage() {
  await requireRole(APP_ROLES.ADMIN);

  return <ResetDataPageClient />;
}

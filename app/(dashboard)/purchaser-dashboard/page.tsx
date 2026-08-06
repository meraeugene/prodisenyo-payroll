import { APP_ROLES, requireRole } from "@/lib/auth";
import PurchaserDashboardPageClient from "@/features/purchaser-dashboard/components/PurchaserDashboardPageClient";
import { getPurchaserDashboardData } from "@/features/purchaser-dashboard/server/getPurchaserDashboardData";

export default async function PurchaserDashboardPage() {
  const { user, profile } = await requireRole(APP_ROLES.PURCHASER);
  const data = await getPurchaserDashboardData(user.id);

  return (
    <PurchaserDashboardPageClient data={data} fullName={profile.full_name} />
  );
}

import { APP_ROLES, requireRole } from "@/lib/auth";
import CeoDashboardPage from "@/features/ceo-dashboard/components/CeoDashboardPage";
import { getCeoDashboardData } from "@/features/ceo-dashboard/server/getCeoDashboardData";

export default async function DashboardPage() {
  const { profile } = await requireRole(APP_ROLES.CEO);
  const data = await getCeoDashboardData();

  return <CeoDashboardPage data={data} fullName={profile.full_name} />;
}
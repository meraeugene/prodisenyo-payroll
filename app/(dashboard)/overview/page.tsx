import { APP_ROLES, requireRole } from "@/lib/auth";
import EngineerDashboardPage from "@/features/engineer-dashboard/components/EngineerDashboardPage";
import { getEngineerDashboardData } from "@/features/engineer-dashboard/server/getEngineerDashboardData";

export default async function OverviewPage() {
  const { user, profile } = await requireRole(APP_ROLES.ENGINEER);
  const data = await getEngineerDashboardData({ userId: user.id, fullName: profile.full_name || profile.username });
  return <EngineerDashboardPage data={data} />;
}

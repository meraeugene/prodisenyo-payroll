import { APP_ROLES, requireRole } from "@/lib/auth";
import RoleHomePage from "@/features/home/components/RoleHomePage";

export default async function HomePage() {
  const { profile } = await requireRole([
    APP_ROLES.CEO,
    APP_ROLES.ENGINEER,
    APP_ROLES.EMPLOYEE,
  ]);

  return (
    <RoleHomePage
      role={profile.role}
      fullName={profile.full_name}
      username={profile.username}
    />
  );
}

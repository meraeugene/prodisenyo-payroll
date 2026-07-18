import { APP_ROLES, requireRole } from "@/lib/auth";
import ProjectsPageClient from "@/features/projects/components/ProjectsPageClient";

export default async function Page() {
  const { profile } = await requireRole([APP_ROLES.CEO, APP_ROLES.ENGINEER]);
  return (
    <ProjectsPageClient
      role={profile.role as "ceo" | "engineer"}
      fullName={profile.full_name}
    />
  );
}

import { APP_ROLES, requireRole } from "@/lib/auth";
import ProjectsPageClient from "@/features/projects/components/ProjectsPageClient";

type ProjectsSearchParams = {
  section?: string;
};

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<ProjectsSearchParams>;
}) {
  const { profile } = await requireRole([APP_ROLES.CEO, APP_ROLES.ENGINEER]);
  const params = searchParams ? await searchParams : undefined;
  const initialSection =
    params?.section === "material-approvals" ||
    params?.section === "purchasing-approvals"
      ? params.section
      : "portfolio";

  return (
    <ProjectsPageClient
      role={profile.role as "ceo" | "engineer"}
      fullName={profile.full_name}
      initialSection={initialSection}
    />
  );
}

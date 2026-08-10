import { requireRole, APP_ROLES } from "@/lib/auth";
import CeoOperationsPageClient from "@/features/operations/components/CeoOperationsPageClient";
import EngineerOperationsPageClient from "@/features/operations/components/EngineerOperationsPageClient";
import { getOperationsPageData } from "@/features/operations/server/getOperationsPageData";

export default async function OperationsPage() {
  const { user, profile } = await requireRole([APP_ROLES.CEO, APP_ROLES.ENGINEER]);
  const { projects, engineers, requests } = await getOperationsPageData();
  const visibleProjects = profile.role === APP_ROLES.CEO ? projects : projects.filter((project: any) => project.lead_engineer_id === user.id || project.tasks?.some((task: any) => task.assignee_id === user.id));
  return profile.role === APP_ROLES.CEO
    ? <CeoOperationsPageClient projects={visibleProjects} engineers={engineers} requests={requests} />
    : <EngineerOperationsPageClient projects={visibleProjects} />;
}

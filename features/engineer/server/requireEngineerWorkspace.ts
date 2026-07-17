import { APP_ROLES, requireRole } from "@/lib/auth";
import { getEngineerWorkspaceData } from "@/features/engineer/server/getEngineerWorkspaceData";
import { getEngineerMockWorkspaceData, shouldUseEngineerMockFallback } from "@/features/engineer/utils/engineerMockData";

export async function requireEngineerWorkspace() {
  const { user, profile } = await requireRole(APP_ROLES.ENGINEER);
  const engineerProfile = { id: profile.id, full_name: profile.full_name, username: profile.username };
  let data;
  try {
    data = await getEngineerWorkspaceData({ userId: user.id, profile: engineerProfile });
  } catch (error) {
    if (!shouldUseEngineerMockFallback()) throw error;
    console.warn("Engineer workspace database unavailable; using development preview data.", error);
    data = getEngineerMockWorkspaceData(engineerProfile);
  }
  return { user, profile, data };
}

import { APP_ROLES, requireRole } from "@/lib/auth";
import UserManagementPageClient from "@/features/user-management/components/UserManagementPageClient";
import type { ManagedUserRow } from "@/features/user-management/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AddUserPage() {
  const { user } = await requireRole(APP_ROLES.ADMIN);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, username, email, role, is_active, created_at")
    .order("created_at", { ascending: false });

  return (
    <UserManagementPageClient
      initialUsers={(data ?? []) as ManagedUserRow[]}
      currentUserId={user.id}
    />
  );
}

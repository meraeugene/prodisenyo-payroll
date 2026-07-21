import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import MaterialRequestPageClient from "@/features/material-requests/components/MaterialRequestPageClient";
import {
  mapMaterialRequestRow,
  parseMaterialRequestPayload,
} from "@/features/material-requests/utils/materialRequestMappers";
import type { MaterialRequestRecord } from "@/features/material-requests/types";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

interface MaterialRequestAuditRow {
  id: string;
  entity_id: string;
  payload: unknown;
  created_at: string;
}

export default async function MaterialRequestPage() {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const supabase = await createSupabaseServerClient();
  const database = createSupabaseAdminClient() as any;

  const { data: requestRows, error: requestError } = await supabase
    .from("material_requests")
    .select("id, project_id, project:projects(name), material_name, quantity, unit, needed_by, site, priority, notes, status, created_at")
    .eq("requested_by", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  let initialRequests: MaterialRequestRecord[] = [];

  if (!requestError) {
    initialRequests = ((requestRows ?? []) as any[]).map(mapMaterialRequestRow);
  } else {
    const { data } = await supabase
      .from("audit_logs")
      .select("id, entity_id, payload, created_at")
      .eq("actor_id", user.id)
      .eq("entity_type", "material_request")
      .eq("action", "material_request_created")
      .order("created_at", { ascending: false })
      .limit(20);

    initialRequests = ((data ?? []) as MaterialRequestAuditRow[])
      .map((row) =>
        parseMaterialRequestPayload({
          id: row.id,
          requestId: row.entity_id,
          payload: row.payload,
          createdAt: row.created_at,
        }),
      )
      .filter((row): row is MaterialRequestRecord => row !== null);
  }

  const { data: projects } = await database.from("projects").select("id,name").eq("assigned_engineer_id", user.id).neq("status", "archived").order("name");
  return <MaterialRequestPageClient initialRequests={initialRequests} projects={projects ?? []} />;
}

import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import PurchasingPageClient from "@/features/operations/components/PurchasingPageClient";

export default async function PurchasingPage() {
  const { user, profile } = await requireRole([APP_ROLES.CEO, APP_ROLES.PURCHASER]); const db=createSupabaseAdminClient() as any;
  let query=db.from("material_requests").select("*, requester:profiles!material_requests_requested_by_fkey(full_name,username), purchaser:profiles!material_requests_assigned_purchaser_id_fkey(full_name,username), project:operations_projects(name,site)").in("status",["assigned","ordered","partially_delivered","delivered","cancelled"]).order("updated_at",{ascending:false});
  if(profile.role===APP_ROLES.PURCHASER)query=query.eq("assigned_purchaser_id",user.id);
  const {data}=await query; return <PurchasingPageClient requests={data??[]} readOnly={profile.role===APP_ROLES.CEO}/>;
}

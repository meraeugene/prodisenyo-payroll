"use server";

import { revalidatePath } from "next/cache";
import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function getMaterialApprovalQueueAction(projectId?: string) {
  await requireRole(APP_ROLES.CEO);
  const db=createSupabaseAdminClient() as any;
  let query=db.from("material_requests").select("*,project:projects(name),requester:profiles!material_requests_requested_by_fkey(full_name,username)").order("created_at",{ascending:false});
  if(projectId) query=query.eq("project_id",projectId);
  const {data,error}=await query;
  if(error) throw new Error(`Failed to load material requests. ${error.message}`);
  return data??[];
}

export async function reviewMaterialRequestAction(input:{requestId:string;decision:"approve"|"reject";notes?:string}) {
  const {user}=await requireRole(APP_ROLES.CEO);
  const db=createSupabaseAdminClient() as any;
  if(!input.requestId) throw new Error("Material request is required.");
  if(input.decision==="approve"){
    const {data,error}=await db.rpc("approve_material_request_and_create_order",{p_request_id:input.requestId,p_actor:user.id,p_notes:input.notes?.trim()||null});
    if(error) throw new Error(`Failed to approve material request. ${error.message}`);
    revalidatePath("/material-approvals"); revalidatePath("/purchasing-approvals"); revalidatePath("/purchaser-dashboard"); revalidatePath("/dashboard"); revalidatePath("/projects");
    return {purchaseOrderId:data};
  }
  const reason=input.notes?.trim();
  if(!reason) throw new Error("A rejection reason is required.");
  const {data:request,error:loadError}=await db.from("material_requests").select("id,project_id,requested_by,material_name,status").eq("id",input.requestId).single();
  if(loadError||!request) throw new Error("Material request not found.");
  if(!["submitted","approved","purchasing"].includes(request.status)) throw new Error("Material request can no longer be rejected.");
  const now=new Date().toISOString();
  const {error}=await db.from("material_requests").update({status:"rejected",rejected_by:user.id,rejected_at:now,rejection_reason:reason,approved_by:null,approved_at:null}).eq("id",input.requestId);
  if(error) throw new Error(`Failed to reject material request. ${error.message}`);
  await db.from("workflow_notifications").insert({recipient_id:request.requested_by,project_id:request.project_id,kind:"material_rejected",title:"Material request returned",message:`${request.material_name} was returned: ${reason}`,entity_type:"material_request",entity_id:request.id});
  revalidatePath("/material-approvals"); revalidatePath("/dashboard"); revalidatePath("/projects");
  return {purchaseOrderId:null};
}

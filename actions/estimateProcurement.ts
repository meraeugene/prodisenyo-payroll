"use server";

import { revalidatePath } from "next/cache";
import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type CeoEstimateEditItem = {
  id: string;
  quantity: number;
  unitCost: number;
  notes?: string;
  pricingBasis: "catalog" | "supplier_quote";
  referenceSupplier?: string;
  referenceQuotation?: string;
};

function revalidateEstimateProcurement(projectId?: string | null) {
  revalidatePath("/estimate-approvals");
  revalidatePath("/estimate-reviews");
  revalidatePath("/cost-estimator");
  revalidatePath("/dashboard");
  revalidatePath("/overview");
  revalidatePath("/projects");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

async function loadEstimateResult(database: any, estimateId: string) {
  const [{ data: estimate, error: estimateError }, { data: items, error: itemError }] =
    await Promise.all([
      database
        .from("project_estimates")
        .select("*, requester_profile:profiles!project_estimates_requested_by_fkey(full_name, username)")
        .eq("id", estimateId)
        .single(),
      database
        .from("project_estimate_items")
        .select("*")
        .eq("estimate_id", estimateId)
        .order("sort_order"),
    ]);

  if (estimateError || !estimate) {
    throw new Error(`Failed to reload estimate. ${estimateError?.message ?? "Unknown error"}`);
  }
  if (itemError) throw new Error(`Failed to reload estimate items. ${itemError.message}`);
  return { estimate, items: items ?? [] };
}

export async function updateSubmittedEstimateByCeoAction(input: {
  estimateId: string;
  items: CeoEstimateEditItem[];
}) {
  const { user } = await requireRole(APP_ROLES.CEO);
  if (!input.estimateId) throw new Error("Estimate is required.");
  if (!input.items.length) throw new Error("At least one estimate item is required.");

  const items = input.items.map((item) => {
    const quantity = Number(item.quantity);
    const unitCost = Number(item.unitCost);
    if (!item.id) throw new Error("Every estimate line must have an ID.");
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Every quantity must be greater than zero.");
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      throw new Error("Unit costs cannot be negative.");
    }
    if (
      item.pricingBasis === "supplier_quote" &&
      (!item.referenceSupplier?.trim() || !item.referenceQuotation?.trim())
    ) {
      throw new Error("Supplier and quotation reference are required for supplier pricing.");
    }
    return {
      id: item.id,
      quantity: Math.round(quantity * 100) / 100,
      unitCost: Math.round(unitCost * 100) / 100,
      notes: item.notes?.trim() ?? "",
      pricingBasis: item.pricingBasis,
      referenceSupplier: item.referenceSupplier?.trim() ?? "",
      referenceQuotation: item.referenceQuotation?.trim() ?? "",
    };
  });

  const database = createSupabaseAdminClient() as any;
  const { error } = await database.rpc("ceo_update_submitted_estimate", {
    p_estimate_id: input.estimateId,
    p_actor: user.id,
    p_items: items,
  });
  if (error) throw new Error(`Failed to update estimate. ${error.message}`);

  const result = await loadEstimateResult(database, input.estimateId);
  revalidateEstimateProcurement(result.estimate.project_id);
  return result;
}

export async function approveProjectEstimateWithBaselineAction(estimateId: string) {
  const { user } = await requireRole(APP_ROLES.CEO);
  if (!estimateId) throw new Error("Estimate is required.");
  const database = createSupabaseAdminClient() as any;
  const { data: budgetProjectId, error } = await database.rpc(
    "approve_project_estimate_with_baseline",
    { p_estimate_id: estimateId, p_actor: user.id },
  );
  if (error) throw new Error(`Failed to approve estimate. ${error.message}`);

  const result = await loadEstimateResult(database, estimateId);
  revalidateEstimateProcurement(result.estimate.project_id);
  return { ...result, budgetProjectId };
}

export async function activateProjectAfterEstimateAction(input: {
  projectId: string;
  engineerId: string;
}) {
  const { user } = await requireRole(APP_ROLES.CEO);
  const projectId = input.projectId.trim();
  const engineerId = input.engineerId.trim();
  if (!projectId) throw new Error("Project is required.");
  if (!engineerId) throw new Error("Select the project engineer or manager.");

  const database = createSupabaseAdminClient() as any;
  const { data: project, error } = await database.rpc(
    "activate_project_after_estimate",
    {
      p_project_id: projectId,
      p_actor: user.id,
      p_engineer: engineerId,
    },
  );
  if (error) throw new Error(`Failed to activate project. ${error.message}`);

  revalidateEstimateProcurement(projectId);
  revalidatePath("/request-material");
  return project;
}

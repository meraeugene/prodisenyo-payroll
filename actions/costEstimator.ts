"use server";

import { revalidatePath } from "next/cache";
import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  BudgetItemCategory,
  BudgetProjectType,
  Database,
} from "@/types/database";

type CostCatalogItemInsert =
  Database["public"]["Tables"]["cost_catalog_items"]["Insert"];
type CostCatalogItemUpdate =
  Database["public"]["Tables"]["cost_catalog_items"]["Update"];
type ProjectEstimateInsert =
  Database["public"]["Tables"]["project_estimates"]["Insert"];
type ProjectEstimateUpdate =
  Database["public"]["Tables"]["project_estimates"]["Update"];
type ProjectEstimateItemInsert =
  Database["public"]["Tables"]["project_estimate_items"]["Insert"];
type BudgetProjectInsert =
  Database["public"]["Tables"]["budget_projects"]["Insert"];

interface SaveCostCatalogItemInput {
  id?: string;
  name: string;
  category: BudgetItemCategory;
  unitLabel: string;
  unitCost?: number;
  notes?: string;
}

interface SaveProjectEstimateDraftInput {
  id?: string;
  projectId?: string;
  projectName?: string;
  projectType?: BudgetProjectType | "";
  location?: string;
  ownerName?: string;
  costEstimate?: number;
  notes?: string;
  items: Array<{
    id?: string;
    catalogItemId?: string;
    materialName?: string;
    unitType?: string;
    unitCost?: number;
    quantity?: number;
    displayName?: string;
    notes?: string;
    pricingBasis?: "catalog" | "supplier_quote";
    referenceSupplier?: string;
    referenceQuotation?: string;
    sortOrder?: number;
  }>;
}

interface RejectProjectEstimateInput {
  estimateId: string;
  rejectionReason?: string;
}

interface EngineerEstimateNotificationRow {
  id: string;
  project_name: string;
  status: Database["public"]["Tables"]["project_estimates"]["Row"]["status"];
  rejection_reason: string | null;
  rejected_at: string | null;
  updated_at: string;
}

async function loadEstimateReviewsData(database: any, projectId?: string) {
  let query = database
    .from("project_estimates")
    .select(
      "*, requester_profile:profiles!project_estimates_requested_by_fkey(full_name, username)",
    )
    .neq("status", "draft");
  if (projectId) query = query.eq("project_id", projectId);
  const { data: estimateData, error: estimateError } = await query.order(
    "updated_at",
    { ascending: false },
  );

  if (estimateError) {
    throw new Error(`Failed to load estimate reviews. ${estimateError.message}`);
  }

  const estimates =
    (estimateData ?? []) as Array<
      Database["public"]["Tables"]["project_estimates"]["Row"] & {
        requester_profile: Pick<
          Database["public"]["Tables"]["profiles"]["Row"],
          "full_name" | "username"
        > | null;
      }
    >;
  const estimateIds = estimates.map((estimate) => estimate.id);

  let items: Database["public"]["Tables"]["project_estimate_items"]["Row"][] = [];

  if (estimateIds.length > 0) {
    const { data: itemData, error: itemError } = await database
      .from("project_estimate_items")
      .select("*")
      .in("estimate_id", estimateIds)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (itemError) {
      throw new Error(`Failed to load estimate review items. ${itemError.message}`);
    }

    items =
      (itemData ??
        []) as Database["public"]["Tables"]["project_estimate_items"]["Row"][];
  }

  return { estimates, items };
}

function normalizeText(value: string | undefined) {
  return (value ?? "").trim();
}

async function requirePlanningEstimateAssignment(
  database: any,
  projectId: string | null,
  userId: string,
) {
  if (!projectId) throw new Error("Estimate must be linked to a pending project.");
  const { data: project } = await database
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("assigned_estimate_engineer_id", userId)
    .eq("status", "planning")
    .maybeSingle();
  if (!project) {
    throw new Error("Cost estimation is available only while the assigned project is pending.");
  }
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeLocation(value: string | undefined) {
  const normalized = normalizeText(value);
  const lowered = normalized.toLowerCase();
  if (!normalized) return null;
  if (lowered === "philippine peso (php)" || lowered === "php") return null;
  return normalized;
}

function normalizeMoney(value: number | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100) / 100;
}

function normalizeQuantity(value: number | undefined) {
  const quantity = Number(value ?? 0);
  if (!Number.isFinite(quantity) || quantity < 0) return 0;
  return Math.round(quantity * 100) / 100;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isMissingProjectEstimateColumnError(
  error: unknown,
  columnName: string,
) {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes("project_estimates") &&
    message.includes(columnName.toLowerCase()) &&
    message.includes("schema cache")
  );
}

function buildEstimateHeaderPayload(
  input: Pick<
    SaveProjectEstimateDraftInput,
    "projectId" | "projectName" | "projectType" | "location" | "ownerName" | "notes"
  >,
  options?: {
    includeLocation?: boolean;
    includeOwnerName?: boolean;
  },
) {
  const includeLocation = options?.includeLocation ?? true;
  const includeOwnerName = options?.includeOwnerName ?? true;

  return {
    project_id: input.projectId || null,
    project_name: normalizeText(input.projectName),
    project_type: input.projectType || null,
    ...(includeLocation ? { location: normalizeLocation(input.location) } : {}),
    ...(includeOwnerName
      ? { owner_name: normalizeOptionalText(input.ownerName) }
      : {}),
    client_name: null,
    notes: normalizeOptionalText(input.notes),
  };
}

async function updateProjectEstimateDraftRecord(params: {
  database: any;
  estimateId: string;
  input: SaveProjectEstimateDraftInput;
}) {
  let includeLocation = true;
  let includeOwnerName = true;

  while (true) {
    const payload: ProjectEstimateUpdate = {
      ...buildEstimateHeaderPayload(params.input, {
        includeLocation,
        includeOwnerName,
      }),
      rejected_at: null,
      rejection_reason: null,
    };

    const { data, error } = await params.database
      .from("project_estimates")
      .update(payload)
      .eq("id", params.estimateId)
      .select("*")
      .single();

    if (!error) {
      return data as Database["public"]["Tables"]["project_estimates"]["Row"];
    }

    if (includeLocation && isMissingProjectEstimateColumnError(error, "location")) {
      includeLocation = false;
      continue;
    }

    if (includeOwnerName && isMissingProjectEstimateColumnError(error, "owner_name")) {
      includeOwnerName = false;
      continue;
    }

    throw new Error(`Failed to update estimate draft. ${error.message}`);
  }
}

async function insertProjectEstimateDraftRecord(params: {
  database: any;
  userId: string;
  requestedTotal: number;
  input: SaveProjectEstimateDraftInput;
}) {
  let includeLocation = true;
  let includeOwnerName = true;

  while (true) {
    const payload: ProjectEstimateInsert = {
      ...buildEstimateHeaderPayload(params.input, {
        includeLocation,
        includeOwnerName,
      }),
      requested_by: params.userId,
      status: "draft",
      estimate_total: params.requestedTotal,
    };

    const { data, error } = await params.database
      .from("project_estimates")
      .insert(payload)
      .select("*")
      .single();

    if (!error) {
      return data as Database["public"]["Tables"]["project_estimates"]["Row"];
    }

    if (includeLocation && isMissingProjectEstimateColumnError(error, "location")) {
      includeLocation = false;
      continue;
    }

    if (includeOwnerName && isMissingProjectEstimateColumnError(error, "owner_name")) {
      includeOwnerName = false;
      continue;
    }

    throw new Error(`Failed to create estimate draft. ${error.message}`);
  }
}

function revalidateEstimatorPages() {
  revalidatePath("/cost-estimator");
  revalidatePath("/estimate-approvals");
  revalidatePath("/estimate-reviews");
  revalidatePath("/projects");
  revalidatePath("/budget-tracker");
}

async function loadEstimate(database: any, estimateId: string) {
  const { data, error } = await database
    .from("project_estimates")
    .select("*")
    .eq("id", estimateId)
    .single();

  if (error || !data) {
    throw new Error("Estimate not found.");
  }

  return data as Database["public"]["Tables"]["project_estimates"]["Row"];
}

async function loadEstimateItems(database: any, estimateId: string) {
  const { data, error } = await database
    .from("project_estimate_items")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load estimate items. ${error.message}`);
  }

  return (data ??
    []) as Database["public"]["Tables"]["project_estimate_items"]["Row"][];
}

async function insertAuditLog(
  database: any,
  actorId: string,
  action: string,
  entityId: string,
  payload: Record<string, unknown>,
) {
  await database.from("audit_logs").insert({
    actor_id: actorId,
    action,
    entity_type: "project_estimate",
    entity_id: entityId,
    payload,
  });
}

async function loadApprovedBudgetProject(database: any, estimateId: string) {
  const { data, error } = await database
    .from("budget_projects")
    .select("id")
    .eq("source_estimate_id", estimateId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check budget project. ${error.message}`);
  }

  return (data as { id: string } | null) ?? null;
}

async function persistEstimateItems(params: {
  database: any;
  estimateId: string;
  items: SaveProjectEstimateDraftInput["items"];
}) {
  const catalogItemIds = Array.from(
    new Set(
      params.items
        .map((item) => normalizeText(item.catalogItemId))
        .filter((value) => value && isUuid(value)),
    ),
  );

  let catalogRows: Array<{
    id: string;
    name: string;
    category: BudgetItemCategory;
    unit_label: string;
    unit_cost: number;
  }> = [];

  if (catalogItemIds.length > 0) {
    const { data, error: catalogError } = await params.database
      .from("cost_catalog_items")
      .select("id, name, category, unit_label, unit_cost")
      .in("id", catalogItemIds);

    if (catalogError) {
      throw new Error(`Failed to load materials source. ${catalogError.message}`);
    }

    catalogRows = (data ?? []) as Array<{
      id: string;
      name: string;
      category: BudgetItemCategory;
      unit_label: string;
      unit_cost: number;
    }>;
  }

  const catalogById = new Map(
    catalogRows.map((row) => [row.id, row]),
  );

  const payload: ProjectEstimateItemInsert[] = params.items
    .map((item, index) => {
      const catalogItemId = normalizeText(item.catalogItemId);
      const catalogItem = catalogById.get(catalogItemId);

      const quantity = normalizeQuantity(item.quantity);
      if (quantity <= 0) {
        return null;
      }

      const unitCost = normalizeMoney(item.unitCost ?? catalogItem?.unit_cost);
      const lineTotal = normalizeMoney(unitCost * quantity);
      const materialName = normalizeText(item.materialName) || catalogItem?.name || "Material";
      const displayName = normalizeText(item.displayName) || materialName;
      const unitType = normalizeText(item.unitType) || catalogItem?.unit_label || "";

      return {
        estimate_id: params.estimateId,
        catalog_item_id: catalogItem?.id ?? null,
        item_name_snapshot: displayName,
        material_name_snapshot: materialName,
        category_snapshot: catalogItem?.category ?? "materials",
        unit_label_snapshot: unitType,
        unit_cost_snapshot: unitCost,
        quantity,
        line_total: lineTotal,
        notes: normalizeOptionalText(item.notes),
        pricing_basis: item.pricingBasis ?? "catalog",
        reference_supplier: normalizeOptionalText(item.referenceSupplier),
        reference_quotation: normalizeOptionalText(item.referenceQuotation),
        sort_order: Math.max(0, Math.floor(Number(item.sortOrder ?? index))),
      };
    })
    .filter(Boolean) as ProjectEstimateItemInsert[];

  const total = normalizeMoney(
    payload.reduce((sum, item) => sum + (item.line_total ?? 0), 0),
  );

  const { error: deleteError } = await params.database
    .from("project_estimate_items")
    .delete()
    .eq("estimate_id", params.estimateId);

  if (deleteError) {
    throw new Error(`Failed to refresh estimate items. ${deleteError.message}`);
  }

  if (payload.length === 0) {
    return {
      items: [] as Database["public"]["Tables"]["project_estimate_items"]["Row"][],
      total,
    };
  }

  const { data: insertedItems, error: insertError } = await params.database
    .from("project_estimate_items")
    .insert(payload)
    .select("*");

  if (insertError) {
    throw new Error(`Failed to save estimate items. ${insertError.message}`);
  }

  return {
    items: (insertedItems ??
      []) as Database["public"]["Tables"]["project_estimate_items"]["Row"][],
    total,
  };
}

export async function saveCostCatalogItemAction(input: SaveCostCatalogItemInput) {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const database = createSupabaseAdminClient() as any;
  const name = normalizeText(input.name);
  const unitLabel = normalizeText(input.unitLabel);

  if (!name) {
    throw new Error("Catalog item name is required.");
  }

  if (!unitLabel) {
    throw new Error("Unit label is required.");
  }

  if (input.id) {
    const payload: CostCatalogItemUpdate = {
      name,
      category: input.category,
      unit_label: unitLabel,
      unit_cost: normalizeMoney(input.unitCost),
      notes: normalizeOptionalText(input.notes),
      updated_by: user.id,
    };

    const { data, error } = await database
      .from("cost_catalog_items")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to update catalog item. ${error.message}`);
    }

    revalidateEstimatorPages();
    return { catalogItem: data };
  }

  const payload: CostCatalogItemInsert = {
    name,
    category: input.category,
    unit_label: unitLabel,
    unit_cost: normalizeMoney(input.unitCost),
    notes: normalizeOptionalText(input.notes),
    is_active: true,
    created_by: user.id,
    updated_by: user.id,
  };

  const { data, error } = await database
    .from("cost_catalog_items")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create catalog item. ${error.message}`);
  }

  revalidateEstimatorPages();
  return { catalogItem: data };
}

export async function archiveCostCatalogItemAction(catalogItemId: string) {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const database = createSupabaseAdminClient() as any;
  const normalizedId = normalizeText(catalogItemId);

  if (!normalizedId) {
    throw new Error("Catalog item is required.");
  }

  const { error } = await database
    .from("cost_catalog_items")
    .update({
      is_active: false,
      updated_by: user.id,
    })
    .eq("id", normalizedId);

  if (error) {
    throw new Error(`Failed to archive catalog item. ${error.message}`);
  }

  revalidateEstimatorPages();
  return { catalogItemId: normalizedId };
}

export async function saveProjectEstimateDraftAction(
  input: SaveProjectEstimateDraftInput,
) {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const database = createSupabaseAdminClient() as any;
  const estimateId = normalizeText(input.id);
  const requestedTotal = normalizeMoney(input.costEstimate);
  const { data: linkedProject } = await database
    .from("projects")
    .select("id,name,location")
    .or(`assigned_engineer_id.eq.${user.id},assigned_estimate_engineer_id.eq.${user.id}`)
    .eq(input.projectId ? "id" : "name", input.projectId || normalizeText(input.projectName))
    .eq("status", "planning")
    .limit(1)
    .maybeSingle();
  if (!linkedProject) throw new Error("Select a project assigned to you before saving an estimate.");
  input = { ...input, projectId: linkedProject.id, projectName: linkedProject.name, location: linkedProject.location };

  let estimate: Database["public"]["Tables"]["project_estimates"]["Row"];

  if (estimateId) {
    const existing = await loadEstimate(database, estimateId);
    if (existing.requested_by !== user.id) {
      throw new Error("You can only edit your own estimates.");
    }
    if (existing.status !== "draft") {
      throw new Error("Only draft estimates can be edited.");
    }

    estimate = await updateProjectEstimateDraftRecord({
      database,
      estimateId,
      input,
    });
  } else {
    estimate = await insertProjectEstimateDraftRecord({
      database,
      userId: user.id,
      requestedTotal,
      input,
    });
  }

  const persisted = await persistEstimateItems({
    database,
    estimateId: estimate.id,
    items: input.items,
  });

  const { data: updatedEstimate, error: updateError } = await database
    .from("project_estimates")
    .update({
      estimate_total: requestedTotal,
    })
    .eq("id", estimate.id)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(`Failed to update estimate total. ${updateError.message}`);
  }

  revalidateEstimatorPages();

  return {
    estimate: updatedEstimate,
    items: persisted.items,
  };
}

export async function deleteProjectEstimateAction(estimateId: string) {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const database = createSupabaseAdminClient() as any;
  const normalizedId = normalizeText(estimateId);

  if (!normalizedId) {
    throw new Error("Estimate is required.");
  }

  const estimate = await loadEstimate(database, normalizedId);
  if (estimate.requested_by !== user.id) {
    throw new Error("You can only delete your own estimates.");
  }
  if (estimate.status === "approved" || estimate.status === "submitted") {
    throw new Error("Submitted or approved estimates cannot be deleted.");
  }

  const { error } = await database
    .from("project_estimates")
    .delete()
    .eq("id", normalizedId);

  if (error) {
    throw new Error(`Failed to delete estimate. ${error.message}`);
  }

  revalidateEstimatorPages();
  return { estimateId: normalizedId };
}

export async function deleteReviewedProjectEstimateAction(estimateId: string) {
  const { user } = await requireRole(APP_ROLES.CEO);
  const database = createSupabaseAdminClient() as any;
  const normalizedId = normalizeText(estimateId);

  if (!normalizedId) {
    throw new Error("Estimate is required.");
  }

  const estimate = await loadEstimate(database, normalizedId);

  const { error } = await database
    .from("project_estimates")
    .delete()
    .eq("id", normalizedId);

  if (error) {
    throw new Error(`Failed to delete estimate. ${error.message}`);
  }

  await insertAuditLog(database, user.id, "project_estimate_deleted", normalizedId, {
    status: estimate.status,
    project_name: estimate.project_name,
  });

  revalidateEstimatorPages();
  return { estimateId: normalizedId };
}

export async function submitProjectEstimateAction(estimateId: string) {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const database = createSupabaseAdminClient() as any;
  const normalizedId = normalizeText(estimateId);

  if (!normalizedId) {
    throw new Error("Estimate is required.");
  }

  const estimate = await loadEstimate(database, normalizedId);
  if (estimate.requested_by !== user.id) {
    throw new Error("You can only submit your own estimates.");
  }
  await requirePlanningEstimateAssignment(database, estimate.project_id, user.id);
  if (estimate.status !== "draft") {
    if (estimate.status === "submitted") {
      return {
        estimate,
        items: await loadEstimateItems(database, estimate.id),
      };
    }
    throw new Error("Only draft estimates can be submitted.");
  }

  const items = await loadEstimateItems(database, estimate.id);

  if (!normalizeText(estimate.project_name)) {
    throw new Error("Project name is required before submission.");
  }

  if (items.length === 0) {
    throw new Error("Add at least one cost item before submission.");
  }

  const estimateTotal = normalizeMoney(estimate.estimate_total);
  const submittedAt = new Date().toISOString();

  const { data, error } = await database
    .from("project_estimates")
    .update({
      status: "submitted",
      estimate_total: estimateTotal,
      submitted_at: submittedAt,
      approved_by: null,
      approved_at: null,
      rejected_at: null,
      rejection_reason: null,
      budget_project_id: null,
    })
    .eq("id", estimate.id)
    .eq("status", "draft")
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to submit estimate. ${error.message}`);
  }

  await insertAuditLog(database, user.id, "project_estimate_submitted", estimate.id, {
    status: "submitted",
    estimate_total: estimateTotal,
    submitted_at: submittedAt,
  });

  revalidateEstimatorPages();
  return {
    estimate: data,
    items,
  };
}

export async function reopenRejectedEstimateAction(estimateId: string) {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const database = createSupabaseAdminClient() as any;
  const normalizedId = normalizeText(estimateId);

  if (!normalizedId) {
    throw new Error("Estimate is required.");
  }

  const estimate = await loadEstimate(database, normalizedId);
  if (estimate.requested_by !== user.id) {
    throw new Error("You can only reopen your own estimates.");
  }
  await requirePlanningEstimateAssignment(database, estimate.project_id, user.id);
  if (estimate.status !== "rejected") {
    throw new Error("Only rejected estimates can be reopened.");
  }

  const { data: reopenedEstimate, error } = await database
    .from("project_estimates")
    .update({
      status: "draft",
      approved_by: null,
      approved_at: null,
      submitted_at: null,
      rejected_at: null,
      rejection_reason: null,
      budget_project_id: null,
    })
    .eq("id", estimate.id)
    .eq("requested_by", user.id)
    .eq("status", "rejected")
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to reopen estimate. ${error.message}`);
  }

  await insertAuditLog(database, user.id, "project_estimate_reopened", estimate.id, {
    status: "draft",
    reopened_from_status: "rejected",
  });

  revalidateEstimatorPages();
  return {
    estimate: reopenedEstimate,
    items: await loadEstimateItems(database, estimate.id),
  };
}

export async function getEngineerEstimateNotificationsAction() {
  const { user } = await requireRole(APP_ROLES.ENGINEER);
  const database = createSupabaseAdminClient() as any;

  const { data, error } = await database
    .from("project_estimates")
    .select("id, project_name, status, rejection_reason, rejected_at, updated_at")
    .eq("requested_by", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load estimate notifications. ${error.message}`);
  }

  return {
    estimates: (data ?? []) as EngineerEstimateNotificationRow[],
  };
}

export async function getEstimateReviewsDataAction(projectId?: string) {
  await requireRole(APP_ROLES.CEO);
  const database = createSupabaseAdminClient() as any;

  return loadEstimateReviewsData(database, normalizeText(projectId));
}

export async function approveProjectEstimateAction(estimateId: string) {
  const { user } = await requireRole(APP_ROLES.CEO);
  const database = createSupabaseAdminClient() as any;
  const normalizedId = normalizeText(estimateId);

  if (!normalizedId) {
    throw new Error("Estimate is required.");
  }

  const estimate = await loadEstimate(database, normalizedId);
  if (estimate.status !== "submitted" && estimate.status !== "approved") {
    throw new Error("Only submitted estimates can be approved.");
  }

  const items = await loadEstimateItems(database, estimate.id);
  const estimateTotal = normalizeMoney(estimate.estimate_total);

  if (!estimate.project_id) throw new Error("This estimate is not linked to a canonical project.");
  let budgetProjectId = estimate.budget_project_id;
  if (!budgetProjectId) {
    const existingBudgetProject = await loadApprovedBudgetProject(database, estimate.id);
    budgetProjectId = existingBudgetProject?.id ?? null;
  }

  if (!budgetProjectId) {
    const { data: budgetProject, error: budgetProjectError } = await database.from("budget_projects").select("id").eq("project_id", estimate.project_id).single();
    if (budgetProjectError || !budgetProject) throw new Error("The project's budget workspace was not found.");
    budgetProjectId = budgetProject.id;
  }

  const approvedAt = new Date().toISOString();
  const { data, error } = await database
    .from("project_estimates")
    .update({
      status: "approved",
      estimate_total: estimateTotal,
      approved_by: user.id,
      approved_at: approvedAt,
      rejected_at: null,
      rejection_reason: null,
      budget_project_id: budgetProjectId,
    })
    .eq("id", estimate.id)
    .in("status", ["submitted", "approved"])
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to approve estimate. ${error.message}`);
  }

  await insertAuditLog(database, user.id, "project_estimate_approved", estimate.id, {
    status: "approved",
    estimate_total: estimateTotal,
    budget_project_id: budgetProjectId,
    approved_at: approvedAt,
  });

  revalidateEstimatorPages();
  return {
    estimate: data,
    items,
    budgetProjectId,
  };
}

export async function rejectProjectEstimateAction(
  input: RejectProjectEstimateInput,
) {
  const { user } = await requireRole(APP_ROLES.CEO);
  const database = createSupabaseAdminClient() as any;
  const estimateId = normalizeText(input.estimateId);

  if (!estimateId) {
    throw new Error("Estimate is required.");
  }

  const estimate = await loadEstimate(database, estimateId);
  if (estimate.status !== "submitted" && estimate.status !== "rejected") {
    throw new Error("Only submitted estimates can be rejected.");
  }

  const rejectedAt = new Date().toISOString();
  const rejectionReason = normalizeOptionalText(input.rejectionReason);

  const { data, error } = await database
    .from("project_estimates")
    .update({
      status: "rejected",
      approved_by: user.id,
      approved_at: null,
      rejected_at: rejectedAt,
      rejection_reason: rejectionReason,
    })
    .eq("id", estimate.id)
    .in("status", ["submitted", "rejected"])
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to reject estimate. ${error.message}`);
  }

  await insertAuditLog(database, user.id, "project_estimate_rejected", estimate.id, {
    status: "rejected",
    rejected_at: rejectedAt,
    rejection_reason: rejectionReason,
  });

  revalidateEstimatorPages();
  return {
    estimate: data,
    items: await loadEstimateItems(database, estimate.id),
  };
}

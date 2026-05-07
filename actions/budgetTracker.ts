"use server";

import { revalidatePath } from "next/cache";
import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  BudgetItemCategory,
  BudgetItemStatus,
  BudgetProjectType,
  Database,
} from "@/types/database";

type BudgetProjectInsert =
  Database["public"]["Tables"]["budget_projects"]["Insert"];
type BudgetItemInsert = Database["public"]["Tables"]["budget_items"]["Insert"];
type BudgetItemUpdate = Database["public"]["Tables"]["budget_items"]["Update"];

interface CreateBudgetProjectInput {
  name: string;
  projectType: BudgetProjectType | "";
  currencyCode?: string;
  startingBudget?: number;
}

interface SaveBudgetItemInput {
  id?: string;
  projectId: string;
  name: string;
  status: BudgetItemStatus;
  category: BudgetItemCategory;
  estimatedCost?: number;
  actualSpent?: number;
  notes?: string;
  sortOrder?: number;
}

interface ReorderBudgetItemsInput {
  projectId: string;
  items: Array<{
    id: string;
    status: BudgetItemStatus;
    sortOrder: number;
  }>;
}

function normalizeCurrencyCode(value: string | undefined): string {
  const normalized = (value ?? "PHP").trim().toUpperCase();
  return normalized.length === 3 ? normalized : "PHP";
}

function normalizeMoney(value: number | undefined): number {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100) / 100;
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim();
}

async function assertBudgetProjectExists(projectId: string) {
  const database = createSupabaseAdminClient() as any;
  const { data, error } = await database
    .from("budget_projects")
    .select("id")
    .eq("id", projectId)
    .eq("is_archived", false)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Budget project not found.");
  }
}

export async function createBudgetProjectAction(
  input: CreateBudgetProjectInput,
) {
  const { user } = await requireRole([
    APP_ROLES.CEO,
    APP_ROLES.ENGINEER,
  ]);
  const name = normalizeText(input.name);
  const database = createSupabaseAdminClient() as any;

  if (!name) {
    throw new Error("Project name is required.");
  }

  const payload: BudgetProjectInsert = {
    name,
    project_type: input.projectType || null,
    currency_code: normalizeCurrencyCode(input.currencyCode),
    starting_budget: normalizeMoney(input.startingBudget),
    created_by: user.id,
    updated_by: user.id,
  };

  const { data, error } = await database
    .from("budget_projects")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create budget project. ${error.message}`);
  }

  revalidatePath("/budget-tracker");

  return {
    project: data,
  };
}

export async function saveBudgetItemAction(input: SaveBudgetItemInput) {
  const { user } = await requireRole([
    APP_ROLES.CEO,
    APP_ROLES.ENGINEER,
  ]);
  const database = createSupabaseAdminClient() as any;
  const projectId = normalizeText(input.projectId);
  const name = normalizeText(input.name);

  if (!projectId) {
    throw new Error("Project is required.");
  }

  if (!name) {
    throw new Error("Cost name is required.");
  }

  if (
    input.estimatedCost === undefined ||
    input.estimatedCost === null ||
    Number.isNaN(Number(input.estimatedCost))
  ) {
    throw new Error("Estimated cost is required.");
  }

  await assertBudgetProjectExists(projectId);

  const sharedPayload = {
    project_id: projectId,
    name,
    status: input.status,
    category: input.category,
    estimated_cost: normalizeMoney(input.estimatedCost),
    actual_spent: normalizeMoney(input.actualSpent),
    notes: normalizeText(input.notes) || null,
    sort_order: Math.max(0, Math.floor(Number(input.sortOrder ?? 0))),
    updated_by: user.id,
  };

  if (input.id) {
    const payload: BudgetItemUpdate = sharedPayload;
    const { data, error } = await database
      .from("budget_items")
      .update(payload)
      .eq("id", input.id)
      .eq("project_id", projectId)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to update budget item. ${error.message}`);
    }

    revalidatePath("/budget-tracker");

    return data;
  } else {
    const { count: currentItemCount, error: countError } = await database
      .from("budget_items")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);

    if (countError) {
      throw new Error(`Failed to prepare budget item. ${countError.message}`);
    }

    const payload: BudgetItemInsert = {
      ...sharedPayload,
      sort_order: currentItemCount ?? 0,
      created_by: user.id,
    };

    const { data, error } = await database
      .from("budget_items")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to create budget item. ${error.message}`);
    }

    revalidatePath("/budget-tracker");

    return data;
  }
}

export async function deleteBudgetItemAction(itemId: string) {
  await requireRole([
    APP_ROLES.CEO,
    APP_ROLES.ENGINEER,
  ]);
  const database = createSupabaseAdminClient() as any;
  const normalizedId = normalizeText(itemId);

  if (!normalizedId) {
    throw new Error("Budget item is required.");
  }

  const { error } = await database
    .from("budget_items")
    .delete()
    .eq("id", normalizedId);

  if (error) {
    throw new Error(`Failed to delete budget item. ${error.message}`);
  }

  revalidatePath("/budget-tracker");
}

export async function deleteBudgetProjectAction(projectId: string) {
  await requireRole([
    APP_ROLES.CEO,
    APP_ROLES.ENGINEER,
  ]);
  const database = createSupabaseAdminClient() as any;
  const normalizedId = normalizeText(projectId);

  if (!normalizedId) {
    throw new Error("Budget project is required.");
  }

  const { error } = await database
    .from("budget_projects")
    .delete()
    .eq("id", normalizedId);

  if (error) {
    throw new Error(`Failed to delete budget project. ${error.message}`);
  }

  revalidatePath("/budget-tracker");
}

export async function reorderBudgetItemsAction(input: ReorderBudgetItemsInput) {
  const { user } = await requireRole([
    APP_ROLES.CEO,
    APP_ROLES.ENGINEER,
  ]);
  const database = createSupabaseAdminClient() as any;
  const projectId = normalizeText(input.projectId);

  if (!projectId) {
    throw new Error("Project is required.");
  }

  await assertBudgetProjectExists(projectId);

  const items = input.items
    .map((item) => ({
      id: normalizeText(item.id),
      status: item.status,
      sort_order: Math.max(0, Math.floor(Number(item.sortOrder ?? 0))),
    }))
    .filter((item) => item.id);

  if (items.length === 0) {
    return;
  }

  const updates = items.map((item) =>
    database
      .from("budget_items")
      .update({
        status: item.status,
        sort_order: item.sort_order,
        updated_by: user.id,
      })
      .eq("id", item.id)
      .eq("project_id", projectId),
  );

  const results = await Promise.all(updates);
  const failed = results.find(
    (result: { error?: { message?: string } }) => result.error,
  );

  if (failed?.error) {
    throw new Error(`Failed to reorder budget items. ${failed.error.message}`);
  }

  revalidatePath("/budget-tracker");
}

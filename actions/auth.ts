"use server";

import { redirect } from "next/navigation";
import type { Database } from "@/types/database";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { DEFAULT_AUTH_REDIRECT, APP_ROLES, getRoleHomePath } from "@/lib/auth";
import type { AppRole } from "@/types/database";

type ProfileLookupRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "username" | "email" | "is_active" | "role"
>;

export interface AuthActionState {
  error: string | null;
}

function isSafeInternalPath(pathname: string) {
  return pathname.startsWith("/") && !pathname.startsWith("//");
}

function hasAllowedPrefix(pathname: string, prefixes: readonly string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isRoleAllowedNextPath(role: AppRole, pathname: string) {
  if (!isSafeInternalPath(pathname)) return false;

  if (role === APP_ROLES.CEO) {
    return hasAllowedPrefix(pathname, [
      "/dashboard",
      "/budget-tracker",
      "/estimate-approvals",
      "/estimate-reviews",
      "/overtime-approvals",
      "/attendance-analytics",
      "/payroll-analytics",
      "/payroll-approvals",
      "/payroll-reports",
      "/projects",
      "/material-approvals",
      "/purchasing-approvals",
      "/settings",
    ]);
  }

  if (role === APP_ROLES.ADMIN) {
    return hasAllowedPrefix(pathname, [
      "/add-user",
      "/reset-data",
      "/settings",
      "/operations",
      "/material-approvals",
      "/purchasing",
    ]);
  }

  if (role === APP_ROLES.PAYROLL_MANAGER) {
    return hasAllowedPrefix(pathname, [
      "/payroll-dashboard",
      "/upload-attendance",
      "/review-attendance",
      "/generate-payroll",
      "/attendance-analytics",
      "/payroll-analytics",
      "/request-overtime",
      "/settings",
      "/operations",
    ]);
  }

  if (role === APP_ROLES.PURCHASER) {
    return hasAllowedPrefix(pathname, ["/home", "/purchasing", "/settings"]);
  }

  if (role === APP_ROLES.ENGINEER) {
    return hasAllowedPrefix(pathname, [
      "/projects",
      "/cost-estimator",
      "/request-overtime",
      "/settings",
    ]);
  }

  return hasAllowedPrefix(pathname, [
    "/home",
    "/request-overtime",
    "/settings",
  ]);
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "").trim();

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error: lookupError } = await admin
    .from("profiles")
    .select("id, username, email, is_active, role")
    .eq("username", username)
    .returns<ProfileLookupRow[]>()
    .maybeSingle();

  if (lookupError) {
    return { error: "Unable to verify username right now." };
  }

  if (!profile || !profile.is_active) {
    return { error: "Invalid username or password." };
  }

  const { data: authUserResult, error: authUserLookupError } =
    await admin.auth.admin.getUserById(profile.id);

  if (authUserLookupError) {
    return { error: "Unable to verify account access right now." };
  }

  const authEmail = authUserResult.user?.email?.trim().toLowerCase();

  if (!authEmail) {
    return { error: "This account is missing a sign-in email." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password,
  });

  if (error) {
    return { error: "Invalid username or password." };
  }

  const roleHomePath = getRoleHomePath(profile.role);
  const nonCeoRequestedDashboard =
    profile.role !== APP_ROLES.CEO &&
    (nextPath === "/dashboard" || nextPath.startsWith("/dashboard/"));

  const redirectPath =
    nonCeoRequestedDashboard || !isRoleAllowedNextPath(profile.role, nextPath)
      ? roleHomePath
      : nextPath;

  redirect(redirectPath || DEFAULT_AUTH_REDIRECT);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  await new Promise((resolve) => setTimeout(resolve, 350));
  redirect("/auth/login");
}

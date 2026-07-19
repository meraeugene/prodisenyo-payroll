"use server";

import { revalidatePath } from "next/cache";
import type { AppRole, Database } from "@/types/database";
import { APP_ROLES, requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

interface CreateAppUserInput {
  fullName: string;
  username: string;
  email: string;
  password: string;
  role: AppRole;
}

interface UpdateAppUserInput {
  userId: string;
  fullName: string;
  username: string;
  email: string;
  role: AppRole;
  isActive: boolean;
}

function normalizeText(value: string | undefined) {
  return (value ?? "").trim();
}

function normalizeEmail(value: string | undefined) {
  return normalizeText(value).toLowerCase();
}

function validateRole(role: AppRole) {
  if (
    ![
      APP_ROLES.CEO,
      APP_ROLES.ADMIN,
      APP_ROLES.PAYROLL_MANAGER,
      APP_ROLES.ENGINEER,
      APP_ROLES.EMPLOYEE,
    ].includes(role)
  ) {
    throw new Error("Role is required.");
  }
}

function validateUserFields(input: {
  fullName: string;
  username: string;
  email: string;
  role: AppRole;
}) {
  const fullName = normalizeText(input.fullName);
  const username = normalizeText(input.username).toLowerCase();
  const email = normalizeEmail(input.email);
  const role = input.role;

  if (!fullName) {
    throw new Error("Full name is required.");
  }

  if (!username) {
    throw new Error("Username is required.");
  }

  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    throw new Error(
      "Username must be 3-30 characters and use only letters, numbers, dot, dash, or underscore.",
    );
  }

  if (!email) {
    throw new Error("Email is required.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }

  validateRole(role);

  return {
    fullName,
    username,
    email,
    role,
  };
}

export async function createAppUserAction(input: CreateAppUserInput) {
  await requireRole(APP_ROLES.ADMIN);
  const admin = createSupabaseAdminClient();

  const { fullName, username, email, role } = validateUserFields(input);
  const password = String(input.password ?? "");

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const [{ data: usernameMatch }, { data: emailMatch }] = await Promise.all([
    admin.from("profiles").select("id").eq("username", username).maybeSingle(),
    admin.from("profiles").select("id").eq("email", email).maybeSingle(),
  ]);

  if (usernameMatch) {
    throw new Error("Username is already in use.");
  }

  if (emailMatch) {
    throw new Error("Email is already in use.");
  }

  const { data: createdAuthUser, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        username,
        role,
      },
    });

  if (authError || !createdAuthUser.user) {
    throw new Error(authError?.message || "Failed to create user account.");
  }

  const profilePayload: ProfileInsert = {
    id: createdAuthUser.user.id,
    full_name: fullName,
    username,
    email,
    role,
    is_active: true,
  };

  const { error: profileError } = await (
    admin.from("profiles") as unknown as {
      insert: (
        values: ProfileInsert,
      ) => Promise<{ error: { message: string } | null }>;
    }
  ).insert(profilePayload);

  if (profileError) {
    await admin.auth.admin.deleteUser(createdAuthUser.user.id);
    throw new Error(`Failed to save user profile. ${profileError.message}`);
  }

  const { data: createdProfile, error: profileFetchError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", createdAuthUser.user.id)
    .single();

  if (profileFetchError || !createdProfile) {
    await admin.auth.admin.deleteUser(createdAuthUser.user.id);
    throw new Error(
      `Failed to load created user profile. ${profileFetchError?.message ?? "Unknown error."}`,
    );
  }

  revalidatePath("/add-user");
  revalidatePath("/settings");

  return {
    user: createdProfile as ProfileRow,
  };
}

export async function updateAppUserAction(input: UpdateAppUserInput) {
  const { user } = await requireRole(APP_ROLES.ADMIN);
  const admin = createSupabaseAdminClient();
  const userId = normalizeText(input.userId);
  const { fullName, username, email, role } = validateUserFields(input);
  const isActive = Boolean(input.isActive);

  if (!userId) {
    throw new Error("User is required.");
  }

  const [{ data: usernameMatch }, { data: emailMatch }] = await Promise.all([
    admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", userId)
      .maybeSingle(),
    admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .neq("id", userId)
      .maybeSingle(),
  ]);

  if (usernameMatch) {
    throw new Error("Username is already in use.");
  }

  if (emailMatch) {
    throw new Error("Email is already in use.");
  }

  if (userId === user.id && !isActive) {
    throw new Error("You cannot deactivate your own account.");
  }

  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    email,
    user_metadata: {
      full_name: fullName,
      username,
      role,
    },
    app_metadata: {
      role,
    },
    ban_duration: isActive ? "none" : "876000h",
  });

  if (authError) {
    throw new Error(authError.message || "Failed to update user account.");
  }

  const profilePayload: ProfileUpdate = {
    full_name: fullName,
    username,
    email,
    role,
    is_active: isActive,
  };

  const { data, error } = await (
    admin.from("profiles") as unknown as {
      update: (values: ProfileUpdate) => {
        eq: (
          column: string,
          value: string,
        ) => {
          select: (columns: string) => {
            single: () => Promise<{
              data: ProfileRow | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    }
  )
    .update(profilePayload)
    .eq("id", userId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to update user profile. ${error?.message ?? "Unknown error."}`,
    );
  }

  revalidatePath("/add-user");
  revalidatePath("/settings");

  return {
    user: data as ProfileRow,
  };
}

export async function deleteAppUserAction(targetUserId: string) {
  const { user } = await requireRole(APP_ROLES.ADMIN);
  const admin = createSupabaseAdminClient();
  const normalizedUserId = normalizeText(targetUserId);

  if (!normalizedUserId) {
    throw new Error("User is required.");
  }

  if (normalizedUserId === user.id) {
    throw new Error("You cannot delete your own account.");
  }

  const { error: authError } =
    await admin.auth.admin.deleteUser(normalizedUserId);

  if (authError) {
    throw new Error(authError.message || "Failed to delete user account.");
  }

  const { error: profileError } = await admin
    .from("profiles")
    .delete()
    .eq("id", normalizedUserId);

  if (profileError) {
    throw new Error(`Failed to delete user profile. ${profileError.message}`);
  }

  revalidatePath("/add-user");
  revalidatePath("/settings");

  return {
    userId: normalizedUserId,
  };
}

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const projectRoot = process.cwd();
const seedFilePath = path.join(projectRoot, "supabase", "seed-users.json");
const envFileCandidates = [".env.local", ".env"];

function parseEnvLines(content) {
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

async function loadEnvFiles() {
  for (const fileName of envFileCandidates) {
    const filePath = path.join(projectRoot, fileName);

    try {
      const content = await fs.readFile(filePath, "utf8");
      parseEnvLines(content);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        continue;
      }
      throw error;
    }
  }
}

function getEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function normalizeInternalEmail(username) {
  return `${username.toLowerCase()}@prodisenyo.local`;
}

async function readSeedUsers() {
  const raw = await fs.readFile(seedFilePath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("supabase/seed-users.json must contain an array.");
  }

  return parsed.map((entry, index) => {
    const username = String(entry.username ?? "")
      .trim()
      .toLowerCase();
    const password = String(entry.password ?? "");
    const fullName = String(entry.full_name ?? "").trim() || null;
    const role = String(entry.role ?? "").trim();

    if (!username) {
      throw new Error(`User at index ${index} is missing username.`);
    }
    if (!password) {
      throw new Error(`User ${username} is missing password.`);
    }
    if (
      role !== "admin" &&
      role !== "ceo" &&
      role !== "payroll_manager" &&
      role !== "engineer" &&
      role !== "employee"
    ) {
      throw new Error(
        `User ${username} has invalid role "${role}". Expected "admin", "ceo", "payroll_manager", "engineer", or "employee".`,
      );
    }

    return {
      username,
      password,
      fullName,
      role,
      email: normalizeInternalEmail(username),
    };
  });
}

async function findUserByEmail(admin, email) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data?.users ?? [];
    const match = users.find((user) => user.email?.toLowerCase() === email);
    if (match) {
      return match;
    }

    if (users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function upsertUser(admin, userSeed) {
  const existing = await findUserByEmail(admin, userSeed.email);

  if (!existing) {
    const { data, error } = await admin.auth.admin.createUser({
      email: userSeed.email,
      password: userSeed.password,
      email_confirm: true,
      user_metadata: {
        username: userSeed.username,
        full_name: userSeed.fullName,
        role: userSeed.role,
      },
    });

    if (error) {
      throw error;
    }

    return data.user;
  }

  const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
    password: userSeed.password,
    email_confirm: true,
    user_metadata: {
      username: userSeed.username,
      full_name: userSeed.fullName,
      role: userSeed.role,
    },
  });

  if (error) {
    throw error;
  }

  return data.user;
}

async function upsertProfile(admin, authUser, userSeed) {
  const { error } = await admin.from("profiles").upsert(
    {
      id: authUser.id,
      username: userSeed.username,
      email: userSeed.email,
      full_name: userSeed.fullName,
      avatar_path: null,
      role: userSeed.role,
      is_active: true,
    },
    {
      onConflict: "id",
    },
  );

  if (error) {
    throw error;
  }
}

async function main() {
  await loadEnvFiles();

  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const users = await readSeedUsers();

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  for (const userSeed of users) {
    const authUser = await upsertUser(admin, userSeed);
    await upsertProfile(admin, authUser, userSeed);
    console.log(`Seeded ${userSeed.username} (${userSeed.role})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabaseBrowserEnv, getSupabaseServerEnv } from "@/lib/env";

const SUPABASE_AUTH_COOKIE_LIFETIME_SECONDS = 60 * 60 * 24 * 365;

type CookieMutation = {
  name: string;
  value: string;
  options?: Parameters<
    (typeof cookies extends (...args: never[]) => Promise<infer T>
      ? T
      : never)["set"]
  >[2];
};

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseBrowserEnv();

  return createServerClient<Database>(url, anonKey, {
    cookieOptions: {
      lifetime: SUPABASE_AUTH_COOKIE_LIFETIME_SECONDS,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieMutation[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);

            if (!message.includes("Cookies can only be modified")) {
              throw error;
            }
          }
        });
      },
    },
  });
}

export function createSupabaseAdminClient() {
  const { url, serviceRoleKey } = getSupabaseServerEnv();

  return createServerClient<Database>(url, serviceRoleKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll(_cookiesToSet: CookieMutation[]) {
        return;
      },
    },
  });
}

import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const INTERNAL_USER_HEADER = "x-prodisenyo-auth-user";
export const INTERNAL_PROFILE_HEADER = "x-prodisenyo-auth-profile";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

function encodeHeaderValue(value: unknown) {
  return encodeURIComponent(JSON.stringify(value));
}

function decodeHeaderValue<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(decodeURIComponent(value)) as T;
  } catch {
    return null;
  }
}

export function writeRequestAuthContext(
  headers: Headers,
  user: User | null,
  profile: ProfileRow | null,
) {
  headers.delete(INTERNAL_USER_HEADER);
  headers.delete(INTERNAL_PROFILE_HEADER);

  if (user) headers.set(INTERNAL_USER_HEADER, encodeHeaderValue(user));
  if (profile) headers.set(INTERNAL_PROFILE_HEADER, encodeHeaderValue(profile));
}

export function readRequestUser(headers: Headers) {
  return decodeHeaderValue<User>(headers.get(INTERNAL_USER_HEADER));
}

export function readRequestProfile(headers: Headers) {
  return decodeHeaderValue<ProfileRow>(headers.get(INTERNAL_PROFILE_HEADER));
}

import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export const MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024;

export function roleLabel(role: ProfileRow["role"] | null) {
  if (role === "admin") return "Administrator";
  if (role === "ceo") return "Chief Executive Officer";
  if (role === "payroll_manager") return "Payroll Manager";
  if (role === "engineer") return "Engineer";
  return "Signed-in user";
}

export function trimOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function getFileExtension(file: File) {
  const extension = file.name.split(".").pop()?.trim().toLowerCase();
  if (extension) return extension;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

export function getReadableProfileError(error: unknown) {
  if (!(error instanceof Error)) return "Please try again in a moment.";
  if (/bucket not found/i.test(error.message)) {
    return "Profile image storage is not configured yet. Please create the profile avatar bucket first, then try again.";
  }
  return error.message;
}

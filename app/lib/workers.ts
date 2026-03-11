import type { WorkerRole } from "@/types";

export const ROLE_LABELS: Record<WorkerRole, string> = {
  D: "Driver",
  L: "Labor",
  E: "Electrician",
  PL: "Plumber",
  PA: "Painter",
  FORE: "Foreman",
  S: "Skilled",
  UNK: "Unknown",
};

const KNOWN_ROLES: WorkerRole[] = ["FORE", "PL", "PA", "D", "L", "E", "S"];

export interface ParsedWorker {
  role: WorkerRole;
  roleLabel: string;
  name: string;
  label: string;
  mergeKey: string;
  isShortName: boolean;
}

export function parseWorkerLabel(raw: string, site: string): ParsedWorker {
  const cleaned = normalizeWhitespace(raw);
  const matched = cleaned.match(/^([A-Za-z]+)\s+(.+)$/);
  const roleToken = (matched?.[1] ?? "").toUpperCase();
  const maybeRole = KNOWN_ROLES.includes(roleToken as WorkerRole)
    ? (roleToken as WorkerRole)
    : "UNK";
  const name = normalizeName(matched?.[2] ?? cleaned);
  const label =
    maybeRole === "UNK" ? name : `${maybeRole} ${name}`.trim().toUpperCase();
  const isShortName = isVeryShortName(name);
  const mergeKey = buildWorkerMergeKey(maybeRole, name, site, isShortName);

  return {
    role: maybeRole,
    roleLabel: ROLE_LABELS[maybeRole],
    name,
    label,
    mergeKey,
    isShortName,
  };
}

export function buildWorkerMergeKey(
  role: WorkerRole,
  name: string,
  site: string,
  isShortName = isVeryShortName(name),
): string {
  const base = `${role}|||${normalizeName(name).toLowerCase()}`;
  if (isShortName) {
    return `${base}|||${site.trim().toLowerCase()}`;
  }
  return base;
}

export function isVeryShortName(name: string): boolean {
  const normalized = normalizeName(name);
  if (!normalized) return true;
  const letters = normalized.replace(/[^a-z]/gi, "");
  if (letters.length <= 2) return true;

  const tokens = normalized.split(" ").filter(Boolean);
  return tokens.length === 1 && tokens[0].length <= 2;
}

export function extractSiteFromFilename(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;

  const normalized = normalizeWhitespace(
    base
      .replace(/[_-]+/g, " ")
      .replace(/\btemplate\s*\d*\b/gi, "")
      .trim(),
  );

  const byNumericSuffix = normalized.replace(
    /\s+\d{2,}(?:\s*to\s*\d{2,})?$/i,
    "",
  );
  const cleaned = normalizeWhitespace(byNumericSuffix);
  if (!cleaned) return "Unknown Site";

  const firstToken = cleaned.split(" ")[0];
  return firstToken.toUpperCase();
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeName(value: string): string {
  return normalizeWhitespace(value);
}

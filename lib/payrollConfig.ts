export const HOURS_PER_DAY = 8;
export const DEFAULT_OVERTIME_MULTIPLIER = 1.25;

export const ROLE_CODE_TO_NAME = {
  D: "Driver",
  L: "Labor",
  E: "Electrician",
  PL: "Plumber",
  PA: "Painter",
  FORE: "Foreman",
  S: "Skilled",
  UNKNOWN: "Unknown",
} as const;

export type RoleCode = keyof typeof ROLE_CODE_TO_NAME;
export const ROLE_CODES = Object.keys(ROLE_CODE_TO_NAME) as RoleCode[];

export const DEFAULT_DAILY_RATE_BY_ROLE: Record<RoleCode, number> = {
  D: 500,
  L: 450,
  E: 500,
  PL: 450,
  PA: 430,
  FORE: 625,
  S: 650,
  UNKNOWN: 500,
};

const ROLE_ALIAS_TO_CODE: Record<string, RoleCode> = {
  d: "D",
  driver: "D",
  l: "L",
  labor: "L",
  e: "E",
  electrician: "E",
  pl: "PL",
  plumber: "PL",
  pa: "PA",
  painter: "PA",
  fore: "FORE",
  foreman: "FORE",
  s: "S",
  skilled: "S",
  unknown: "UNKNOWN",
};

export function normalizeRoleCode(value: string | null | undefined): RoleCode | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  return ROLE_ALIAS_TO_CODE[normalized] ?? null;
}

export function getDailyRateForRole(
  role: string,
  roleRates: Partial<Record<RoleCode, number>> = {},
): number {
  const roleCode = normalizeRoleCode(role);
  if (!roleCode) return 0;
  return roleRates[roleCode] ?? DEFAULT_DAILY_RATE_BY_ROLE[roleCode];
}

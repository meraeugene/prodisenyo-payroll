"use server";

import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  normalizeEmployeeNameKey,
  normalizeSiteKey,
} from "@/features/payroll/utils/payrollMappers";

interface SaveEmployeeBranchRateInput {
  employeeName: string;
  roleCode: string;
  siteName: string;
  dailyRate: number;
  regularPaidHours: number;
}

export async function saveEmployeeBranchRatesAction(
  entries: SaveEmployeeBranchRateInput[],
) {
  const { user } = await requireRole(["ceo", "payroll_manager"]);
  const database = createSupabaseAdminClient() as any;

  const normalizedEntries = entries
    .map((entry) => {
      const employeeName = entry.employeeName.trim();
      const roleCode = entry.roleCode.trim().toUpperCase();
      const siteName = entry.siteName.trim();
      const dailyRate = Number(entry.dailyRate);
      const regularPaidHours = Number(entry.regularPaidHours);

      if (
        !employeeName ||
        !roleCode ||
        !siteName ||
        !Number.isFinite(dailyRate) ||
        dailyRate < 0 ||
        !Number.isFinite(regularPaidHours) ||
        regularPaidHours <= 0
      ) {
        return null;
      }

      return {
        employee_name: employeeName,
        employee_name_key: normalizeEmployeeNameKey(employeeName),
        role_code: roleCode,
        site_name: siteName,
        site_name_key: normalizeSiteKey(siteName),
        daily_rate: Math.round(dailyRate * 100) / 100,
        regular_paid_hours: Math.round(regularPaidHours * 100) / 100,
        updated_by: user.id,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  if (normalizedEntries.length === 0) {
    return { saved: 0 };
  }

  const { error } = await database
    .from("employee_branch_rates")
    .upsert(normalizedEntries, {
      onConflict: "employee_name_key,role_code,site_name_key",
    });

  if (error) {
    throw new Error(`[BRANCH_RATE_SAVE_FAILED] ${error.message}`);
  }

  return { saved: normalizedEntries.length };
}

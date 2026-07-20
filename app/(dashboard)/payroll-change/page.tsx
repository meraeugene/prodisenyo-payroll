import { redirect } from "next/navigation";

export default async function PayrollChangePage() {
  redirect("/payroll-approvals");
}

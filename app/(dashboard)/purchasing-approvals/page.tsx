import { redirect } from "next/navigation";

export default async function Page() {
  redirect("/projects?section=purchasing-approvals");
}

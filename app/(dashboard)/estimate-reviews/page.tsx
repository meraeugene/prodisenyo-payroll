import { redirect } from "next/navigation";

export default function Page() {
  redirect("/projects?section=estimate-approvals");
}

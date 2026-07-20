import { redirect } from "next/navigation";

export default function BudgetTrackerRoutePage() {
  redirect("/projects?section=budget-tracker");
}

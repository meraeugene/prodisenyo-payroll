import { Calculator, FolderKanban, PackageCheck } from "lucide-react";

const ITEMS = [
  { key: "projects", label: "Assigned Projects", icon: FolderKanban, tone: "emerald" },
  { key: "requests", label: "Awaiting Approval", icon: PackageCheck, tone: "sky" },
  { key: "estimates", label: "Estimates to Action", icon: Calculator, tone: "amber" },
] as const;

export default function EngineerDashboardSummary({
  values,
}: {
  values: Record<(typeof ITEMS)[number]["key"], number>;
}) {
  return (
    <section aria-label="Engineer workflow summary" className="grid gap-4 md:grid-cols-3">
      {ITEMS.map(({ key, label, icon: Icon, tone }) => (
        <article
          key={key}
          className="flex min-h-28 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_22px_rgba(15,23,42,0.04)]"
        >
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
              tone === "emerald"
                ? "bg-emerald-50 text-emerald-700"
                : tone === "sky"
                  ? "bg-sky-50 text-sky-700"
                  : "bg-amber-50 text-amber-600"
            }`}
          >
            <Icon size={25} strokeWidth={1.8} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-0.5 text-3xl font-semibold tracking-tight text-slate-950">
              {values[key]}
            </p>
          </div>
        </article>
      ))}
    </section>
  );
}

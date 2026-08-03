type WorkspaceTab =
  | "overview"
  | "estimates"
  | "materials"
  | "purchasing"
  | "budget";

export default function ProjectWorkspaceTabSkeleton({
  tab,
}: {
  tab: WorkspaceTab;
}) {
  if (tab === "estimates") {
    return (
      <div
        aria-label="Loading estimates"
        aria-live="polite"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
      >
        <div className="grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center lg:gap-10">
          <div>
            <Skeleton className="h-3 w-28" />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Skeleton className="h-8 w-56" strong />
              <Skeleton className="h-8 w-40 rounded-xl bg-emerald-100" />
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3 sm:gap-6">
              {[0, 1, 2].map((item) => (
                <div key={item}>
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-2 h-5 w-32" strong />
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-200 pt-5 lg:border-l lg:border-t-0 lg:py-3 lg:pl-10">
            <Skeleton className="h-3 w-36 lg:ml-auto" />
            <Skeleton className="mt-3 h-9 w-48 lg:ml-auto" strong />
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:px-6 lg:flex-row lg:justify-between">
          <Skeleton className="h-10 w-full rounded-xl sm:w-36" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Skeleton className="h-10 w-full rounded-xl sm:w-28 bg-emerald-100" />
            <Skeleton className="h-10 w-full rounded-xl sm:w-28 bg-emerald-200" />
          </div>
        </div>
      </div>
    );
  }

  if (tab === "overview" || tab === "budget") {
    return (
      <div aria-label={`Loading ${tab}`} aria-live="polite" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <Skeleton className="h-3 w-28" />
              <Skeleton className="mt-3 h-7 w-24" strong />
            </div>
          ))}
        </div>
        <ListSkeleton rows={tab === "overview" ? 5 : 4} />
      </div>
    );
  }

  return (
    <div aria-label={`Loading ${tab}`} aria-live="polite" className="space-y-4">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
        <Skeleton className="h-4 w-72 bg-emerald-100" />
      </div>
      <ListSkeleton rows={4} />
    </div>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-6 w-44" strong />
        <Skeleton className="h-9 w-28 rounded-xl bg-emerald-100" />
      </div>
      <div className="mt-5 divide-y divide-slate-100">
        {Array.from({ length: rows }, (_, item) => (
          <div
            key={item}
            className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_9rem_7rem]"
          >
            <div>
              <Skeleton className="h-4 w-2/3" strong />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </section>
  );
}

function Skeleton({
  className,
  strong = false,
}: {
  className: string;
  strong?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded ${
        strong ? "bg-slate-200" : "bg-slate-100"
      } ${className}`}
    />
  );
}

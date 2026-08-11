function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />;
}

export default function CostEstimatorProjectsOverviewSkeleton() {
  return (
    <div className="space-y-5 overflow-x-hidden p-0 sm:p-6">
      <section className="rounded-none bg-emerald-900 px-6 py-9 sm:rounded-[14px] sm:px-10 sm:py-10">
        <SkeletonBlock className="h-12 w-72 max-w-full bg-white/20" />
        <SkeletonBlock className="mt-3 h-5 w-[34rem] max-w-full bg-white/15" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <article key={`metric-skeleton-${index}`} className="flex min-h-[126px] items-center gap-5 rounded-[14px] border border-slate-200 bg-white px-7 py-6">
            <SkeletonBlock className="size-14 shrink-0" />
            <div className="space-y-2">
              <SkeletonBlock className="h-8 w-12" />
              <SkeletonBlock className="h-4 w-20" />
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-4 px-3 sm:px-2">
        <SkeletonBlock className="h-8 w-48" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <article key={`project-skeleton-${index}`} className="flex min-h-[474px] flex-col rounded-[14px] border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <SkeletonBlock className="h-7 w-24 rounded-full" />
                <SkeletonBlock className="h-7 w-20" />
              </div>
              <SkeletonBlock className="mt-5 h-8 w-40" />
              <div className="mt-7 space-y-4">
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-5/6" />
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-4/5" />
              </div>
              <SkeletonBlock className="mt-8 h-3 w-full rounded-full" />
              <div className="mt-auto pt-7">
                <SkeletonBlock className="h-12 w-full" />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

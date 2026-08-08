function SkeletonBlock({ className }: { className: string }) {
  return <div className={"animate-pulse rounded-xl bg-slate-200/70 " + className} />;
}

export default function PayrollDashboardSkeleton() {
  return (
    <main className="min-h-full bg-slate-50/40 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-72" />
          <SkeletonBlock className="h-4 w-96 max-w-full" />
        </div>
        <SkeletonBlock className="hidden h-10 w-40 sm:block" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <SkeletonBlock key={index} className="h-32" />
        ))}
      </div>
      <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1.55fr)_minmax(370px,.75fr)]">
        <SkeletonBlock className="h-[430px]" />
        <SkeletonBlock className="h-[430px]" />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <SkeletonBlock className="h-80" />
        <SkeletonBlock className="h-80" />
        <SkeletonBlock className="h-80" />
      </div>
    </main>
  );
}

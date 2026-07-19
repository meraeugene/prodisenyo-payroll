import EstimateReviewsSectionSkeleton from "@/features/cost-estimator/components/EstimateReviewsSectionSkeleton";

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-[linear-gradient(90deg,rgba(232,242,236,0.95),rgba(244,249,246,1),rgba(232,242,236,0.95))] bg-[length:200%_100%] ${className}`}
    />
  );
}

export default function Loading() {
  return (
    <div className="space-y-4 overflow-x-hidden p-0 sm:p-6">
      <section className="rounded-none bg-[linear-gradient(135deg,#112e1a,#1f4f2c,#245f34)] p-5 shadow-[0_18px_36px_rgba(22,101,52,0.18)] sm:rounded-[14px] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <SkeletonBlock className="h-3 w-24 bg-white/20" />
            <SkeletonBlock className="h-10 w-72 max-w-full bg-white/20" />
            <SkeletonBlock className="h-4 w-full max-w-[34rem] bg-white/15" />
          </div>
        </div>
      </section>

      <EstimateReviewsSectionSkeleton />
    </div>
  );
}

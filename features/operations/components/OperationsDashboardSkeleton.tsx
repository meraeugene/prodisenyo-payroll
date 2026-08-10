export default function OperationsDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-white px-4 py-5 sm:px-6 sm:py-7 min-[1400px]:px-[26px] min-[1400px]:py-9" aria-busy="true" aria-label="Loading operations dashboard">
      <div className="flex items-start justify-between"><div><div className="h-9 w-72 animate-pulse rounded bg-[#edf2ee]" /><div className="mt-3 h-3 w-96 max-w-full animate-pulse rounded bg-[#f0f3f1]" /></div><div className="hidden h-11 w-36 animate-pulse rounded bg-[#e4efe7] sm:block" /></div>
      <div className="mt-8 grid overflow-hidden rounded-[8px] border border-[#e0e6e2] sm:grid-cols-2 min-[1180px]:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="flex h-[111px] items-center gap-4 border-[#e0e6e2] px-5"><div className="h-[50px] w-[50px] animate-pulse rounded-full bg-[#edf3ef]" /><div className="flex-1"><div className="h-3 w-24 animate-pulse rounded bg-[#edf1ee]" /><div className="mt-3 h-6 w-14 animate-pulse rounded bg-[#e3ece6]" /><div className="mt-2 h-2 w-28 animate-pulse rounded bg-[#f0f3f1]" /></div></div>)}</div>
      <div className="mt-7 grid gap-6 min-[1400px]:grid-cols-[minmax(0,1fr)_316px]"><div><div className="h-9 w-full animate-pulse rounded bg-[#f0f3f1]" /><div className="mt-3 h-[580px] animate-pulse rounded bg-[#f6f8f7]" /></div><div className="space-y-4"><div className="h-[360px] animate-pulse rounded-[8px] bg-[#f4f7f5]" /><div className="h-[300px] animate-pulse rounded-[8px] bg-[#f4f7f5]" /></div></div>
    </div>
  );
}

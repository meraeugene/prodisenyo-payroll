export default function ProjectWorkspaceLoading() {
  return (
    <div className="space-y-5 px-4 py-4 sm:px-6">
      <header>
        <div className="h-10 w-11 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-4 w-52 animate-pulse rounded bg-slate-100" />
            <div className="mt-3 flex flex-wrap gap-2">
              <div className="h-7 w-44 animate-pulse rounded-full bg-slate-100" />
              <div className="h-7 w-48 animate-pulse rounded-full bg-slate-100" />
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-7 w-32 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </header>

      <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-3">
        {["Progress", "Estimates", "Materials", "Purchasing", "Budget"].map((item, index) => (
          <div
            key={item}
            className={`h-10 animate-pulse rounded-lg ${
              index === 0 ? "w-24 bg-emerald-100" : "w-28 border border-slate-200 bg-slate-100"
            }`}
          />
        ))}
      </nav>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
              <div className="mt-3 h-7 w-24 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>

        <section className="grid gap-4 text-sm xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="hidden p-4 md:block">
              <div className="grid grid-cols-[48px_1fr_96px_128px_72px] gap-3 border-b border-slate-100 pb-3">
                <div className="h-8 animate-pulse rounded bg-slate-100" />
                <div className="h-8 animate-pulse rounded bg-slate-100" />
                <div className="h-8 animate-pulse rounded bg-slate-100" />
                <div className="h-8 animate-pulse rounded bg-slate-100" />
                <div className="h-8 animate-pulse rounded bg-slate-100" />
              </div>
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="grid grid-cols-[48px_1fr_96px_128px_72px] gap-3 py-3">
                  <div className="h-9 animate-pulse rounded bg-slate-100" />
                  <div className="h-9 animate-pulse rounded bg-slate-100" />
                  <div className="h-9 animate-pulse rounded bg-slate-100" />
                  <div className="h-9 animate-pulse rounded bg-slate-100" />
                  <div className="h-9 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
            <div className="space-y-3 p-4 md:hidden">
              {[0, 1, 2].map((item) => (
                <div key={item} className="rounded-lg border border-slate-100 p-4">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                  <div className="mt-2 h-5 w-40 animate-pulse rounded bg-slate-200" />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="h-14 animate-pulse rounded bg-slate-100" />
                    <div className="h-14 animate-pulse rounded bg-emerald-50" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="h-5 w-28 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-100" />
            <div className="mt-4 space-y-3">
              <div className="h-10 animate-pulse rounded bg-slate-100" />
              <div className="h-10 animate-pulse rounded bg-slate-100" />
              <div className="h-10 animate-pulse rounded bg-emerald-100" />
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}

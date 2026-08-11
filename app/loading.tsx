import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-6">
      <div className="relative flex flex-col items-center">
        {/* Icon Section with Pulsing Aura */}
        <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
          {/* Animated Background Rings */}
          <div className="absolute inset-0 animate-ping rounded-3xl bg-emerald-100/50 duration-[2000ms]" />
          <div className="absolute inset-2 animate-pulse rounded-2xl bg-emerald-50/80" />

          {/* Main Icon Card */}
          <div className="z-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] transition-transform duration-700">
            <Image
              src="/prodisenyo-building-mark.png"
              alt="Prodisenyo building mark"
              width={64}
              height={64}
              className="h-16 w-16 object-contain animate-in fade-in zoom-in duration-700"
              priority
            />
          </div>
        </div>

        {/* Typography Section */}
        <div className="flex flex-col items-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-1000">
          <span className="text-[11px] font-black uppercase tracking-[0.6em] text-slate-400/80">
            Prodisenyo
          </span>
          <div className="flex items-baseline text-4xl font-bold tracking-tighter text-slate-900">
            <span className="bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Pro
            </span>
            <span className="text-emerald-600">Build</span>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <div className="h-[3px] w-40 overflow-hidden rounded-full bg-slate-200/60">
            <div className="h-full bg-emerald-600 animate-[loading_1.5s_ease-in-out_infinite]" />
          </div>
          <p className="text-[13px] font-medium text-slate-400 animate-pulse">
            Initializing workspace...
          </p>
        </div>
      </div>
    </div>
  );
}

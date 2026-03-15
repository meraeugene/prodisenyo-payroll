export default function loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-apple-snow">
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-1 leading-none animate-pulse">
          <span className="text-2xl font-black tracking-wide text-apple-charcoal">
            PRODISENYO
          </span>

          <div className="flex items-center gap-2 -mt-1">
            <div className="h-[1px] w-10 bg-gradient-to-r from-transparent via-apple-steel to-apple-steel"></div>

            <span className="text-[10px] tracking-[0.20em] text-apple-smoke whitespace-nowrap">
              PAYROLL SYSTEM
            </span>

            <div className="h-[1px] w-10 bg-gradient-to-l from-transparent via-apple-steel to-apple-steel"></div>
          </div>
        </div>

        {/* Spinner */}
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-apple-silver border-t-apple-charcoal"></div>
      </div>
    </div>
  );
}

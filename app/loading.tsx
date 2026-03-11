export default function loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-1 leading-none animate-pulse">
          <span className="text-2xl font-black tracking-wide text-gray-900">
            PRODISENYO
          </span>

          <div className="flex items-center gap-2 -mt-1">
            <div className="h-[1px] w-10 bg-gradient-to-r from-transparent via-gray-400 to-gray-400"></div>

            <span className="text-[10px] tracking-[0.20em] text-gray-500 whitespace-nowrap">
              PAYROLL SYSTEM
            </span>

            <div className="h-[1px] w-10 bg-gradient-to-l from-transparent via-gray-400 to-gray-400"></div>
          </div>
        </div>

        {/* Spinner */}
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"></div>
      </div>
    </div>
  );
}

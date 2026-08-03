interface AttendanceUploadProgressProps {
  progress: number;
  phase: "processing" | "saving" | "complete";
}

const PHASE_LABELS: Record<
  AttendanceUploadProgressProps["phase"],
  string
> = {
  processing: "Processing attendance reports",
  saving: "Saving attendance records",
  complete: "Attendance reports ready",
};

export default function AttendanceUploadProgress({
  progress,
  phase,
}: AttendanceUploadProgressProps) {
  const roundedProgress = Math.round(progress);

  return (
    <div
      className="w-full rounded-[12px] border border-emerald-100 bg-emerald-50/60 p-3 sm:max-w-md"
      role="progressbar"
      aria-label={PHASE_LABELS[phase]}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={roundedProgress}
      aria-valuetext={`${roundedProgress}% — ${PHASE_LABELS[phase]}`}
    >
      <div className="mb-2 flex items-center justify-between gap-4 text-xs">
        <span className="font-semibold text-emerald-900">
          {PHASE_LABELS[phase]}
        </span>
        <span className="font-mono font-bold tabular-nums text-emerald-700">
          {roundedProgress}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#15803d,#34d399)] transition-[width] duration-300 ease-out"
          style={{ width: `${roundedProgress}%` }}
        />
      </div>
    </div>
  );
}

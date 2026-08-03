"use client";

import { useEffect, useRef, useState, DragEvent, ChangeEvent } from "react";
import { Upload, FileSpreadsheet, X, AlertCircle, Loader2 } from "lucide-react";
import { parseAttendanceFiles, type ParseResult } from "@/lib/parser";
import AttendanceUploadProgress from "@/features/attendance/components/AttendanceUploadProgress";
import type { UploadedFileItem } from "@/types";

interface UploadZoneProps {
  files: UploadedFileItem[];
  onFilesChange: (
    value:
      | UploadedFileItem[]
      | ((prev: UploadedFileItem[]) => UploadedFileItem[]),
  ) => void;
  onParsed: (result: ParseResult) => void | Promise<void>;
  onClearWorkspace?: () => void;
  resetSignal?: number;
}

function getFileKey(
  file: Pick<UploadedFileItem, "name" | "size" | "lastModified">,
): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function mergeFiles(
  existing: UploadedFileItem[],
  incoming: File[],
): UploadedFileItem[] {
  const map = new Map<string, UploadedFileItem>();
  [...existing, ...incoming].forEach((file) => {
    if (file instanceof File) {
      map.set(getFileKey(file), {
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        file,
        persisted: false,
      });
      return;
    }

    map.set(getFileKey(file), file);
  });
  return Array.from(map.values());
}

export default function UploadZone({
  files,
  onFilesChange,
  onParsed,
  onClearWorkspace,
  resetSignal,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressPhase, setProgressPhase] = useState<
    "processing" | "saving" | "complete"
  >("processing");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDragging(false);
    setLoading(false);
    setProgress(0);
    setProgressPhase("processing");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [resetSignal]);

  useEffect(() => {
    if (!loading) return;

    const interval = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 90) return current;
        if (current < 40) return Math.min(current + 3, 90);
        if (current < 70) return Math.min(current + 2, 90);
        return Math.min(current + 1, 90);
      });
    }, 250);

    return () => window.clearInterval(interval);
  }, [loading]);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) {
      onFilesChange((prev) => mergeFiles(prev, dropped));
      setError(null);
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) {
      onFilesChange((prev) => mergeFiles(prev, selected));
      setError(null);
    }
    e.target.value = "";
  }

  function handleRemoveSingle(file: UploadedFileItem) {
    const keyToRemove = getFileKey(file);
    onFilesChange((prev) =>
      prev.filter((item) => getFileKey(item) !== keyToRemove),
    );
    setError(null);
  }

  async function handleProcess() {
    if (files.length === 0) return;
    const sourceFiles = files
      .map((item) => item.file)
      .filter((file): file is File => file instanceof File);
    if (sourceFiles.length === 0) {
      setError(
        "These uploaded documents were restored after refresh. Re-select the files if you want to parse them again.",
      );
      return;
    }
    setLoading(true);
    setProgress(5);
    setProgressPhase("processing");
    setError(null);
    try {
      const result = await parseAttendanceFiles(sourceFiles);
      if (result.employees.length === 0 && result.records.length === 0) {
        throw new Error(
          "No employee records found. Check export format and try again.",
        );
      }
      setProgress((current) => Math.max(current, 72));
      setProgressPhase("saving");
      await onParsed(result);
      setProgress(100);
      setProgressPhase("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file.");
      setProgress(0);
      setProgressPhase("processing");
    } finally {
      setLoading(false);
    }
  }

  const hasFiles = files.length > 0;

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-[14px] border-2 border-dashed transition-all duration-200
          ${
            dragging
              ? "scale-[1.01] border-emerald-500 bg-emerald-50 shadow-[0_18px_36px_rgba(16,185,129,0.12)]"
              : hasFiles
                ? "border-emerald-100 bg-[rgb(var(--apple-snow))] shadow-[0_12px_30px_rgba(24,83,43,0.05)]"
                : "border-slate-300 bg-white hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-[0_14px_32px_rgba(24,83,43,0.06)]"
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.xls,.xlsx,.csv"
          multiple
          onChange={handleChange}
          className="hidden"
        />

        {!hasFiles ? (
          <div className="flex flex-col items-center px-8 py-16 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#14532d,#166534)] shadow-[0_16px_32px_rgba(22,101,52,0.22)] transition-transform duration-200 group-hover:scale-110">
              <Upload size={28} className="text-white" strokeWidth={1.5} />
            </div>
            <p className="mb-1 text-[17px] font-semibold tracking-tight text-apple-charcoal">
              Drop your attendance reports here
            </p>
            <p className="mb-5 text-sm text-apple-steel">
              or click to browse from your computer
            </p>
            <div className="flex items-center gap-2">
              {["PDF", "XLS", "XLSX", "CSV"].map((f) => (
                <span
                  key={f}
                  className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-2xs font-mono font-semibold text-emerald-700 shadow-sm"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#14532d,#166534)] shadow-[0_14px_28px_rgba(22,101,52,0.2)]">
                <FileSpreadsheet size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-[#142d34]">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-[#7e9299]">
                  <span>
                    {(
                      files.reduce((sum, current) => sum + current.size, 0) /
                      1024
                    ).toFixed(1)}{" "}
                    KB total
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                className="h-9 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-100"
              >
                Add files
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onClearWorkspace) {
                    onClearWorkspace();
                  } else {
                    onFilesChange([]);
                  }
                  setError(null);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#14532d,#166534)] shadow-sm transition-colors hover:bg-[#15803d]"
              >
                <X size={14} className="text-white" />
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="text-2xs font-semibold uppercase tracking-widest text-apple-silver">
                Uploaded Reports
              </p>
              <div className="space-y-3">
                {files.map((current) => (
                  <div
                    key={getFileKey(current)}
                    className="flex items-center justify-between gap-2 rounded-[12px] border border-apple-mist bg-[rgb(var(--apple-snow))] px-3 py-2 shadow-[0_8px_20px_rgba(24,83,43,0.05)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs text-apple-ash">
                        {current.name}
                      </p>
                      <p className="text-2xs text-apple-silver">
                        {(current.size / 1024).toFixed(1)} KB
                        {current.persisted ? " · restored after refresh" : ""}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSingle(current);
                      }}
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px] bg-[linear-gradient(135deg,#14532d,#166534)] transition-colors hover:bg-[#15803d]"
                      aria-label={`Remove ${current.name}`}
                      title={`Remove ${current.name}`}
                    >
                      <X size={12} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-[12px] border border-red-100 bg-red-50 p-4">
          <AlertCircle
            size={16}
            className="text-red-500 mt-0.5 flex-shrink-0"
          />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading && (
        <AttendanceUploadProgress
          progress={progress}
          phase={progressPhase}
        />
      )}

      <div className="flex gap-3">
        <button
          onClick={handleProcess}
          disabled={!hasFiles || loading}
          className={`
            flex w-full items-center justify-center gap-2 rounded-[10px] px-5 py-3 text-sm font-semibold sm:w-auto
            transition-all duration-200
            ${
              hasFiles && !loading
                ? "border border-emerald-700  bg-[#1f6a37] hover:bg-[#18552d]   text-white shadow-[0_16px_34px_rgba(22,101,52,0.24)] hover:border-emerald-600  active:scale-[0.98]"
                : "cursor-not-allowed border border-emerald-800/40 bg-emerald-800/70 text-white"
            }
          `}
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Processing... {Math.round(progress)}%
            </>
          ) : (
            <>
              <Upload size={15} /> Review Attendance Reports
            </>
          )}
        </button>
      </div>
    </div>
  );
}

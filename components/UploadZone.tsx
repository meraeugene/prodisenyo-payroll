"use client";

import { useEffect, useRef, useState, DragEvent, ChangeEvent } from "react";
import { Upload, FileSpreadsheet, X, AlertCircle, Loader2 } from "lucide-react";
import { parseAttendanceFiles, type ParseResult } from "@/lib/parser";

interface UploadZoneProps {
  onParsed: (result: ParseResult) => void;
  resetSignal?: number;
}

function getFileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function mergeFiles(existing: File[], incoming: File[]): File[] {
  const map = new Map<string, File>();
  [...existing, ...incoming].forEach((file) => {
    map.set(getFileKey(file), file);
  });
  return Array.from(map.values());
}

export default function UploadZone({ onParsed, resetSignal }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFiles([]);
    setDragging(false);
    setLoading(false);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [resetSignal]);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) {
      setFiles((prev) => mergeFiles(prev, dropped));
      setError(null);
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) {
      setFiles((prev) => mergeFiles(prev, selected));
      setError(null);
    }
    e.target.value = "";
  }

  function handleRemoveSingle(file: File) {
    const keyToRemove = getFileKey(file);
    setFiles((prev) => prev.filter((item) => getFileKey(item) !== keyToRemove));
    setError(null);
  }

  async function handleProcess() {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await parseAttendanceFiles(files);
      if (result.employees.length === 0 && result.records.length === 0) {
        throw new Error(
          "No employee records found. Check export format and try again.",
        );
      }
      onParsed(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file.");
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
          relative rounded-3xl border-2 border-dashed transition-all duration-200 cursor-pointer
          ${
            dragging
              ? "border-apple-charcoal bg-apple-charcoal/5 scale-[1.01]"
              : hasFiles
                ? "border-apple-silver bg-white"
                : "border-apple-silver hover:border-apple-ash hover:bg-white/60 bg-white/40"
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
          <div className="py-16 px-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-apple-charcoal hover:bg-apple-charcoal/90 flex items-center justify-center mb-5 transition-transform duration-200 group-hover:scale-110">
              <Upload size={28} className="text-white" strokeWidth={1.5} />
            </div>
            <p className="text-[17px] font-semibold text-apple-charcoal tracking-tight mb-1">
              Drop your attendance reports here
            </p>
            <p className="text-sm text-apple-smoke mb-5">
              or click to browse from your computer
            </p>
            <div className="flex items-center gap-2">
              {["PDF", "XLS", "XLSX", "CSV"].map((f) => (
                <span
                  key={f}
                  className="text-2xs font-mono font-medium px-2.5 py-1 rounded-md bg-apple-charcoal text-white "
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-apple-charcoal flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-apple-charcoal truncate">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </p>
                <p className="text-xs text-apple-smoke mt-0.5">
                  {(
                    files.reduce((sum, current) => sum + current.size, 0) / 1024
                  ).toFixed(1)}{" "}
                  KB total
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                className="h-8 rounded-xl border border-apple-silver px-3 text-xs font-semibold text-apple-ash hover:border-apple-ash transition-colors"
              >
                Add files
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFiles([]);
                  setError(null);
                }}
                className="w-8 h-8 rounded-full bg-apple-charcoal hover:bg-apple-charcoal/80 transition-colors flex items-center justify-center"
              >
                <X size={14} className="text-white" />
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="text-2xs font-semibold text-apple-steel uppercase tracking-widest">
                Uploaded Reports
              </p>
              <div className="space-y-3 ">
                {files.map((current) => (
                  <div
                    key={getFileKey(current)}
                    className="flex items-center bg-apple-snow  justify-between gap-2 border-apple-mist shadow-apple-xs border px-2 rounded-lg py-1.5 hover:bg-apple-snow/40  "
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs text-apple-ash">
                        {current.name}
                      </p>
                      <p className="text-2xs text-apple-steel">
                        {(current.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSingle(current);
                      }}
                      className="h-6 w-6 flex-shrink-0 rounded-full bg-apple-charcoal hover:bg-apple-charcoal/80 transition-colors flex items-center  justify-center"
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
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100">
          <AlertCircle
            size={16}
            className="text-red-500 mt-0.5 flex-shrink-0"
          />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleProcess}
          disabled={!hasFiles || loading}
          className={`
            flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold
            transition-all duration-200
            ${
              hasFiles && !loading
                ? "bg-apple-charcoal text-white hover:bg-apple-charcoal/90 active:scale-[0.98] shadow-apple"
                : "bg-apple-charcoal/80 text-white cursor-not-allowed"
            }
          `}
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Processing...
            </>
          ) : (
            <>
              <Upload size={15} /> Review Attendance Reports
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-apple-steel leading-relaxed">
        Your files are processed entirely in the browser.{" "}
        <span className="font-medium text-apple-smoke">
          No data is uploaded to any server.
        </span>
      </p>
    </div>
  );
}

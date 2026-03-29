"use client";

import { useCallback, useRef, useState } from "react";

export function BillUploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const acceptFiles = useCallback((files: FileList | null) => {
    const f = files?.[0];
    if (f) setFileName(f.name);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      acceptFiles(e.dataTransfer.files);
    },
    [acceptFiles],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      className="rounded-sm p-6"
      style={{
        background: "var(--surface-card)",
        border: "2px solid var(--border-soft)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <h2
        className="text-sm font-bold uppercase tracking-widest"
        style={{ color: "var(--text-secondary)", letterSpacing: "0.15em" }}
      >
        ▣ Add a Bill File
      </h2>
      <p className="mt-2 max-w-xl text-xs" style={{ color: "var(--text-muted)" }}>
        Drop a PDF or photo of your statement. Nothing leaves your browser until you connect an account.
      </p>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className="mt-5 flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed px-6 py-8 text-center transition-colors"
        style={{
          borderColor: isDragging ? "var(--accent)" : "var(--border-medium)",
          background: isDragging ? "var(--accent-wash)" : "var(--surface-muted)",
        }}
        aria-label="Upload energy bill file. Click or drop a file."
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/*"
          className="sr-only"
          onChange={(e) => acceptFiles(e.target.files)}
        />
        <span
          className="rounded-sm px-4 py-2 text-xs font-bold uppercase"
          style={{
            background: "var(--accent-wash)",
            border: "2px solid var(--border-medium)",
            color: "var(--accent)",
            letterSpacing: "0.12em",
          }}
        >
          Choose file or drag here
        </span>
        <span className="mt-3 text-[10px] uppercase" style={{ color: "var(--text-muted)", letterSpacing: "0.1em" }}>
          PDF · JPG · PNG
        </span>
      </div>

      {fileName && (
        <div
          className="mt-4 rounded-sm px-4 py-3 text-xs"
          style={{
            background: "var(--accent-wash)",
            border: "2px solid var(--border-medium)",
            color: "var(--pastel-mint)",
          }}
          role="status"
        >
          <span className="font-bold" style={{ color: "var(--accent)" }}>✓ LOADED: </span>
          {fileName}
        </div>
      )}
    </div>
  );
}

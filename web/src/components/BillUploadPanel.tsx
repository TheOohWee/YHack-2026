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
    <div className="rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <h2 className="text-lg font-semibold text-[var(--text)]">
        Add a bill file
      </h2>
      <p className="mt-2 max-w-xl text-base text-[var(--text-muted)]">
        Drop a PDF or photo of your statement. Nothing leaves your browser until
        you connect an account later — this step simply prepares your file.
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
        className={`mt-6 flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          isDragging
            ? "border-[var(--accent)] bg-[var(--accent-wash)]"
            : "border-[var(--border-soft)] bg-[var(--surface-muted)] hover:border-[var(--accent-soft)] hover:bg-[var(--accent-wash)]/60"
        }`}
        aria-label="Upload energy bill file. Click or drop a file."
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/*"
          className="sr-only"
          onChange={(e) => acceptFiles(e.target.files)}
        />
        <span className="rounded-full bg-[var(--accent-wash)] px-4 py-2 text-base font-medium text-[var(--accent)]">
          Choose file or drag here
        </span>
        <span className="mt-3 text-base text-[var(--text-muted)]">
          PDF, JPG, or PNG — up to what your browser allows
        </span>
      </div>

      {fileName ? (
        <div
          className="mt-5 rounded-xl border border-[var(--accent-soft)] bg-[var(--accent-wash)] px-4 py-3 text-base text-[var(--text)]"
          role="status"
        >
          <span className="font-medium text-[var(--accent)]">Added: </span>
          {fileName}
        </div>
      ) : null}
    </div>
  );
}

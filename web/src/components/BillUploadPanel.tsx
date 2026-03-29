"use client";

import { Loader2, Upload, Zap, FileText } from "lucide-react";
import { useCallback, useRef, useState } from "react";

type Props = { userId: string };

export function BillUploadPanel({ userId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeFile = useCallback(
    async (file: File) => {
      setFileName(file.name);
      setAnalysis(null);
      setError(null);
      setLoading(true);

      try {
        const isPdf =
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf");
        const isTxt = file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");

        let res: Response;

        if (isPdf || isTxt) {
          const form = new FormData();
          form.append("file", file);
          form.append("userId", userId);
          res = await fetch("/api/bill-analyze", {
            method: "POST",
            body: form,
          });
        } else {
          setLoading(false);
          setError("Please upload a PDF or .txt bill, or paste text below.");
          return;
        }

        const data = await res.json().catch(() => null);
        if (!res.ok || !data) {
          setError(data?.error || "Analysis failed");
          return;
        }

        setAnalysis(data.analysis);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  const acceptFiles = useCallback(
    (files: FileList | null) => {
      const f = files?.[0];
      if (f) void analyzeFile(f);
    },
    [analyzeFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      acceptFiles(e.dataTransfer.files);
    },
    [acceptFiles]
  );

  // Paste text fallback
  const [pasteText, setPasteText] = useState("");
  const analyzePastedText = useCallback(async () => {
    if (!pasteText.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/bill-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billText: pasteText, userId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError(data?.error || "Analysis failed");
        return;
      }

      setAnalysis(data.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [pasteText, userId]);

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-wash)]">
          <FileText className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Bill Analysis
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            Powered by K2 Think V2
          </p>
        </div>
      </div>
      <p className="mt-3 max-w-xl text-base text-[var(--text-muted)]">
        Upload your electricity bill and K2 will reason through your rates,
        usage patterns, and savings opportunities with real math.
      </p>

      {!analysis && !loading && (
        <>
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
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            className={`mt-5 flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
              isDragging
                ? "border-[var(--accent)] bg-[var(--accent-wash)]"
                : "border-[var(--border-soft)] bg-[var(--surface-muted)] hover:border-[var(--accent-soft)] hover:bg-[var(--accent-wash)]/60"
            }`}
            aria-label="Upload energy bill"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.txt,text/plain"
              className="sr-only"
              onChange={(e) => acceptFiles(e.target.files)}
            />
            <Upload className="h-6 w-6 text-[var(--accent)] mb-2" />
            <span className="text-base font-medium text-[var(--accent)]">
              Drop your bill PDF or click to upload
            </span>
            <span className="mt-1 text-sm text-[var(--text-muted)]">
              PDF or text file
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--border-soft)]" />
            <span className="text-sm text-[var(--text-muted)]">or paste bill text</span>
            <div className="h-px flex-1 bg-[var(--border-soft)]" />
          </div>

          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste the text from your electricity bill here..."
            className="mt-4 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15 min-h-[100px] resize-y"
          />
          {pasteText.trim() && (
            <button
              type="button"
              className="btn-calm mt-3 gap-2"
              onClick={() => void analyzePastedText()}
            >
              <Zap className="h-4 w-4" />
              Analyze with K2
            </button>
          )}
        </>
      )}

      {loading && (
        <div className="mt-6 flex flex-col items-center gap-3 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
          <p className="text-base font-medium text-[var(--text)]">
            K2 Think V2 is analyzing your bill...
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Reasoning through rates, usage, and savings
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="mt-4 rounded-xl border border-[var(--warm-alert)]/30 bg-[var(--warm-alert-bg)] px-4 py-3 text-sm text-[var(--text)]">
          {error}
        </div>
      )}

      {analysis && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-[var(--accent)]" />
            <span className="text-sm font-semibold text-[var(--accent)]">
              K2 Think V2 Analysis
            </span>
            {fileName && (
              <span className="text-sm text-[var(--text-muted)]">
                — {fileName}
              </span>
            )}
          </div>
          <div className="bill-analysis-content rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-5 text-sm leading-relaxed text-[var(--text)] whitespace-pre-wrap">
            {analysis}
          </div>
          <button
            type="button"
            className="btn-calm-secondary mt-4"
            onClick={() => {
              setAnalysis(null);
              setFileName(null);
              setPasteText("");
              setError(null);
            }}
          >
            Analyze another bill
          </button>
        </div>
      )}
    </div>
  );
}


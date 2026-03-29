"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type InfoModalProps = {
  title: string;
  children: React.ReactNode;
};

export function InfoModal({ title, children }: InfoModalProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="info-modal-trigger"
        aria-label={`Learn more about ${title}`}
      >
        ?
      </button>

      {mounted && open
        ? createPortal(
            <>
              {/* Overlay — separate from the modal so backdrop-filter can't trap it */}
              <div
                className="info-modal-overlay"
                onClick={close}
                aria-hidden="true"
              />
              {/* Modal — sibling, sits above the overlay via z-index */}
              <div
                className="info-modal-positioner"
                role="dialog"
                aria-modal="true"
                aria-label={title}
              >
                <div className="info-modal-window">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <h2 className="text-xl font-semibold text-[var(--text)]">
                      {title}
                    </h2>
                    <button
                      type="button"
                      onClick={close}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="text-base leading-relaxed text-[var(--text-secondary)]">
                    {children}
                  </div>
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}

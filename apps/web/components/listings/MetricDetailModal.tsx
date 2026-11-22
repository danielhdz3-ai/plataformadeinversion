"use client";

import { useEffect, type ReactNode } from "react";

export function MetricDetailModal({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-neutral-950/45" onClick={onClose} />
      <div
        role="dialog"
        aria-labelledby="metric-modal-title"
        className="relative max-h-[min(88vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-2xl"
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-neutral-100 bg-white px-5 py-4">
          <div>
            <h2 id="metric-modal-title" className="text-base font-semibold text-neutral-950">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-lg leading-none text-neutral-500 hover:bg-neutral-100"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4 text-sm text-neutral-800">{children}</div>
      </div>
    </div>
  );
}

export function MetricRowButton({
  label,
  value,
  strong,
  onOpen,
}: {
  label: string;
  value: string;
  strong?: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full justify-between gap-2 rounded-md px-1 py-0.5 text-left transition hover:bg-neutral-50"
    >
      <span className="text-neutral-600 underline decoration-neutral-300 decoration-dotted underline-offset-2">
        {label}
      </span>
      <span className={strong ? "font-bold tabular-nums text-neutral-950" : "font-medium tabular-nums"}>
        {value}
      </span>
    </button>
  );
}

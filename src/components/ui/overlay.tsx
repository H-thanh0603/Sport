"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

function useLockBody(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
}

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);
}

export function Sheet({
  open,
  onClose,
  side = "left",
  children,
  title,
  className,
}: {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  useLockBody(open);
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} aria-hidden />
      <div
        className={cn(
          "absolute inset-y-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-card p-4 shadow-xl animate-slide-up",
          side === "left" ? "left-0" : "right-0",
          className,
        )}
      >
        <div className="mb-2 flex items-center justify-between">
          {title ? <span className="font-semibold">{title}</span> : <span />}
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  useLockBody(open);
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} aria-hidden />
      <div className={cn("relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-xl animate-slide-up", className)}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

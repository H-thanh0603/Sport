"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const toastVariants = cva("pointer-events-auto flex w-full items-start gap-2 rounded-md border p-3 shadow-lg animate-slide-up", {
  variants: {
    variant: {
      default: "border-border bg-card text-card-foreground",
      success: "border-success/40 bg-card text-card-foreground",
      error: "border-destructive/40 bg-card text-card-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface ToastItem {
  id: number;
  title: string;
  variant?: VariantProps<typeof toastVariants>["variant"];
}

interface ToastCtx {
  toast: (t: { title: string; variant?: ToastItem["variant"] }) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

export function Toaster({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, variant }: { title: string; variant?: ToastItem["variant"] }) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev.slice(-4), { id, title, variant }]);
      setTimeout(() => remove(id), 5000);
    },
    [remove],
  );

  const ctx = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {items.map((item) => (
          <div key={item.id} role="status" className={cn(toastVariants({ variant: item.variant }))}>
            {item.variant === "success" ? (
              <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0 text-success" />
            ) : item.variant === "error" ? (
              <AlertCircle aria-hidden className="h-5 w-5 shrink-0 text-destructive" />
            ) : (
              <Info aria-hidden className="h-5 w-5 shrink-0 text-muted-foreground" />
            )}
            <p className="flex-1 text-sm">{item.title}</p>
            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => remove(item.id)}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext);
  if (!ctx) return { toast: () => undefined };
  return ctx;
}

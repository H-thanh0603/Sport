import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2">
      <Loader2 aria-hidden className={cn("h-5 w-5 animate-spin text-primary", className)} />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}

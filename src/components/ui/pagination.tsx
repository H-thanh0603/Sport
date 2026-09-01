import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  onChange,
  className,
}: {
  page: number;
  totalPages: number;
  onChange?: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce<(number | "…")[]>((acc, p, i, arr) => {
      const prev = arr[i - 1];
      if (i > 0 && typeof prev === "number" && p - prev > 1) acc.push("…");
      acc.push(p);
      return acc;
    }, []);
  return (
    <nav aria-label="Phân trang" className={cn("flex items-center justify-center gap-1", className)}>
      <button
        type="button"
        aria-label="Trang trước"
        disabled={page <= 1}
        onClick={() => onChange?.(page - 1)}
        className="rounded-md p-1.5 hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1.5 text-muted-foreground">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? "page" : undefined}
            onClick={() => onChange?.(p)}
            className={cn(
              "min-w-8 rounded-md px-2 py-1 text-sm",
              p === page ? "bg-primary font-semibold text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        aria-label="Trang sau"
        disabled={page >= totalPages}
        onClick={() => onChange?.(page + 1)}
        className="rounded-md p-1.5 hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

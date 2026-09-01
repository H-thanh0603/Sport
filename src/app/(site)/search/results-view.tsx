"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";

/** Suggestion chips below search results — popular searches. */
export function SearchResultsView({ q }: { q: string }) {
  const suggestions = ["Manchester United", "Real Madrid", "LeBron James", "Premier League", "Djokovic", "NBA"];
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
      <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden />
      <span className="text-muted-foreground">Thử:</span>
      {suggestions
        .filter((s) => s.toLowerCase() !== q.toLowerCase())
        .slice(0, 5)
        .map((s) => (
          <a
            key={s}
            href={`/search?q=${encodeURIComponent(s)}`}
            className="rounded-full border px-3 py-1 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            {s}
          </a>
        ))}
      <button type="button" onClick={() => setHidden(true)} aria-label="Ẩn gợi ý" className="text-xs text-muted-foreground">
        Ẩn
      </button>
    </div>
  );
}

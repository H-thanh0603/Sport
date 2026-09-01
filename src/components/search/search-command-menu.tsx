"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, Shield, User, Trophy, Newspaper, X, CornerDownLeft } from "lucide-react";
import { api } from "@/lib/api-client";
import { Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

type Suggest = { type: "team" | "player" | "league"; slug: string; name: string };

const TYPE_ROUTE: Record<Suggest["type"], string> = {
  team: "/teams",
  player: "/players",
  league: "/leagues",
};
const TYPE_ICON: Record<Suggest["type"], typeof User> = {
  team: Shield,
  player: User,
  league: Trophy,
};

/** Global search — Cmd+K, debounce 300ms, autocomplete, group results. */
export function SearchCommandMenu() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+K / Ctrl+K toggles; "/" opens when not typing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !open && document.activeElement?.tagName === "BODY") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (open) {
      setActiveIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const { data, isLoading } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => api.get<Suggest[]>(`/api/v1/search/suggest?q=${encodeURIComponent(debounced)}`),
    enabled: open && debounced.length >= 2,
    staleTime: 60_000,
  });

  const results = data ?? [];

  const go = (item?: Suggest) => {
    const target =
      item && TYPE_ROUTE[item.type]
        ? `${TYPE_ROUTE[item.type]}/${item.slug}`
        : q.trim()
          ? `/search?q=${encodeURIComponent(q.trim())}`
          : null;
    if (target) {
      setOpen(false);
      setQ("");
      router.push(target);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Tìm kiếm (Ctrl+K)"
        className="inline-flex items-center gap-2 rounded-md border bg-background/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        <Search className="h-4 w-4" aria-hidden />
        <span className="hidden md:inline">Tìm kiếm</span>
        <kbd className="hidden rounded border bg-muted px-1.5 text-[10px] md:inline">⌘K</kbd>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 p-4 pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Tìm kiếm"
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div
        className="mx-auto max-w-xl overflow-hidden rounded-lg border bg-card shadow-2xl animate-slide-up"
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIdx((i) => Math.min(i + 1, results.length));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIdx((i) => Math.max(i - 1, 0));
          }
          if (e.key === "Enter") {
            e.preventDefault();
            go(results[activeIdx]);
          }
        }}
      >
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm đội, cầu thủ, giải, tin tức…"
            aria-label="Từ khóa tìm kiếm"
            className="h-12 w-full bg-transparent outline-none placeholder:text-muted-foreground"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="search-results"
          />
          {isLoading ? <Spinner className="h-4 w-4" /> : null}
          <button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="rounded p-1 hover:bg-muted">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div id="search-results" role="listbox" aria-label="Gợi ý tìm kiếm" className="max-h-80 overflow-y-auto p-2">
          {debounced.length < 2 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Gõ tối thiểu 2 ký tự. Tìm "man utd" để thử.
            </p>
          ) : results.length === 0 && !isLoading ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Không tìm thấy gợi ý — Enter để tìm toàn trang.
            </p>
          ) : (
            <ul>
              {results.map((r, i) => {
                const Icon = TYPE_ICON[r.type];
                return (
                  <li key={`${r.type}-${r.slug}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === activeIdx}
                      onClick={() => go(r)}
                      onMouseEnter={() => setActiveIdx(i)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm",
                        i === activeIdx ? "bg-muted" : "hover:bg-muted/60",
                      )}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                      <span className="flex-1">{r.name}</span>
                      <span className="text-xs text-muted-foreground">{r.type}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-3 border-t px-4 py-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CornerDownLeft className="h-3 w-3" aria-hidden /> mở
          </span>
          <span>↑↓ chọn</span>
          <span>esc đóng</span>
          <span className="ml-auto inline-flex items-center gap-1">
            <Newspaper className="h-3 w-3" aria-hidden /> Enter: tìm tin tức
          </span>
        </div>
      </div>
    </div>
  );
}

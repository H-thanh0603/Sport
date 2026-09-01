"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellRing, Check } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useLive, type LiveMessage } from "@/lib/use-live";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

type Notification = {
  id: number;
  type: "match_starting" | "match_event" | "match_result" | "system";
  title: string;
  body: string | null;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

/** Notification bell — unread badge, dropdown list, realtime refetch via SSE user topic. */
export function NotificationCenter({ userId }: { userId: number | null }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<{ items: Notification[]; unread: number }>("/api/v1/notifications"),
    enabled: userId !== null,
    refetchInterval: 120_000,
  });

  // realtime: subscribe own user topic, refetch on notification message
  useLive(
    userId ? [`user:${userId}`] : [],
    (msg: LiveMessage) => {
      if (msg.type === "notification") {
        void qc.invalidateQueries({ queryKey: ["notifications"] });
      }
    },
    userId !== null,
  );

  const markRead = useMutation({
    mutationFn: (ids?: number[]) => api.post("/api/v1/notifications/read", { ids }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!userId) return null;
  const unread = data?.unread ?? 0;
  const items = data?.items ?? [];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Thông báo${unread > 0 ? ` (${unread} chưa đọc)` : ""}`}
        aria-expanded={open}
        className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {unread > 0 ? <BellRing className="h-5 w-5" aria-hidden /> : <Bell className="h-5 w-5" aria-hidden />}
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-live px-1 text-[10px] font-bold text-white animate-pulse-live">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border bg-card shadow-xl animate-fade-in">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-semibold">Thông báo</span>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => markRead.mutate()}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Check className="h-3 w-3" aria-hidden /> Đọc tất cả
              </button>
            ) : null}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Chưa có thông báo.
                <br />
                Theo dõi đội bóng để nhận tin trận đấu.
              </p>
            ) : (
              <ul role="list">
                {items.map((n) => {
                  const inner = (
                    <div className={cn("px-4 py-3", !n.isRead && "bg-primary/5")}>
                      <p className={cn("text-sm", !n.isRead && "font-medium")}>{n.title}</p>
                      {n.body ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p> : null}
                      <p className="mt-1 text-[11px] text-muted-foreground">{formatRelative(n.createdAt)}</p>
                    </div>
                  );
                  return (
                    <li key={n.id} role="listitem">
                      {n.linkUrl ? (
                        <Link href={n.linkUrl} onClick={() => !n.isRead && markRead.mutate([n.id])} className="block hover:bg-muted/50">
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

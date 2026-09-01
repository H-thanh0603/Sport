"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type LiveMessage = {
  topic: string;
  type: "score" | "event" | "status" | "stats" | "notification";
  payload: Record<string, unknown>;
  ts: string;
};

/**
 * SSE subscription with auto-reconnect (exponential backoff) + cleanup.
 * ponytail: single EventSource per topics-set; when moving to many concurrent
 * streams, upgrade to shared hub per page.
 */
export function useLive(
  topics: string[],
  onUpdate: (msg: LiveMessage) => void,
  enabled = true,
) {
  const [connected, setConnected] = useState(false);
  const handlerRef = useRef(onUpdate);
  handlerRef.current = onUpdate;
  const topicKey = topics.slice().sort().join(",");

  useEffect(() => {
    if (!enabled || !topicKey) return;
    let es: EventSource | null = null;
    let retry = 0;
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      es = new EventSource(`/api/v1/live/stream?topics=${encodeURIComponent(topicKey)}`);
      es.onopen = () => {
        retry = 0;
        setConnected(true);
      };
      es.onmessage = (e) => {
        try {
          handlerRef.current(JSON.parse(e.data) as LiveMessage);
        } catch {
          // ignore malformed
        }
      };
      es.onerror = () => {
        setConnected(false);
        es?.close();
        if (closed) return;
        const delay = Math.min(2 ** retry * 1000, 15_000);
        retry++;
        timer = setTimeout(connect, delay);
      };
    };
    connect();

    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      es?.close();
      setConnected(false);
    };
  }, [topicKey, enabled]);

  return connected;
}

/** Client hook: merges live score deltas into a matches list without reload. */
export function useLiveMatches() {
  const [matches, setMatches] = useState<Record<number, Record<string, unknown>>>({});
  const apply = useCallback((msg: LiveMessage) => {
    if (msg.type !== "score" && msg.type !== "status") return;
    const id = Number(msg.topic.split(":")[1]);
    if (!Number.isFinite(id)) return;
    setMatches((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), ...msg.payload },
    }));
  }, []);
  return { overrides: matches, apply };
}

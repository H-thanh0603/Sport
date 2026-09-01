import { cache } from "@/server/cache";
import type { LiveMessage } from "@/lib/use-live";
import { logger } from "@/server/logger";

type Handler = (msg: LiveMessage) => void;

/**
 * Live hub — topic pub/sub. In-process handlers + cross-instance via Redis pub/sub
 * when REDIS_URL is set. Topic examples: "home", "match:123", "user:42".
 */
const localSubs = new Map<string, Set<Handler>>();

function dispatch(topic: string, msg: LiveMessage) {
  const set = localSubs.get(topic);
  if (set) for (const h of set) {
    try {
      h(msg);
    } catch (err) {
      logger.warn("live hub handler error", { error: String(err) });
    }
  }
}

export const hub = {
  async publish(topic: string, type: LiveMessage["type"], payload: Record<string, unknown>) {
    const msg: LiveMessage = { topic, type, payload, ts: new Date().toISOString() };
    dispatch(topic, msg);
    await cache().publish("live", JSON.stringify({ ...msg, _topic: topic }));
  },

  async subscribe(topics: string[], handler: Handler): Promise<() => void> {
    const unsubs: Array<() => void> = [];
    for (const topic of topics) {
      let set = localSubs.get(topic);
      if (!set) {
        set = new Set();
        localSubs.set(topic, set);
      }
      set.add(handler);
    }
    // cross-instance: subscribe shared channel, route to local handlers
    const sharedUnsub = await cache().subscribe("live", (raw) => {
      try {
        const parsed = JSON.parse(raw) as LiveMessage & { _topic?: string };
        if (parsed._topic && topics.includes(parsed._topic)) handler(parsed);
      } catch {
        // ignore
      }
    });
    unsubs.push(sharedUnsub);
    return () => {
      for (const topic of topics) {
        const set = localSubs.get(topic);
        if (set) set.delete(handler);
      }
      for (const u of unsubs) u();
    };
  },
};

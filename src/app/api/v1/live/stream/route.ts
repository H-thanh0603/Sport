import { NextRequest } from "next/server";
import { hub } from "@/server/live/hub";
import { startEngine } from "@/server/live/engine";
import { logger } from "@/server/logger";

export const dynamic = "force-dynamic";

let engineStarted = false;

/** SSE stream — GET /api/v1/live/stream?topics=home,match:123 */
export async function GET(req: NextRequest) {
  const topicsParam = req.nextUrl.searchParams.get("topics") ?? "home";
  const topics = topicsParam
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length < 64 && /^[a-z0-9:_-]+$/i.test(t))
    .slice(0, 20);
  if (topics.length === 0) {
    return new Response("invalid topics", { status: 400 });
  }

  if (!engineStarted) {
    // ponytail: in-memory engine kick — when REDIS_URL set, worker owns ticks instead
    startEngine();
    engineStarted = true;
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // client gone
        }
      };
      send(`retry: 5000\n\n`);
      send(`event: message\ndata: ${JSON.stringify({ topic: topics[0], type: "status", payload: { connected: true }, ts: new Date().toISOString() })}\n\n`);

      unsubscribe = await hub.subscribe(topics, (msg) => {
        send(`event: message\ndata: ${JSON.stringify(msg)}\n\n`);
      });

      heartbeat = setInterval(() => {
        send(`: ping\n\n`);
      }, 15_000);

      req.signal.addEventListener("abort", () => {
        logger.debug("sse client disconnected", { topics });
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  function cleanup() {
    if (heartbeat) clearInterval(heartbeat);
    unsubscribe?.();
    unsubscribe = null;
    heartbeat = null;
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

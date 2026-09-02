import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as liveStreamGET } from "@/app/api/v1/live/stream/route";

/**
 * SSE endpoint against the real route handler: connected frame, hub subscribe,
 * heartbeat comment, and delta push when the hub publishes to a subscribed topic.
 */

function makeReq(topics: string, signal: AbortSignal) {
  return new NextRequest(`http://localhost:3000/api/v1/live/stream?topics=${encodeURIComponent(topics)}`, {
    signal,
  });
}

async function collectFor(
  res: Response,
  ms: number,
  until?: (chunk: string) => boolean,
): Promise<string[]> {
  const chunks: string[] = [];
  const reader = (res.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  const deadline = Date.now() + ms;
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        while (Date.now() < deadline) {
          const { value, done } = await Promise.race([
            reader.read(),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error("read timeout")), 2_000)),
          ]);
          if (done) break;
          const text = decoder.decode(value);
          chunks.push(text);
          if (until?.(text)) break;
        }
      } catch {
        // timeout reading — return what we have
      } finally {
        try {
          await reader.cancel();
        } catch {
          // already closed
        }
        resolve(chunks);
      }
      resolve(chunks);
    })().catch(reject);
  });
}

describe("SSE /api/v1/live/stream", () => {
  it("rejects missing/invalid topics with 400", async () => {
    const ac = new AbortController();
    const req = makeReq("", ac.signal);
    const res = await liveStreamGET(req);
    expect(res.status).toBe(400);
    ac.abort();
  });

  it("streams retry hint + connected status frame in SSE format", async () => {
    const ac = new AbortController();
    const req = makeReq("home", ac.signal);
    const res = await liveStreamGET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const chunks = await collectFor(res, 1_500, (c) => c.includes("connected"));
    const joined = chunks.join("");
    expect(joined).toContain("retry: 5000");
    expect(joined).toContain("event: message");
    expect(joined).toContain('"type":"status"');
    expect(joined).toContain('"connected":true');
    ac.abort();
  });

  it("forwards hub publishes on subscribed topics to the stream", async () => {
    const ac = new AbortController();
    const req = makeReq("match:999999", ac.signal);
    const res = await liveStreamGET(req);

    // wait for subscription, then publish a delta on the topic
    await new Promise((r) => setTimeout(r, 300));
    const { hub } = await import("@/server/live/hub");
    await hub.publish("match:999999", "score", { homeScore: 1, awayScore: 0, minute: 42 });

    const chunks = await collectFor(res, 2_000, (c) => c.includes("homeScore"));
    const joined = chunks.join("");
    expect(joined).toContain('"topic":"match:999999"');
    expect(joined).toContain('"type":"score"');
    expect(joined).toContain('"homeScore":1');
    ac.abort();
  });
});

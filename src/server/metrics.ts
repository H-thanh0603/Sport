type Counter = { count: number; sumMs: number; buckets: number[] };

const counters = new Map<string, Counter>();

function counter(name: string): Counter {
  let c = counters.get(name);
  if (!c) {
    c = { count: 0, sumMs: 0, buckets: [0, 0, 0, 0] }; // [<100ms, <500ms, <2s, ≥2s]
    counters.set(name, c);
  }
  return c;
}

function record(name: string, ms: number) {
  const c = counter(name);
  c.count++;
  c.sumMs += ms;
  if (ms < 100) c.buckets[0]!++;
  else if (ms < 500) c.buckets[1]!++;
  else if (ms < 2000) c.buckets[2]!++;
  else c.buckets[3]!++;
}

/**
 * In-process metrics — latency histograms for api/db/cache/provider.
 * ponytail: single-instance counters; upgrade to prom-client + pushgateway
 * when running multi-instance (each instance scrapes separately anyway).
 */
export const metrics = {
  recordApi(path: string, ms: number) {
    record(`api:${path}`, ms);
  },
  recordDb(ms: number) {
    record("db:query", ms);
  },
  recordCacheHit(hit: boolean) {
    const c = counter(hit ? "cache:hit" : "cache:miss");
    c.count++;
  },
  recordProvider(op: string, ms: number) {
    record(`provider:${op}`, ms);
  },

  render(): string {
    const lines: string[] = [];
    for (const [name, c] of counters) {
      const labels = name.includes(":") ? name.split(":").slice(1).join(",") : "";
      lines.push(`# TYPE ${name.replace(/[^a-z_]/gi, "_")} summary`);
      lines.push(`${name.replace(/:/g, "_")}_count ${c.count}`);
      lines.push(`${name.replace(/:/g, "_")}_sum_ms ${c.sumMs}`);
      lines.push(`${name.replace(/:/g, "_")}_avg_ms ${c.count > 0 ? (c.sumMs / c.count).toFixed(1) : 0}`);
      void labels;
    }
    // cache ratio
    const hit = counters.get("cache:hit")?.count ?? 0;
    const miss = counters.get("cache:miss")?.count ?? 0;
    lines.push(`cache_hit_ratio ${hit + miss > 0 ? (hit / (hit + miss)).toFixed(3) : 0}`);
    return lines.join("\n") + "\n";
  },
};

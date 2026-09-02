# Deployment

## 1. Single server (Docker Compose) — 100 → 10k users

```bash
cp .env.example .env
# bắt buộc: AUTH_SECRET=$(openssl rand -hex 32), POSTGRES_PASSWORD mạnh
# khuyến nghị: METRICS_TOKEN, NEXT_PUBLIC_SITE_URL=domain thật

docker compose --profile setup up -d   # db + redis + app + worker + nginx + migrate&seed
docker compose logs -f app              # theo dõi
```

Stack: nginx (80) → app (standalone, 3000) · worker (tsx) · postgres 16 · redis 7. Healthcheck built-in; LB dùng `GET /ready`.

**Cập nhật phiên bản:**

```bash
git pull && docker compose build app worker
docker compose up -d --no-deps app worker    # rolling: nginx giữ connections
```

## 2. Horizontal scaling — 10k → 100k users

```bash
docker compose -f docker-compose.prod.yml up -d   # 3 app replicas
```

Điều kiện stateless đã thỏa:
- Sessions trong PostgreSQL (không in-memory) — mọi replica đọc được
- Cache + SSE hub qua Redis pub/sub (`REDIS_URL`) — deltas replicate
- Live engine **chỉ worker chạy** (`startEngine()`), web instances chỉ đọc + subscribe

Tăng `APP_REPLICAS` thêm CPU; nginx upstream `keepalive` sẵn.

## 3. 100k → 1M+ users

| Nút nghẽn | Giải pháp |
|---|---|
| PG write | Read replica cho repositories;PgBouncer (transaction pool) |
| PG data growth | Partition `matches` theo tháng, `match_events` theo hash(match_id) |
| SSE connections | Tách live-hub thành service riêng; nginx `proxy_read_timeout 1h` đã config; mỗi LB node giữ N conn |
| Search | Migrate trigram → OpenSearch khi >1M rows (interface `searchService` thay được) |
| Static/ISR | CDN trước nginx; `Cache-Control immutable` đã set cho `/_next/static` |
| Queue | Redis → dedicated queue (BullMQ) — abstraction `queue.ts` sẵn |

## Zero-downtime deploy checklist

- [ ] Migration additive, backward-compatible với code cũ
- [ ] Build image mới, tag version
- [ ] `docker compose up -d --no-deps app` (nginx giữ conn trong lúc container restart)
- [ ] Watch `/ready` + logs 5 phút
- [ ] Rollback: tag cũ + `up -d --no-deps` (migration additive cho phép)

## Observability

- Logs JSON structured → `docker logs` / syslog → Loki/ELK
- `/api/internal/metrics` scrape Prometheus (Bearer METRICS_TOKEN): api/db/cache hit ratio/provider latency
- Alert đề xuất: `/ready` 503 > 1m; p95 API > 1s; `job_runs.status='error'` 3 lần liên tiếp; cache_hit_ratio < 0.5

## Backup & DR

- Daily `pg_dump` (xem DATABASE.md) + weekly full volume snapshot
- Redis chỉ cache/queue — mất được, self-warm
- RTO mục tiêu: 15m (restore image + latest dump); RPO: 24h (daily dump)

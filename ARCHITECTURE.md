# Kiến trúc — Sport Platform

## Tổng quan

Nền tảng thể thao production-ready: live scores, standings, tin tức, tìm kiếm, favorites, notifications, admin. Dark-first, card-based UI, realtime SSE.

## Stack

| Layer | Công nghệ | Lý do |
|---|---|---|
| Frontend | Next.js 15 App Router, React 19, TS strict, Tailwind 3, TanStack Query 5 | SSR/ISR + DX + type safety |
| UI | Component tự dựng theo pattern shadcn (CVA + tailwind-merge), Lucide icons, Recharts | Kiểm soát hoàn toàn, ít deps |
| Backend | Next.js Route Handlers (REST /api/v1) | 1 codebase, vẫn layered: route → service → repository |
| ORM | Drizzle ORM | SQL-first, edge-safe, migration typed |
| DB | PostgreSQL 16+ | Relational integrity, trigram search, partial indexes |
| Cache/Queue | Redis nếu có `REDIS_URL`, fallback in-process (LRU + worker in-app) | Dev 0-setup, prod scale |
| Auth | Session cookie (HttpOnly, SameSite=Lax), Argon2id, RBAC (user/moderator/admin) | Không deps JWT |
| Realtime | SSE (`/api/v1/live/stream`) | 1 chiều, auto-reconnect, qua LB dễ hơn WS |
| Jobs | `src/server/jobs/worker.ts` chạy bằng `npm run worker` | Tách process, same codebase |
| Tests | Vitest (unit/integration), Playwright (E2E) | |

## Luồng dữ liệu (Sports Data Architecture)

```
External API ─→ Provider (interface SportsDataProvider)
             ─→ Normalizer (chuẩn hoá → domain types)
             ─→ SyncService (upsert, dedupe, conflict resolution)
             ─→ PostgreSQL + Redis cache
             ─→ REST API / SSE
             ─→ Frontend (ISR + client cache + SSE incremental update)
```

- `SportsDataProvider`: interface duy nhất. Hiện có `MockSportsProvider` (sinh dữ liệu live mô phỏng). Thêm provider mới = 1 file + 1 dòng register, không sửa hệ thống (OCP).
- Provider failure handling: timeout → retry (exponential backoff) → circuit breaker → fallback stale cache → UI "Dữ liệu có thể bị trễ".
- Tất cả thời gian backend lưu **UTC** (timestamptz). Frontend convert theo `Intl` timezone user.

## Folder structure

```
src/
├── app/                    # App Router
│   ├── (site)/             # Layout công khai (header/footer)
│   │   ├── page.tsx        # Trang chủ dashboard
│   │   ├── matches/[id]/   # Chi tiết trận
│   │   ├── teams/[slug]/
│   │   ├── players/[slug]/
│   │   ├── leagues/[slug]/
│   │   ├── schedule/ results/ standings/
│   │   ├── news/ news/[slug]/
│   │   └── profile/
│   ├── (auth)/login register forgot-password reset-password verify-email
│   ├── admin/              # RBAC guard middleware
│   └── api/v1/             # REST API versioned
├── components/
│   ├── ui/                 # shadcn-style primitives
│   ├── layout/             # header, footer, nav
│   ├── sports/             # sport badges, filter bar
│   ├── matches/            # match cards, timeline, statistics
│   ├── teams/ players/ leagues/ news/ charts/ admin/
├── db/
│   ├── schema/             # Drizzle schema files theo domain
│   ├── index.ts            # pool singleton
│   └── seed.ts             # seed idempotent
├── lib/                    # utils thuần, env, seo
└── server/
    ├── auth/               # session, password, rbac, email tokens
    ├── repositories/       # data access (SQL, N+1-free)
    ├── services/          # business logic (cache-aware)
    ├── providers/          # SportsDataProvider + mock
    ├── live/               # match engine, SSE hub
    ├── jobs/              # queue + handlers + worker entry
    ├── cache/              # cache abstraction
    ├── http/               # api helpers: envelope, pagination, errors
    ├── search/             # search service (trigram)
    └── notify/             # notification service
```

## Module & dependency

- `route handler` → `service` → `repository` → `db`. Route không query trực tiếp.
- `service` có thể dùng `cache`, `providers`, `notify`, `jobs` (enqueue).
- UI server components gọi `service` trực tiếp (không tự fetch HTTP nội bộ).
- UI client components gọi `/api/v1/*` qua fetcher chuẩn + TanStack Query.

## Caching (TTL)

| Data | TTL | Invalidate |
|---|---|---|
| Live scores | 5s | engine tick |
| Schedule theo ngày | 5m | sync job |
| Standings | 5m | sau match finish |
| News list | 2m | publish/update |
| Search suggest | 10m | — |
| Match detail (finished) | 30m | admin edit |

- 2 lớp: Redis (chia sẻ giữa instances) + per-instance LRU (chặn thundering herd khi Redis rớt).
- Cache key chuẩn hoá: `v1:{entity}:{params-hash}`.

## Realtime

- Match engine (`server/live/engine.ts`): tick mỗi 5s — duyệt live matches (mock provider mô phỏng events), phát events vào hub.
- Hub (`server/live/hub.ts`): pub/sub in-process; khi có Redis dùng Redis pub/sub để multi-instance.
- SSE endpoint `/api/v1/live/stream?topics=match:123,home`: gửi `delta` messages (score, status, event, stats). Client merge incremental — không reload trang.
- Notification service listen hub → tạo notification cho users theo favorites → client refetch notification badge.

## Scalability path

1. **≤10k users**: 1 instance Next standalone + PG + Redis. Três enough.
2. **10k–100k**: horizontal — N app instances behind LB (stateless sessions trong PG; SSE hub qua Redis pub/sub), PG read replica (repositories hỗ trợ `replica` pool qua env), CDN cho static + ISR.
3. **100k–1M+**: tách API service, PG sharding theo `sport`/`season`, partition `matches` theo tháng, events → append-only + CDC, search → OpenSearch, live hub → dedicated service.

Không over-engineer phase 1: mọi đường nâng cấp đã có interface/switch (cache abstraction, queue abstraction, provider interface, DB pool replica-ready).

## Security architecture

- Password: Argon2id (memory 64MB). Session: cookie HttpOnly + SameSite=Lax + expiry 7d, rotate mỗi login. Store hash SHA-256 trong DB (rò DB không replay được cookie).
- RBAC: `user < moderator < admin`. Guard ở middleware `/admin` + check lại ở mọi admin API.
- Rate limit: IP + route, theo sliding window Redis/in-memory. Auth routes chặt hơn.
- CSRF: state-changing API yêu cầu same-origin (Origin check) + cookie SameSite.
- Validation: Zod mọi input. Drizzle parameterized → không SQL injection.
- IDOR: favorites/comments chỉ sửa theo `userId` từ session, không từ body.
- Secrets: `.env` (git-ignored), không bao giờ hard-code.
- Upload: admin-only, whitelist MIME + magic bytes + size limit + random filename.

## Observability

- Structured JSON logs (`server/logger.ts`) — mọi service/route log qua logger.
- `/health` (liveness), `/ready` (DB + cache check).
- Metrics counter in-process (`server/metrics.ts`): request latency, DB latency, cache hit ratio, provider latency — expose `/api/internal/metrics` (guard by `METRICS_TOKEN`) cho Prometheus scrape.
- Error boundary mọi page + `error.tsx` chuẩn.

## Race conditions / data integrity

- Dedupe matches: unique `(external_id, provider)`. Team/player dedupe theo slug.
- Standings recompute: row lock (`SELECT ... FOR UPDATE` trên season) tránh double-apply.
- Live engine single-writer: chỉ worker/leader tick (Redis lock `live:engine`); instance web chỉ đọc.
- Postponed/cancelled: status enum đầy đủ + check constraint; UI render đúng từng trạng thái.

# Sport Platform

Nền tảng thể thao hiện đại: tỷ số trực tiếp realtime (SSE), lịch thi đấu, kết quả, bảng xếp hạng, tin tức, tìm kiếm fuzzy, favorites + notifications, admin panel đầy đủ.

**Stack:** Next.js 15 (App Router, TS strict) · PostgreSQL 16+ (Drizzle ORM, pg_trgm) · Redis (optional) · TanStack Query · Tailwind · Recharts · Docker.

## Features

- ⚽ **6 môn thể thao**: bóng đá, bóng rổ, tennis, cầu lông, bóng chuyền, esports — 14 giải, 100+ đội, 700+ cầu thủ
- 🔴 **Live scores realtime** qua SSE (không reload, incremental deltas) — engine tick 5s, tự promote scheduled → live → finished
- 📅 Lịch thi đấu / Kết quả: filter theo môn, giải, ngày, đội, trạng thái
- 🏆 Bảng xếp hạng: form, movement indicator, previousPosition snapshot
- 📰 Tin tức: categories, breaking/featured, comments + spam moderation, bookmarks, share, SEO (JSON-LD, OG, sitemap)
- 🔍 Tìm kiếm toàn site: ⌘K command menu, trigram fuzzy ("man utd" → Manchester United), typo tolerance
- ❤️ Favorites → homepage "Your Sports" cá nhân hóa + notifications realtime khi trận sắp đấu
- 🛡️ Auth: Argon2id, session cookie HttpOnly, RBAC (user/moderator/admin), email verification
- ⚙️ Admin panel: dashboard stats, CRUD matches/news/users, moderation queue, audit log
- 🔄 Sports data **provider abstraction** — mock provider có sẵn, thay provider thật không sửa hệ thống (retry + circuit breaker + stale cache fallback)
- 🧰 Worker: 6 background jobs (sync, notify fanout, purge) — tách process, job_runs tracking

## Quickstart (Docker)

```bash
cp .env.example .env                 # set AUTH_SECRET (bắt buộc)
docker compose --profile setup up -d # db + redis + app + worker + nginx + migrate & seed
# mở http://localhost
```

Tài khoản demo (seed): `admin / admin12345` (admin), `user1 / user12345` (user).

## Quickstart (dev local, không Docker)

```bash
npm install
cp .env.example .env                 # trỏ DATABASE_URL tới PostgreSQL của bạn
npx drizzle-kit migrate              # schema + pg_trgm
npx tsx src/db/seed.ts                # seed 14 giải / 105 đội / 469 trận / 42 tin
npm run dev                           # http://localhost:3000
npm run worker                        # (optional tab khác) live engine + jobs
```

## Scripts

| Lệnh | Chức năng |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run worker` | Background worker (sync, notifications, live engine) |
| `npm run seed` | Seed dữ liệu demo (idempotent) |
| `npm run db:migrate` | Áp dụng migrations |
| `npm run verify` | typecheck + lint |
| `npm test` | Unit + integration tests |

## Tài liệu

| File | Nội dung |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Kiến trúc, luồng dữ liệu, scalability path |
| [API.md](./API.md) | REST API v1 đầy đủ + examples + error codes |
| [DATABASE.md](./DATABASE.md) | ERD, bảng, index rationale |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Single server → horizontal scaling, backup, runbook |
| [SECURITY.md](./SECURITY.md) | Threat checklist, bảo vệ đã có / kế hoạch |
| [TESTING.md](./TESTING.md) | Cách chạy unit / integration / E2E |
| [ENVIRONMENT.md](./ENVIRONMENT.md) | Mọi biến env + ý nghĩa |
| [WORKPLAN.md](./WORKPLAN.md) | Quá trình phát triển đa-agent, ownership, contracts |

## Cấu trúc chính

```
src/
├── app/            # (site) công khai · (auth) · admin/ · api/v1/
├── components/     # ui/ layout/ matches/ teams/ news/ search/ admin/...
├── db/            # Drizzle schema (28 bảng) + seed
├── lib/           # format, api-client, use-live (SSE hook)
└── server/        # auth/ repositories/ services/ providers/ live/ jobs/ cache/
```

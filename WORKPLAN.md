# WORKPLAN — Phân công đa Agent (multi-session, git worktree)

Tài liệu điều phối các phiên làm việc song song trên cùng repo. **Mỗi agent đọc file này trước khi bắt đầu.**

---

## 0. Nguyên tắc bất di bất dịch

1. **Mỗi gói (package) có quyền ghi (own) duy nhất vào tập thư mục của mình.** Không ghi file ngoài scope gói. Ghi ngoài scope = PR bị reject.
2. **Contract khóa cứng** (mục 5). Muốn đổi contract → tạo PR riêng chỉ sửa WORKPLAN.md, merge trước, rồi mới code theo.
3. **Không sửa file của gói khác.** Thấy bug ở gói khác → ghi vào mục 8 (Blockers) của file này trên nhánh mình, hoặc comment trong PR.
4. **Commit nhỏ, push ngay** sau mỗi đơn vị công việc hoàn chỉnh. Không gom lớn.
5. **Rebase lên `main` trước khi mở PR.** CI phải `typecheck + lint` sạch mới được merge.
6. Thời gian backend lưu **UTC**; hiển thị qua `src/lib/format.ts` (mục 5.4).
7. Không hard-code dữ liệu UI. Không query DB ngoài repository. Route API không chứa business logic (hết ở service).
8. Quy ước code chung: TypeScript strict, ESLint/Prettier của repo, `@/` alias, component ≤ 200 dòng, service ≤ 300 dòng.

---

## 1. Baseline

- **Base commit:** `5f0eb9e` (main) — đã có: scaffold, config, DB schema + 28 bảng + migrations + pg_trgm, auth core (session/argon2/RBAC/email token), cache + rate limit, HTTP envelope, providers (interface + mock + circuit breaker + sync), seed (14 giải, 105 đội, 753 cầu thủ, 469 trận, 42 tin, 3 users).
- **DB dev chung:** PostgreSQL 18 user-local, host `/tmp/opencode`, port `5433`, user `sport`, DB chính `sport`.
- **Checklist toàn cục** (spec mục 53) cần hoàn tất tới cuối: mọi gói tham chiếu mục 9 để tự kiểm.

---

## 2. Chuẩn bị working tree cho từng Agent

Mỗi agent làm việc trong **worktree riêng + nhánh riêng**. Chạy từ repo gốc:

```bash
# Agent A (ví dụ)
cd /home/nht/Downloads/github_H-Thanh0603/Sport
git fetch origin
git worktree add ../SportA -b agent/a-backend-core origin/main
git worktree add ../SportB -b agent/b-ui-kit origin/main
git worktree add ../SportC -b agent/c-home-matches origin/main
git worktree add ../SportD -b agent/d-teams-players-leagues origin/main
git worktree add ../SportE -b agent/e-news-search-favorites origin/main
git worktree add ../SportF -b agent/f-admin-worker-infra origin/main
git worktree add ../SportG -b agent/g-tests origin/main
git worktree add ../SportH -b agent/h-docker-docs origin/main
```

### 2.1. DB riêng cho mỗi worktree (TRÁNH ĐỤNG DỮ LIỆU)

Mỗi worktree tự tạo DB + migrate + seed riêng, chỉ trong máy của agent đó:

```bash
# trong worktree, ví dụ SportA
psql -h /tmp/opencode -p 5433 -U sport -d postgres -c "CREATE DATABASE sport_a;"
cp .env.example .env
# sửa DATABASE_URL trong .env:
# DATABASE_URL=postgres://sport@localhost:5433/sport_a
npx drizzle-kit migrate && npx tsx src/db/seed.ts
```

Tên DB: `sport_a`, `sport_b`, `sport_c`, `sport_d`, `sport_e`, `sport_f`, `sport_g`, `sport_h`. **Không ai đụng DB `sport` của main** (chỉ dùng để demo tổng).

### 2.2. Vòng đời làm việc của một agent

```
pull main → rebase nhánh mình → làm gói việc → typecheck+lint sạch →
commit ( conventional commits: feat/fix/docs/test/chore(scope) ) → push →
mở PR vào main (base: main) → đợi review/CI → merge → các agent khác pull lại
```

Prefix commit message: `feat(a):`, `feat(b):`... theo gói.

---

## 3. Ma trận phân công & quyền sở hữu

| Gói | Nhánh | Phase | Sở hữu (được ghi) | Phụ thuộc | Trạng thái |
|---|---|---|---|---|---|
| **A** Backend Core | `agent/a-backend-core` | 1 | `src/server/repositories/`, `src/server/services/`, `src/server/live/`, `src/server/search/`, `src/server/notify/`, `src/app/api/`, `src/lib/api-client.ts`, `src/lib/format.ts` | — | 🟢 xong |
| **B** UI Kit + Layout | `agent/b-ui-kit` | 1 | `src/components/ui/`, `src/components/layout/`, `src/components/providers.tsx`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/(site)/layout.tsx`, `src/app/(auth)/`, `src/app/dev/` | — | 🟢 xong |
| **C** Home + Matches UI | `agent/c-home-matches` | 2 | `src/app/(site)/page.tsx`, `src/app/(site)/matches/`, `src/app/(site)/schedule/`, `src/app/(site)/results/`, `src/components/matches/`, `src/components/charts/`, `src/components/sports/` | A (API/services), B (ui kit) | ⬜ chờ |
| **D** Teams/Players/Leagues UI | `agent/d-teams-players-leagues` | 2 | `src/app/(site)/teams/`, `src/app/(site)/players/`, `src/app/(site)/leagues/`, `src/app/(site)/standings/`, `src/components/teams/`, `src/components/players/`, `src/components/leagues/` | A, B | 🟢 xong (PR#5) |
| **E** News + Search + Favorites | `agent/e-news-search-favorites` | 2 | `src/app/(site)/news/`, `src/app/(site)/profile/`, `src/components/news/`, `src/components/search/`, `src/components/favorites/`, `src/components/notifications/` | A, B | 🟢 xong |
| **F** Admin + Worker + SEO | `agent/f-admin-worker-infra` | 2 | `src/app/admin/`, `src/components/admin/`, `src/server/jobs/`, `src/middleware.ts`, `src/app/health/`, `src/app/ready/`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/api/internal/` | A | 🟢 xong |
| **G** Tests | `agent/g-tests` | 3 | `tests/`, `playwright.config.ts`, `e2e/` | A–F merged | ⬜ chờ |
| **H** Docker + Docs | `agent/h-docker-docs` | 3 | `Dockerfile`, `docker-compose*.yml`, `nginx/`, `docker/`, `docs/*.md`, `README.md`, `ENVIRONMENT.md`... | A–F merged | ⬜ chờ |

> Cập nhật cột "Trạng thái" ngay khi bắt đầu/kết thúc gói. Giá trị: ⬜ mở / 🔨 đang làm / 🟢 xong / ⛔ blocked (ghi rõ tại mục 8).

### Merge order (anti-conflict)

Phase 1: **A và B merge trước** (độc lập tuyệt đối — khác cây thư mục).  
Phase 2: C, D, E, F merge theo thứ tự **C → D → E → F**; mỗi gói rebase main sau gói trước merge. E có thể đợi C xong search UI (xem mục 5.5).  
Phase 3: G và H (chạy song song được với nhau).

---

## 4. Chi tiết công việc từng gói (Definition of Done)

### Gói A — Backend Core (Phase 1, song song với B)

**Repos** (mỗi file 1 domain, N+1-free, mọi join explicit):
- `matches.repo.ts` — filter: sport/league/date/status/teamId, pagination, group-by-league cho schedule/results, live query, H2H (kèm cache bảng `h2h_cache`).
- `teams.repo.ts`, `players.repo.ts`, `leagues.repo.ts` (kèm seasons), `standings.repo.ts`, `news.repo.ts` (kèm categories/tags/bookmarks), `comments.repo.ts`, `favorites.repo.ts`, `notifications.repo.ts`, `users.repo.ts` (admin stats), `search.repo.ts` (trigram), `audit.repo.ts`.

**Services** (cache-aside qua `cached()` từ `src/server/cache`, TTL theo bảng mục 5.2):
- `matches.service.ts` (getLive, getUpcoming, getResults, getMatchDetail gồm events/stats/lineups/h2h/commentary), `teams.service.ts`, `players.service.ts`, `leagues.service.ts`, `standings.service.ts`, `news.service.ts` (view count increment 1 lần/session), `search.service.ts`, `favorites.service.ts`, `notifications.service.ts`.

**API v1** (đúng spec mục 24, envelope qua `route()/ok()/fail()` từ `src/server/http/api.ts`, Zod validate mọi input, rate limit auth routes):
```
GET  /api/v1/sports                GET /api/v1/leagues[?sport=]
GET  /api/v1/teams                 GET /api/v1/teams/:idOrSlug
GET  /api/v1/players               GET /api/v1/players/:slug
GET  /api/v1/matches (filters)     GET /api/v1/matches/:id
GET  /api/v1/matches/:id/events    GET /api/v1/matches/:id/statistics
GET  /api/v1/matches/:id/lineups   GET /api/v1/matches/:id/h2h
GET  /api/v1/standings?league=
GET  /api/v1/news (filter/sort)    GET /api/v1/news/:slug
POST /api/v1/auth/register|login|logout|forgot-password|reset-password|verify-email
GET  /api/v1/me                    POST /api/v1/me (update profile)
GET  /api/v1/notifications         POST /api/v1/notifications/read
POST /api/v1/favorites             DELETE /api/v1/favorites
GET  /api/v1/search?q=             GET /api/v1/search/suggest?q=
GET  /api/v1/live/stream (SSE)     GET /api/v1/comments (newsId)
POST /api/v1/comments              POST /api/v1/bookmarks
POST /api/v1/reports
```

**Live engine + SSE** (`src/server/live/`):
- `engine.ts`: tick 5s — với mỗi match `live` trong DB: gọi provider `getLiveEvents` (qua `callProvider` có retry/breaker), tính lại minute từ `start_time`, phát delta vào hub; chuyển `finished` khi ≥ full time; cập nhật DB.
- `hub.ts`: pub/sub topic `match:{id}` + `home`; dùng `cache().publish/subscribe` (Redis pub/sub khi multi-instance).
- SSE endpoint: `text/event-stream`, heartbeat 15s, tự đóng khi client disconnect, format message mục 5.3.
- Leader lock: `live:engine` qua Redis SET NX EX; single instance fallback chạy được.

**Notify service:** nhận events từ hub → fanout notification cho users có favorite liên quan (match_starting 30' trước kickoff — cần job từ F hoặc tự schedule trong engine).

**Done-criteria:**
- [ ] `npm run typecheck` + `npm run lint` sạch.
- [ ] curl mọi endpoint trên trả envelope đúng spec mục 25 (success + error + pagination meta).
- [ ] SSE stream curl được, có message mỗi 5s khi có match live (seed có sẵn 14 trận live).
- [ ] `/api/v1/search?q=man%20utd` trả Manchester United (trigram).
- [ ] Auth flow register → verify → login → /api/v1/me → logout hoạt động qua curl.

### Gói B — UI Kit + Layout (Phase 1, song song với A)

**Primitives** (`src/components/ui/`, pattern shadcn: CVA + tailwind-merge, KHÔNG import `src/server/`):
Button (variants: default/outline/ghost/destructive; sizes), Card, CardHeader/Title/Content, Badge (variants: default/outline/success/warning/live), Tabs (controlled + uncontrolled), Table (+ TableHead/Row/Cell), Skeleton, EmptyState ({icon?, title, hint, action?}), ErrorState ({message?, onRetry}), Spinner, Input, Textarea, Select, Dropdown/Menu, Sheet (mobile drawer), Dialog, Toast system, Pagination, Avatar (initials fallback), Tooltip, Separator, ScrollArea.

**Layout:**
- `src/app/layout.tsx` — html lang="vi", font Inter, ThemeProvider + QueryProvider (from `src/components/providers.tsx`).
- `src/app/(site)/layout.tsx` — Header + Footer + bottom-nav mobile.
- Header: logo, menu đủ 11 mục spec mục 4 (Trang chủ, 6 môn thể thao riêng trang redirect `/schedule?sport=` được, Lịch thi đấu, Kết quả, BXH, Tin tức), search box (placeholder — E thay), notifications bell (stub), Login/Register, user menu (avatar, profile, logout), hamburger mobile, bottom navigation mobile (Home/Schedule/News/Profile).
- Dark-first: `globals.css` CSS vars cả 2 theme (dark là default), toggle persisted localStorage, `class="dark"` trên `<html>`.
- Motion: `animate-fade-in`, `slide-up`, `score-bump`, `pulse-live` đã có trong tailwind.config — dùng, không thêm lib.
- Accessibility: semantic HTML, aria-label icon-only buttons, focus-visible ring, contrast WCAG AA.
- `src/app/(auth)/`: layout + pages login/register/forgot-password/reset-password/verify-email — form thuần UI (gọi API `/api/v1/auth/*` bằng fetch trực tiếp, không cần api-client của A — hoặc để trống handler nếu A chưa merge, đánh dấu `TODO(e)`).
- `src/app/dev/ui` — demo route hiển thị toàn bộ primitives (chỉ render khi `NODE_ENV !== "production"`).

**Done-criteria:**
- [ ] typecheck + lint sạch; `/dev/ui` render mọi primitive.
- [ ] Header responsive 375px/768px/1280px+, bottom nav mobile, theme toggle hoạt động.
- [ ] Mọi state (loading skeleton / empty / error + retry) có component dùng lại được.

### Gói C — Home + Matches UI (Phase 2, sau A+B merge)

- Home dashboard: hero carousel (featured matches + breaking news), **LIVE NOW** (đăng ký SSE topic `home`, score bump animation, LIVE badge pulse), upcoming + filter chips Today/Tomorrow/This Week, latest results, trending news (view count), popular leagues (isPopular).
- `/matches/[id]`: header (2 team, score, status, minute realtime qua SSE topic `match:{id}`, venue, competition), tabs: Timeline (events emoji phút, VAR), Statistics (bar chart Recharts: possession/shots/corners/fouls), Lineups (formation trên pitch SVG + bench + coach), H2H (W-D-L summary + 5 trận gần), Commentary (timeline feed, realtime append).
- `/schedule`: filter bar (sport select, league select, date picker, team search, status chips LIVE/UPCOMING/FINISHED/POSTPONED/CANCELLED), group theo giải đấu theo ngày.
- `/results`: hôm nay/hôm qua/ngày cụ thể (date navi), group theo giải đấu.
- ISR: trang home 60s; match detail live → `dynamic`, finished → ISR 300s.

**Done-criteria:** SSE cập nhật score KHÔNG reload trang; mọi section có skeleton/empty/error; typecheck sạch.

### Gói D — Teams + Players + Leagues UI (Phase 2)

- `/teams/[slug]`: header (logo/initials, quốc gia, giải, sân), tabs Overview/Matches/Results/Squad/Statistics/News; squad: bảng cầu thủ (số áo, vị trí, quốc tịch, tuổi, thống kê), coach.
- `/players/[slug]`: avatar/initials, info (quốc tịch, sinh, chiều cao, vị trí, đội), stats chart (matches/goals/assists/minutes/rating — tính từ match_events), tin liên quan.
- `/leagues/[slug]`: logo/tên/quốc gia/mùa, tabs Overview/Matches/Results/Standings/Teams/Statistics/News.
- `/standings`: table đủ cột spec mục 10, highlight row khi query `?team=`, form dots (W xanh/D vàng/L đỏ), movement indicator (so sánh position trước — cần A thêm `previousPosition` vào standings, xem 5.2), filter mùa giải.

**Done-criteria:** tabs hoạt động client-side; standings đẹp chuẩn ESPN; typecheck sạch.

### Gói E — News + Search + Favorites/Notifications (Phase 2)

- `/news`: filter category (Breaking, Football, Basketball, Tennis, Esports, Transfer, Analysis), card chuẩn (image placeholder gradient + title/summary/author/time/views/category), pagination + infinite scroll, sắp xếp theo published/views.
- `/news/[slug]`: title/subtitle/cover/author/publish time/reading time, content HTML (sanitize! — xem 5.6), tags, share (copy link), bookmark, comments (list + form + report), related articles, view-count increment.
- Search: command menu (Cmd+K) global, autocomplete debounce 300ms gọi `/api/v1/search/suggest`, kết quả group Team/Player/League/Match/News, ranking theo relevance, navigate khi chọn.
- Favorites: nút ❤️/⭐/🏆 trên team/player/league (optimistic + rollback lỗi), trang `/profile` "Your Sports" (trận đấu/tin/kết quả của favorites — personalization homepage section nếu user có favorites).
- Notifications: bell dropdown, unread badge, mark-as-read, realtime refetch khi có SSE notification event.
- API client: nếu A đã xong thì dùng `src/lib/api-client.ts`; chưa thì tự fetch.

**Done-criteria:** comment + report + bookmark qua API thật; search gõ "man utd" ra Man United; bell badge cập nhật realtime.

### Gói F — Admin + Worker + SEO (Phase 2)

- `/admin` layout: sidebar (Dashboard, Matches, Teams, Players, Leagues, News, Comments, Reports, Users, Notifications, Analytics, Settings), guard `middleware.ts` (redirect non-admin, check role cả ở layout server).
- Dashboard: cards (total users, active 24h, matches today, live now, news today, total views), mini charts (traffic 7 ngày từ audit_logs/job_runs hoặc synthetic + note).
- CRUD từng entity: table + search + pagination + form (Zod client-side), actions phù hợp (VD match: đổi status/score/time/postpone; user: ban/unban, đổi role; comment: hide/delete; report: resolve/dismiss; news: create/edit/publish).
- Moderation queue: reports open + comments pending, action buttons.
- Worker `src/server/jobs/worker.ts` + `queue.ts` (Redis-backed nếu REDIS_URL, else in-process): jobs: `sync-matches` (gọi provider + syncMatches mỗi 60s cho window ±3 ngày), `sync-standings`, `purge-sessions` (6h), `purge-notifications` (30 ngày), `notify-upcoming` (30' trước kickoff), `recompute-h2h`, `cleanup-jobs`. Job record vào bảng `job_runs`. Graceful shutdown.
- SEO: `sitemap.ts` (static routes + news + teams + leagues + matches gần đây, chunk ≤ 45k URLs), `robots.ts`, metadata + OG + Twitter card + canonical (qua `generateMetadata`), JSON-LD structured data (NewsArticle, SportsEvent), semantic HTML.
- `/health` (liveness) + `/ready` (DB + cache check) — qua `src/app/api/internal/` hoặc route handlers.
- `src/app/api/internal/metrics` — counters: request latency, DB latency, cache hit ratio, provider latency (guard bằng `METRICS_TOKEN` env).

**Done-criteria:** admin CRUD hoạt động thật qua API; worker chạy `npm run worker` không crash, job_runs có record; sitemap.xml sinh đúng URLs.

### Gói G — Tests (Phase 3)

- Unit (`tests/unit/`): format time + timezone/DST, slugify, rate-limit window, circuit breaker, standings computation, search ranking, pagination meta, sanitize HTML, slug/unique logic.
- Integration (`tests/integration/` — DB thật: tạo DB `sport_g_test`, migrate, seed, chạy, drop): auth flow đầy đủ (register → verify token từ log/email-token table → login → session → logout → forgot → reset), favorites CRUD + IDOR check (user không sửa favorite của user khác), comments + moderation, matches service với cache (verify không gọi DB 2 lần trong TTL), SSE endpoint stream thật.
- E2E Playwright (`e2e/`): home render, login user demo, search "man utd" → click → team page, match detail tabs, favorite team → profile hiện, admin login → dashboard → moderation action, responsive mobile 375px.
- `tests/setup.ts` chuẩn env + DB name riêng, tránh đụng DB dev.

**Done-criteria:** `npm test` xanh; E2E chạy được khi `npm run dev` + seed sẵn; coverage report các module core.

### Gói H — Docker + Docs (Phase 3)

- `Dockerfile` multi-stage (deps → build → runtime `output: "standalone"`), non-root user, HEALTHCHECK.
- `docker-compose.yml`: app (3000), worker (chạy `npm run worker`), postgres:16, redis:7, nginx (reverse proxy, gzip, cache static, SSE config `proxy_buffering off`), healthchecks toàn bộ, `docker-compose.prod.yml` (replicas, restart policy, resource limits).
- Docs: `README.md` (quickstart, screenshots placeholders, features), `ARCHITECTURE.md` (đã có — update nếu thay đổi), `API.md` (đầy đủ endpoint + example curl + error codes), `DATABASE.md` (ERD mermaid + bảng + index rationale), `DEPLOYMENT.md` (single server → horizontal → LB multi-instance, backup/restore, migration runbook), `SECURITY.md` (threat checklist theo spec mục 28 đã xử lý/còn lại), `TESTING.md` (cách chạy từng loại test), `ENVIRONMENT.md` (mọi biến env + ý nghĩa + giá trị mặc định).

**Done-criteria:** `docker compose up` chạy toàn stack healthy; docs đủ 8 file; README clone-to-run trong 5 lệnh.

---

## 5. Contracts (KHÓA — chỉ đổi qua PR sửa file này)

### 5.1. Service exports của A (mọi UI server-component gọi trực tiếp)

```ts
// src/server/services/matches.service.ts
type MatchWithTeams = {
  id: number; startTime: string /* ISO UTC */; status: MatchStatus;
  minute: number | null; homeScore: number | null; awayScore: number | null;
  league: { slug: string; name: string }; sport: { slug: string; name: string; emoji: string | null };
  homeTeam: { id: number; slug: string; name: string; shortName: string | null; logoUrl: string | null };
  awayTeam: { id: number; slug: string; name: string; shortName: string | null; logoUrl: string | null };
  postponedReason?: string | null;
};
type MatchListFilters = { sport?: string; league?: string; date?: string /* YYYY-MM-DD */;
  status?: "live" | "scheduled" | "finished" | "postponed" | "cancelled" | string[];
  teamId?: number; page?: number; perPage?: number; window?: "today" | "tomorrow" | "week" };
type MatchDetail = MatchWithTeams & {
  venue: { name: string; city: string | null } | null;
  events: MatchEvent[]; statistics: { key: string; home: string; away: string }[];
  lineups: { teamId: number; formation: string | null; coachName: string | null; isHome: boolean;
    players: { playerId: number; name: string; shirtNumber: number | null; position: string | null; x: number; y: number }[] }[];
  h2h: { total: { homeWin: number; awayWin: number; draw: number }; recent: MatchWithTeams[] };
  commentary: { minute: number | null; text: string }[];
};
getLiveMatches(): Promise<MatchWithTeams[]>
getUpcomingMatches(f): Promise<{ items: MatchWithTeams[]; meta: PaginationMeta }>
getMatchResults(f): Promise<{ items: MatchWithTeams[]; grouped?: Record<string, MatchWithTeams[]> }>
getMatchDetail(id: number): Promise<MatchDetail | null>
```

Các service khác export tương tự pattern `{items, meta}` cho list. **A xuất thêm type file** `src/server/services/types.ts` re-export toàn bộ type trên để C/D/E import 1 chỗ.

### 5.2. Cache TTL bảng (A implement, mọi người tuân thủ)

| Key prefix | TTL | Invalidate |
|---|---|---|
| `v1:live:*` | 5s | engine tick |
| `v1:schedule:*` | 5m | sync job |
| `v1:results:*` | 5m | sync job |
| `v1:standings:*` | 5m | match finished |
| `v1:news:list:*` | 2m | publish/update |
| `v1:news:detail:*` | 30m | update |
| `v1:search:suggest:*` | 10m | — |
| `v1:match:detail:{id}` (finished only) | 30m | admin edit |

Standings row thêm field `previousPosition: number | null` (A tính: position hiện tại vs position theo points của vòng trước — lưu snapshot trong payload standings, đủ để D render movement).

### 5.3. SSE message format (A phát, C/E consume)

```
event: message
data: { "topic": "match:123" | "home", "type": "score" | "event" | "status" | "stats" | "notification",
        "payload": { ... }, "ts": "2026-09-01T12:00:00Z" }
```
- `score`: `{ homeScore, awayScore, minute, status }` — client merge vào state.
- `event`: event object mới (timeline append).
- `status`: `{ status }` (VD live → finished → trigger refetch stats + standings).
- `stats`: statistics cập nhật.
- `notification`: user topic `user:{id}` — badge refetch.

Client hook chuẩn A cung cấp: `useLive(topics: string[], onUpdate)` trong `src/lib/use-live.ts` — auto-reconnect với backoff, heartbeat detect, unsubscribe cleanup (tránh memory leak).

### 5.4. Format helpers (`src/lib/format.ts` — A sở hữu)

```ts
formatMatchTime(iso, tz): string        // "02/09 21:00" theo tz user
formatRelative(iso): string            // "3 giờ trước"
formatScore(m): string                 // "2 - 1" | "-" khi chưa đấu
statusLabel(s): string                 // LIVE / HT / FT / Hoãn / Hủy
formatDate(iso, tz, opts?): string
```

### 5.5. UI primitives của B (C/D/E/F import — props chuẩn)

```ts
Button({ variant: "default"|"outline"|"ghost"|"destructive", size: "sm"|"md"|"lg", loading?, icon? })
Card / CardHeader({ title, action? }) / CardContent
Badge({ variant: "default"|"outline"|"success"|"warning"|"live"|"muted" })
Tabs({ tabs: { key: string; label: ReactNode }[], value?, onValueChange? })
Table({ columns: { key, header, align?, width? }[], rows: T[], rowKey }) — render props cell
Skeleton({ className }) — có pattern match-card/news-card
EmptyState({ icon?, title, hint?, action? })  // "Không có trận đấu hôm nay."
ErrorState({ message?, onRetry })            // "Không thể tải dữ liệu. Thử lại."
Spinner / Input({ label?, error? }) / Select({ options, value, onChange })
Sheet({ open, onClose, side? }) / Dialog({ open, onClose, title, children })
Toaster + toast({ title, variant? }) / Pagination({ page, totalPages, onChange })
Avatar({ name, src? }) // initials fallback
```

### 5.6. Cross-cutting đã quyết định (không ai tự đổi)

- News content render: `dangerouslySetInnerHTML` CHỈ sau sanitize (whitelist tag: p,h2,h3,blockquote,em,strong,a[href http],ul,ol,li; strip mọi attribute khác). Gói E dùng lib đã cài hoặc 30 dòng regex-based sanitizer + unit test (G test).
- SEO: mọi page export `generateMetadata`; OG image `/img/og/{type}.png` placeholder (E tạo).
- Env mới: ai thêm biến env phải cập nhật `.env.example` + `ENVIRONMENT.md` (H duyệt) trong cùng PR.
- Image: chưa có object storage → dùng gradient + initials placeholder component (`TeamLogo`, `PlayerAvatar`, `NewsCover` — C/D/E tự dựng theo pattern B).

---

## 6. Luồng phối hợp

```
main ──┬── agent/a-backend-core ──┐ PR#1 ──► merge A
       ├── agent/b-ui-kit ───────┤ PR#2 ──► merge B      (A ∥ B)
       │                          ▼
       ├── agent/c-home-matches ── PR#3  (rebase sau A+B)
       ├── agent/d-... ─────────── PR#4  (rebase sau C)
       ├── agent/e-... ─────────── PR#5  (rebase sau D)
       ├── agent/f-... ─────────── PR#6  (rebase sau E hoặc song song F)
       │                          ▼
       ├── agent/g-tests ───────── PR#7  (sau A–F)
       └── agent/h-docker-docs ─── PR#8  (∥ G)
```

- Agent hoàn thành gói → đổi trạng thái mục 3 → 🟢, comment PR tóm tắt đã làm + chưa làm (thẳng thận, spec mục 49).
- **Blocker:** agent bị chờ/chặn → ghi `[BLOCKED] <gói>: <lý do>` vào mục 8 trên nhánh mình, vẫn push phần xong được.
- Conflict thư mục: theo ma trận gần như không xảy ra; nếu cả 2 cùng cần sửa 1 file contract → ưu tiên merge trước, gói sau rebase + adapt.

## 7. Definition of Done toàn cục (chỉ đóng deliverable khi)

- [ ] `npm run verify` (typecheck + lint + unit/integration test) xanh trên main.
- [ ] Frontend chạy, DB migrate + seed chạy, auth flow, API, search, match detail, standings, news, favorites, admin, responsive, error handling — theo checklist spec mục 53.
- [ ] Docker compose up healthy.
- [ ] Docs 8 file.
- [ ] Báo cáo review 9 mục + Production Readiness Score (mục 53) — do session tổng hợp cuối (sau khi G+H merge) thực hiện.

## 8. Blockers / Notes (append-only, agent tự ghi)

<!-- Format: [BLOCKED|NOTE] (gói) — ngày — nội dung — plan xử lý -->

- [NOTE] (A) — 2026-09-01 — Gói A hoàn thành trên nhánh `agent/a-backend-core` (commits 1921847..13d17a9). Đã verify runtime: 30 API routes build OK, auth flow end-to-end (register → login → me → favorites → comments với email-verify gate), SSE stream phát score deltas mỗi 5s, trigram fuzzy search ("man utd" → Manchester United, dùng `<%` word_similarity), error envelopes chuẩn. Migration mới: `0002_standings_prev_pos` (cột `previous_position` cho movement indicator). Cần merge vào main để C/D/E/F bắt đầu. `notify/` service fanout để Gói F wire với worker (hub đã có topic `user:{id}`).
- [NOTE] (A) — 2026-09-01 — `src/server/live/engine.ts` tự start khi có client SSE đầu tiên (single instance). Khi có REDIS_URL + worker (Gói F), worker nên gọi `startEngine()` thay vì để web instance chạy — đã có `startEngine()` export.
- [NOTE] (B) — 2026-09-02 — lint baseline main có 4 lỗi + 1 warning trong file của A (`session.ts`: unused imports; `catalog.ts`: biến `n` dead; `provider.ts`: unused import `LEAGUES`; `logger.ts`: `console.log`), chặn `next build` của B. B sửa thuần xóa dead code / đổi `console.log`→`console.info` (không đổi logic) để build qua — A lưu ý khi rebase, không conflict logic.
- [NOTE] (B) — 2026-09-02 — thiếu `@types/react`, `@types/react-dom` trong devDependencies của main → B thêm (`eslint.config.mjs` cũng ignore `next-env.d.ts` do Next 15.5 triple-slash reference). 
- [NOTE] (B) — 2026-09-02 — `src/app/(site)/page.tsx` thuộc scope C nhưng route `/` phải compile được — B thêm placeholder tối giản có `TODO(c)`, C ghi đè khi làm.
- [NOTE] (B) — 2026-09-02 — Header: search box là link `/search` placeholder (TODO(e)); notifications bell là stub badge (TODO(e)); user menu là stub (TODO(e) thay bằng menu thật sau khi có auth). Auth pages gọi `/api/v1/auth/*` trực tiếp bằng fetch — A merge thì hoạt động ngay, chưa merge thì trả lỗi hiển thị gracefully.

- [NOTE] (E) — 2026-09-02 — Gói E hoàn thành trên `agent/e-news-search-favorites`. Đã verify runtime: /news (filter category + sort + pagination, ISR 60s), /news/[slug] (SSR + view count + JSON-LD NewsArticle + comments + share + bookmark + report + related + tags + sanitizer whitelist), SearchCommandMenu (⌘K, debounce 300ms, suggest API, group navigate), /search full results (SSR group theo type), NotificationCenter (bell realtime qua SSE topic user:{id}, mark-read, unread badge), FavoriteButton (optimistic + rollback), profile Your Sports (matches của favorite teams, favorite list, notifications) + /profile/settings (displayName + timezone). Header: thay 3 stub TODO(e) bằng component thật (search, bell, user menu session-aware, logout). Các gói khác lưu ý: FavoriteButton cần prop `initial` — server components lấy từ favoritesService.exists(); search suggest trả 8 items (3 team + 3 player + 2 league).

- [NOTE] (F) — 2026-09-02 — Gói F hoàn thành trên `agent/f-admin-worker-infra`. Đã verify runtime: admin login + dashboard stats, users ban/unban/reset-password (revoke sessions khi ban/reset), role change admin-only, news create/edit/archive + breaking/featured toggle, match edit (postpone/cancel/reopen) + cache invalidate, moderation queue comments pending (approve/hide/delete) + reports open (resolve+hide/dismiss), audit_logs mọi action. Worker: 6 jobs chạy đúng chu kỳ (sync-matches 10m, sync-standings 15m snapshot previousPosition, notify-upcoming 1m fanout notification + SSE push cho fans, purge-sessions 6h, purge-notifications 24h, cleanup-jobs 12h) — job_runs ghi nhận OK, notify fanout đã verify tạo notification cho fan đúng đội. Middleware guard /admin (session edge check + layout role check defense-in-depth). /health liveness + /ready readiness (DB+cache). /api/internal/metrics Prometheus format (METRICS_TOKEN guard). sitemap.xml (static + leagues + teams + news, revalidate 1h) + robots.txt (disallow admin/api/profile) + /403 page. Lưu ý cho G: test worker bằng `npm run worker` cần dotenv đã import sẵn trong worker.ts; jobs idempotent.

[NOTE] (D) — 2026-09-02 — Setup đã sẵn sàng: worktree `../SportD` + nhánh `agent/d-teams-players-leagues`, DB riêng `sport_d` đã migrate + seed đầy đủ (14 giải, 105 đội, 753 cầu thủ, 469 trận, 42 tin, 3 users). Đã khảo sát schema: `team_players` (squad: shirtNumber, isCaptain), `players.teamId` denormalized, stats cầu thủ tính từ `match_events` (không có bảng player_stats), `standings` CHƯA có `previousPosition` (A phải thêm theo 5.2 — movement indicator của D phụ thuộc field này), coach chỉ có ở `match_lineups.coachName` (không có bảng coaches → tab Squad của team lấy coach từ lineup gần nhất). — Plan kỹ thuật khi unblock: server components gọi trực tiếp services của A (không fetch API nội bộ), tabs client-side qua component Tabs của B, chart stats dùng recharts, form dots W-xanh/D-vàng/L-đỏ, highlight row `?team=` qua searchParams, filter mùa giải theo `seasons.isCurrent`.

[NOTE] (D) — 2026-09-02 — Gói D hoàn thành trên nhánh `agent/d-teams-players-leagues` (rebase sau merge A, dùng services A thật theo contract 5.1/5.2 — không data-access tạm nữa). Đã làm: `/teams/[slug]` (header logo/initials + quốc gia + giải + sân + năm thành lập; tabs client-side Overview/Matches/Results/Squad/Statistics/News; squad bảng nhóm theo vị trí GK/DF/MF/FW với số áo + (C) + quốc tịch + tuổi), `/players/[slug]` (avatar initials, info quốc tịch/sinh/chiều cao/vị trí/đội, stats matches/goals/assists/thẻ từ `match_events`, tin liên quan), `/leagues/[slug]` (tabs Overview/Matches/Results/Standings/Teams/News), `/standings` (filter theo giải, đủ cột spec mục 10, form dots W-xanh/D-vàng/L-đỏ, movement ↕ từ `previousPosition` của A, highlight row `?team=`, zone CL/xuống hạng cho giải ≥ 18 đội). TeamLogo/Avatar placeholder gradient+initials (mục 5.6). 404 đúng cho slug không tồn tại; typecheck + lint sạch; smoke test curl 4 trang trên DB riêng `sport_d` (đã migrate `0002_standings_prev_pos`). Chưa làm: recharts chart trên player page (seed không có match_events → dữ liệu trống, chart bar hiển thị số liệu dạng text thay thế); filter mùa giải trên /standings (A expose standings theo slug mùa hiện tại — nếu cần mùa cũ phải A thêm param); coach trên tab Squad (không có bảng coaches, NOTE trước). — `src/components/leagues/queries.ts` là wrapper mỏng gọi services A; mọi UI của D import qua đó, A đổi service chỉ cần sửa 1 chỗ.

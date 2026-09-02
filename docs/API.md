# API v1

Base URL: `{site}/api/v1`. REST, JSON envelope chuẩn:

```jsonc
// success
{ "success": true, "data": {}, "meta": { "pagination": { "page": 1, "perPage": 20, "total": 469, "totalPages": 24, "hasNext": true } } }
// error
{ "success": false, "error": { "code": "MATCH_NOT_FOUND", "message": "Match not found" } }
```

**Error codes phổ biến:** `VALIDATION_ERROR` (400, kèm `details` theo field), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `CSRF` (403), `NOT_FOUND` (404), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500).

**Auth:** session cookie `sport_session` (HttpOnly, SameSite=Lax). Các request đổi trạng thái (POST/DELETE) yêu cầu same-origin. Rate limit: auth 5–10 req/IP/h, comment 10 req/5p.

## Sports / Leagues / Standings

| Endpoint | Mô tả |
|---|---|
| `GET /sports` | Danh sách môn thể thao |
| `GET /leagues?sport=football` | Giải theo môn (kèm `popular=true` chỉ lấy phổ biến) |
| `GET /leagues/:slug` | Giải + teams + 10 trận gần |
| `GET /standings?league=premier-league` | BXH mùa hiện tại (kèm `previousPosition`, `form`) |

## Matches

| Endpoint | Mô tả |
|---|---|
| `GET /matches` | Filter: `sport, league, date (YYYY-MM-DD), status (lặp nhiều lần), teamId, window (today/tomorrow/week), mode (upcoming/results)` + `page, perPage` (max 50) |
| `GET /matches/:id` | Chi tiết đầy đủ: teams, score, venue, events, statistics, lineups, h2h, commentary |
| `GET /matches/:id/events` / `statistics` / `lineups` / `h2h` | Sub-resources |

```bash
curl "$BASE/api/v1/matches?status=live"
curl "$BASE/api/v1/matches?league=premier-league&date=2026-09-02"
```

## Live SSE

```
GET /api/v1/live/stream?topics=home,match:123,user:42
Content-Type: text/event-stream
```

Message format (incremental — client merge, không reload):

```jsonc
{ "topic": "match:123", "type": "score|event|status|stats|notification", "payload": { }, "ts": "..." }
```

Heartbeat 15s (`: ping`), retry hint 5s, tự reconnect client-side có backoff (hook `useLive`).

## News / Comments

| Endpoint | Mô tả |
|---|---|
| `GET /news?category=&sort=latest\|views&page=` | Tin đã publish |
| `GET /news/:slug` | Chi tiết + related |
| `GET /comments?newsId=` | Bình luận visible |
| `POST /comments` | `{newsId, content}` — cần login + email verified; spam heuristic → pending moderation |
| `POST /reports` | `{targetType: comment\|news, targetId, reason}` |

## Search

| Endpoint | Mô tả |
|---|---|
| `GET /search?q=man+utd&limit=5` | Trigram fuzzy — teams/players/leagues/news, ranked theo similarity |
| `GET /search/suggest?q=real` | Autocomplete nhẹ (8 gợi ý) |

## Auth

| Endpoint | Body | Ghi chú |
|---|---|---|
| `POST /auth/register` | `{email, username, displayName, password}` | Password ≥8 ký tự có chữ+số; issue verify token |
| `POST /auth/login` | `{identifier, password}` | identifier = email hoặc username; đăng sai trả chung 401 (không lộ email tồn tại) |
| `POST /auth/logout` | — | Hủy session |
| `POST /auth/forgot-password` | `{email}` | Luôn 200 (chống enumeration) |
| `POST /auth/reset-password` | `{token, password}` | Token single-use 1h; revoke mọi session sau reset |
| `POST /auth/verify-email` | `{token}` | Single-use 1h |
| `GET /me` | — | Session hiện tại |
| `POST /me` | `{displayName?, timezone?, avatarUrl?}` | Update profile |

## Favorites / Notifications / Bookmarks

| Endpoint | Mô tả |
|---|---|
| `GET /favorites` | Danh sách + hydrated teams |
| `POST /favorites` | `{type: team\|player\|league, targetId}` — toggle |
| `DELETE /favorites?type=&targetId=` | Xóa |
| `GET /notifications` | `{items, unread}` |
| `POST /notifications/read` | `{ids?}` — bỏ trống = đọc tất cả |
| `POST /bookmarks` / `DELETE /bookmarks?newsId=` | Lưu/bỏ tin |

## Admin (RBAC moderator/admin)

| Endpoint | Mô tả |
|---|---|
| `GET /admin/dashboard` | Stats cards + job runs + pending counts |
| `GET /admin/users?q=` / `POST /admin/users` | List + `{action: ban\|unban\|role\|reset-password}` (role: admin-only) |
| `GET /admin/matches?status=` / `POST /admin/matches` | List + edit `{matchId, status?, startTime?, homeScore?, awayScore?, postponedReason?}` |
| `GET /admin/news` / `POST /admin/news` / `DELETE /admin/news?newsId=` | CRUD (tạo: `{title, excerpt, content, categorySlug}`; patch: `{newsId, status?, isBreaking?, isFeatured?}`) |
| `GET /admin/comments?status=pending` / `POST /admin/comments` | Mod queue + `{commentId, action: approve\|hide\|delete}` |
| `GET /admin/reports?status=open` / `POST /admin/reports` | Report queue + `{reportId, action: resolve\|dismiss, hideTarget?}` |

Mọi admin action ghi `audit_logs`.

## Internal

| Endpoint | Mô tả |
|---|---|
| `GET /health` | Liveness — 200 khi process sống |
| `GET /ready` | Readiness — 503 khi DB không kết nối được |
| `GET /api/internal/metrics` | Prometheus text (guard `METRICS_TOKEN`, header `Authorization: Bearer`) |

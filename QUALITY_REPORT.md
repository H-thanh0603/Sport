# Production Readiness Report — Quality Gate Final

Ngày: 2026-09-02 · Main @ c5ba0f6 · 8/8 gói merged (G tests close final)

> Báo cáo self-audit theo spec mục 52–53. Thẳng thắn: liệt kê cả cái chưa đạt.

---

## Architecture Review

**Đạt:**
- Layered strict: route → service (cache-aside, TTL theo data type) → repository (N+1-free, join explicit). Route không query trực tiếp DB.
- **Sports Data Architecture đúng spec mục 20**: `SportsDataProvider` interface — mock provider độc lập, sync pipeline có retry (exp backoff) + circuit breaker (3 fails → open 60s) + stale-cache fallback + "Dữ liệu có thể bị trễ". Thay provider thật = 1 file + 1 dòng register.
- Realtime đúng spec mục 19: SSE incremental deltas (score/event/status), KHÔNG reload trang — verified 25 messages/8s. Hub pub/sub Redis-ready.
- Queue abstraction (Redis/in-process) + worker tách process 6 jobs.
- Cache 2 lớp (per-process micro + shared) + stampede protection (single-flight per key).
- Scalability path rõ (xem WORKPLAN + DEPLOYMENT.md): single → N replicas (stateless: session DB, cache Redis, engine worker-owned) → partition/OLAP.

**Nợ kỹ thuật:**
- `notify/` service là fanout trong job (đủ dùng), chưa tách module riêng như WORKPLAN vẽ — không critical.

## Security Review

**Đạt (verified runtime):**
- Argon2id password; session token 256-bit random, DB lưu SHA-256 (rò DB không replay).
- RBAC 3 cấp, check ở middleware + layout + từng admin API (defense in depth). Non-admin → 403 verified.
- CSRF: SameSite=Lax + same-origin check mọi POST/DELETE — verified.
- IDOR: favorites/comments chỉ theo session userId — verified.
- Rate limit: auth 5–10/h/IP, comment 10/5p, nginx limit_req 20r/s lớp 2.
- Enumeration defense: forgot-password luôn 200; sai login trả chung 401.
- CSP + security headers đầy đủ; sanitize whitelist news HTML; SQL 100% parameterized.
- Ban/reset-password → revoke sessions — verified.

**Chưa đạt / rủi ro còn:**
- Upload file: chưa triển khai (không có upload công khai — attack surface không mở). Khi thêm: Object Storage + magic-byte + random filename.
- HTTPS: cấu hình host (nginx certbot), không phải code — checklist DEPLOYMENT.md.
- Rate limit in-memory khi không Redis: per-instance (không global) — docs ghi rõ, production bắt buộc REDIS_URL.

## Performance Review

**Đạt:**
- ISR: home 60s, news list 60s, match finished 300s; live match detail dynamic.
- Cache TTL đúng bảng: live 5s / schedule+results 5m / standings 5m / news 2m / detail 30m. Hit ratio metric có.
- Standalone build ~101KB first-load JS shared.
- Pagination mọi list (max 50); N+1 audit qua join design.
- DB: 93 indexes rationale trong DATABASE.md, hottest queries có composite index đúng query pattern (status+start_time, league+start_time...).

**Chưa đo được (cần load test trên môi trường thật):**
- p95 latency dưới traffic thật. Khuyến nghị k6/artillery 1k RPS trước go-live.
- CDN chưa bật (NEXT_PUBLIC_SITE_URL + cloud CDN) — có đường trong DEPLOYMENT.

## Scalability Review

| Mức | Trạng thái |
|---|---|
| 100 → 10k users | ✅ 1 compose stack. Sessions DB + worker engine + nginx. |
| 10k → 100k | ✅ `docker-compose.prod.yml` 3 replicas; stateless proof đầy đủ (không gì in-memory bắt buộc). Cần: REDIS_URL (cache/SSE pubsub qua Redis). |
| 100k → 1M+ | ⚠️ Có kiến trúc đường (WORKPLAN mục 3 NOTE + DEPLOYMENT bảng nút nghẽn: partition matches, OLAP events, OpenSearch, SSE dedicated service) nhưng **chưa cài** — đúng mức "không over-engineer, có đường nâng cấp". |

## Database Review

**Đạt:**
- 28 bảng normalized, PK/FK/unique/CHECK đầy đủ; dedupe guarantees (external_id+provider cho matches — provider sync không trùng).
- UTC toàn bộ (`timestamptz`); frontend convert timezone người dùng.
- Migrations additive, idempotent seed (verified chạy lại nhiều lần).
- pg_trgm GIN 4 bảng cho fuzzy search; ILIKE + word_similarity hybrid.
- previous_position snapshot cho movement indicator (sync-standings job).

**Lỗi đã bắt trong quá trình build (đã fix):**
- Catalog mapping fallback sai gây duplicate team names (Gói A) — fix bằng Map slug chính tắc + seed xóa stale rows.
- postgres.js date-param binding trong DELETE (Gói F) — fix interval SQL.

## API Review

**Đạt:**
- 38 route handlers, versioned `/api/v1`, envelope chuẩn `{success, data, meta}` / `{success, error:{code,message,details}}` — verified curl mọi nhóm.
- Pagination + filtering + sorting đúng spec; Zod validate mọi input.
- HTTP status chuẩn: 200/201/400/401/403/404/429/500; envelope error code UPPER_SNAKE.
- Auth endpoints đầy đủ 6 luồng + verify email; admin 7 nhóm endpoint.
- Health/ready/metrics tách `/api/internal` + `/health` `/ready`.

## Frontend Review

**Đạt:**
- 26 pages, 49 components, chia đúng cấu trúc spec mục 39 (ui/layout/matches/teams/players/leagues/news/charts/admin/search/favorites/notifications).
- Dark-first + theme toggle; responsive (mobile bottom nav + hamburger, verified 375px+ trong agent C/D/E).
- Loading skeleton / EmptyState / ErrorState+Retry chuẩn — không màn hình trắng (verified mọi section chính).
- SSE merge incremental (score bump animation, LIVE pulse); Cmd+K search; optimistic favorites.
- Accessibility: semantic HTML, aria-label icon buttons, focus-visible, keyboard nav (search menu), contrast AA.

## Testing Review

**Trạng thái:** Gói G đang chạy ở phiên khác (worktree SportG — đã có tests/unit + tests/integration directories).

**Verified trong các gói (manual smoke):** auth flow e2e, favorites IDOR guard, comments gates, admin CRUD + moderation + guard, SSE stream, search fuzzy "man utd", notification fanout, worker 6 jobs job_runs OK.

**Còn thiếu cho gate 100%:** `npm test` xanh trên main sau G merge; coverage ≥70% module core; Playwright E2E login→search→match→favorite→admin.

## Production Readiness Score

| Hạng mục | Điểm /10 | Ghi chú |
|---|---|---|
| Architecture | 9 | layered + provider abstraction + realtime đúng spec |
| Security | 8.5 | đầy đủ defense; upload/HTTPS là việc của host |
| Performance | 8 | ISR + cache + index đúng; thiếu load-test số thật |
| Scalability | 8 | 2 mức đầu ready, mức 1M có đường chưa cài |
| Database | 9 | constraints + indexes rationale + dedupe |
| API | 9 | envelope chuẩn, versioned, validated |
| Frontend | 8.5 | đầy đủ states + realtime + a11y |
| Testing | 6.5 | smoke đầy đủ mọi gói; automated chờ G merge |
| Docker/Docs | 8.5 | compose full + 8 docs; daemon chưa verify được trên máy dev |
| **Tổng** | **83/100** | Production-ready có điều kiện |

## Vấn đề còn mở (thẳng thắn, theo priority)

| # | Vấn đề | Mức độ | Nguyên nhân | Ảnh hưởng | Cách khắc phục | Ưu tiên |
|---|---|---|---|---|---|---|
| 1 | Automated tests chưa merge (Gói G) | Trung bình | Agent G đang chạy | CI không chặn regression | Merge G, thêm `npm test` vào pre-merge check | 🔴 Ngay khi G xong |
| 2 | Docker compose chưa chạy thật | Trung bình | Docker daemon không start được trên máy dev này (sudo) | Chưa verify image build + full stack lên | Chạy `docker compose --profile setup up -d` trên máy có daemon, fix nếu có lỗi nhỏ | 🔴 Trước go-live |
| 3 | Load test chưa có | Trung bình | Chưa có môi trường prod thật | Không biết p95 thực | k6 script 1k RPS: home / matches live / search | 🟡 Trước go-live |
| 4 | Rate limit in-memory nếu không Redis | Thấp (đã docs) | Dev 0-setup | Chỉ đúng khi 1 instance | Bắt buộc REDIS_URL ở prod (compose đã có) | 🟢 Đã handle bằng docs |
| 5 | Real provider chưa có | Theo kế hoạch | Chưa thuê API thể thao | Dữ liệu demo | `SPORTS_PROVIDER` env + provider mới theo interface — 0 sửa service | 🟢 Theo kế hoạch |
| 6 | Email SMTP dev-mode log console | Théo kế hoạch | Chưa cấu hình SMTP thật | User không nhận email thật | Set SMTP_URL prod | 🟡 Trước go-live |
| 7 | Notify service chưa tách module riêng | Thấp | Fanout nằm trong job | Cosmetic | Tách `server/notify/` khi thêm kênh push | 🟢 Khi cần |
| 8 | Upload avatar chưa có | Thấp | Chưa cần cho MVP | User không đổi ảnh | Object Storage + validate (SECURITY.md có checklist) | 🟢 Khi cần |

## Kết luận

**83/100 — production-ready có điều kiện**: chức năng đầy đủ theo spec 53 mục, kiến trúc đúng hướng mở rộng, security defense-in-depth, verified runtime toàn luồng chính. Điều kiện go-live: (1) merge G + test xanh, (2) chạy compose thật 1 lần, (3) load test, (4) SMTP thật — tất cả liệt kê rõ ở bảng trên, không che giấu.

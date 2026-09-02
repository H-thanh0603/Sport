# Environment Variables

Sao chép từ `.env.example`. **Không commit `.env`.**

## Bắt buộc

| Biến | Mô tả | Mặc định |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (postgres.js format). VD: `postgres://user:pass@host:5432/sport` | — |
| `AUTH_SECRET` | Secret 64-hex cho hashing session (`openssl rand -hex 32`). Rotate 90 ngày. | — |

## Tùy chọn — platform

| Biến | Mô tả | Mặc định |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL công khai (SEO, sitemap, email links) | `http://localhost:3000` |
| `SPORTS_PROVIDER` | `mock` (dữ liệu demo tự sinh). Provider thật register tại `src/server/providers/index.ts`. | `mock` |
| `REDIS_URL` | Redis cho cache/queue/pubsub. **Bỏ trống** = in-process fallback (chỉ dùng dev/single-instance). | — |
| `LOG_LEVEL` | `debug \| info \| warn \| error` | `info` |
| `PG_POOL_MAX` | Max PG connections per process | `20` |
| `METRICS_TOKEN` | Bearer token guard `/api/internal/metrics`. Bỏ trống = metrics public (chỉ dev). | — |

## Tùy chọn — seed / bootstrap

| Biến | Mô tả | Mặc định |
|---|---|---|
| `ADMIN_EMAIL` | Email tài khoản admin (tạo bởi `npm run seed`) | `admin@sport.local` |
| `ADMIN_PASSWORD` | Mật khẩu admin ban đầu — **đổi ngay** sau lần login đầu | `change-me` |
| `ADMIN_USERNAME` | Username admin | `admin` |

## Tùy chọn — email

| Biến | Mô tả | Mặc định |
|---|---|---|
| `SMTP_URL` | SMTP connection (VD `smtp://user:pass@host:587`). **Bỏ trống** = dev mode: link verify/reset log ra console JSON. | — |
| `EMAIL_FROM` | From address khi gửi mail thật | `no-reply@sport.local` |

## Docker Compose thêm

| Biến | Mô tả | Mặc định |
|---|---|---|
| `POSTGRES_PASSWORD` | Password PG user trong compose | `sport` (chỉ dev!) |
| `HTTP_PORT` | Port nginx public | `80` |
| `APP_REPLICAS` | (prod) số app replicas | `3` |

## Quy tắc thêm biến mới

Ai thêm biến phải cập nhật `.env.example` + file này trong cùng PR (WORKPLAN mục 5.6).

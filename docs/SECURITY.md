# Security

## Đã triển khai

| Threat | Bảo vệ |
|---|---|
| **SQL Injection** | Drizzle parameterized 100%; raw SQL (`db.execute`) luôn bind param, không string concat |
| **XSS** | React escape mặc định; news content qua whitelist sanitizer (strip script/iframe/onclick/javascript:); CSP headers |
| **CSRF** | Cookie SameSite=Lax + same-origin check mọi state-changing route (POST/DELETE) |
| **Clickjacking** | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` |
| **IDOR** | Favorites/comments/bookmarks chỉ theo `userId` từ session, không từ body; admin routes check role từng request |
| **Auth bypass** | Session token random 256-bit, DB lưu SHA-256 hash (rò DB không replay được); revoke sessions khi ban/reset-password |
| **Brute force** | Rate limit sliding window: login 10/10p/IP, register 5/h, forgot 5/h, comment 10/5p; sai email/mật khẩu trả lỗi chung (không enumeration) |
| **Broken access control** | RBAC rank `user < moderator < admin`; middleware /admin + layout check (defense in depth); role change admin-only + không tự đổi |
| **Password storage** | Argon2id (RFC 9106 params) |
| **Secrets** | `.env` git-ignored; `.env.example` không chứa giá trị thật; compose yêu cầu AUTH_SECRET explicit |
| **File upload** | Chưa có upload công khai (admin-only qua Object Storage khi bật — xem kế hoạch) |
| **Rate limit bypass** | Limiter keyed theo IP (chuỗi X-Forwarded-For đầu tiên) + per-user cho comment; nginx `limit_req` lớp 2 (20r/s API, burst) |
| **SSRF** | Không có user-supplied URL fetch; provider URL từ env |
| **Privilege escalation** | Không thể tự ban/đổi role chính mình (guard trong API) |
| **Headers** | `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (camera/mic off), `poweredByHeader: false` |
| **Audit** | Mọi admin action ghi `audit_logs` (user, action, entity, metadata) |

## Checklist vận hành production

- [ ] `AUTH_SECRET` 64-hex random, rotate 90 ngày
- [ ] `POSTGRES_PASSWORD` mạnh, không dùng default `sport`
- [ ] HTTPS terminate tại nginx/LB (certbot hoặc cloud LB) — cookie tự `Secure` khi NODE_ENV=production
- [ ] `METRICS_TOKEN` set — metrics không public
- [ ] SMTP_URL set cho email thật (dev mode log link ra console)
- [ ] Enable `fail2ban` trên server theo log rate-limited 429

## Kế hoạch nâng cấp (chưa cần ở quy mô hiện tại)

- Object storage (S3/MinIO) + magic-byte validation + random filename cho upload avatar/logo
- 2FA TOTP cho role admin
- Session binding theo User-Agent + rotate token mỗi 24h
- WAF (cloud) trước nginx
- Pen-test định kỳ 6 tháng; dependency scan CI (`npm audit --production`)

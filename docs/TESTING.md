# Testing

Framework: **Vitest** (unit + integration). E2E: Playwright (Gói G — cấu hình trong `playwright.config.ts`).

## Chạy

```bash
npm test                # unit + integration (1 lần)
npm run test:watch      # watch mode
npm run test:coverage   # coverage v8 (src/lib + src/server)
npm run test:e2e        # Playwright (cần server đang chạy + seed sẵn)
```

## Cấu trúc

```
tests/
├── setup.ts           # env + DB test riêng (sport_g_test) — không đụng DB dev
├── unit/              # thuần logic, không I/O
│   ├── format.test.ts       # timezone/DST, relative time, score/status label
│   ├── sanitize.test.ts     # news HTML whitelist
│   ├── rate-limit.test.ts   # sliding window
│   ├── tokens.test.ts       # SHA-256, timing-safe compare
│   └── slug/catalog.test.ts # slugify + determinism
└── integration/       # DB thật (tạo → migrate → seed → chạy → drop)
    ├── auth.test.ts         # register → verify token → login → session → reset → revoke
    ├── favorites.test.ts    # CRUD + IDOR (user không đụng favorite của user khác)
    └── api.test.ts          # matches/news/search endpoint + cache TTL + envelope
```

## Convention

- DB integration: dùng DB tên `sport_g_test` (tạo/drop tự động trong setup), không bao giờ trỏ DB dev/prod.
- Mock provider determinism (seeded RNG) → kết quả test ổn định.
- SSE test: subscribe stream thật, assert nhận message trong 10s.

## Coverage target

Module core (`services`, `repositories`, `lib`): ≥70% dòng. E2E smoke phủ các luồng chính theo spec mục 33.

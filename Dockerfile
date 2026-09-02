# syntax=docker/dockerfile:1

# ─── deps ─────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ─── builder ─────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# dummy values for build-time env (runtime overrides via compose)
ARG DATABASE_URL=postgres://sport:sport@db:5432/sport
ARG AUTH_SECRET=dummy-secret-for-build-only
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV DATABASE_URL=$DATABASE_URL AUTH_SECRET=$AUTH_SECRET NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build

# ─── app runner (standalone Next.js) ─────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

# ─── worker runner (tsx + full src for jobs/seed) ─────
# Usage: docker build --target worker -t sport-worker .
FROM node:22-alpine AS worker
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/src ./src
COPY --from=builder --chown=node:node /app/drizzle ./drizzle
COPY --from=builder --chown=node:node /app/tsconfig.json /app/package.json /app/drizzle.config.ts ./
RUN addgroup -S nodejs && adduser -S worker -G nodejs && chown -R worker:nodejs /app
USER worker
# worker self-health: job_runs freshness checked externally (compose healthcheck)
CMD ["./node_modules/.bin/tsx", "src/server/jobs/worker.ts"]

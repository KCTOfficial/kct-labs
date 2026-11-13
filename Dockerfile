# KCT Labs — production image (Next.js 16 standalone + Payload 3, Postgres).
#
# No `# syntax=` directive on purpose: the engine's built-in Dockerfile frontend already supports
# everything used here (RUN --mount secret/cache, COPY --chown) and avoids pulling/running an
# external frontend image, which fails on some hosts (snap Docker, AppArmor, older engines).
#
# Targets:
#   runner   → the web app (default). Small image: standalone server + static assets only.
#   migrator → one-off container that runs `payload migrate` (needs full deps + source).
#
# Build (BuildKit required; the env file is mounted as a secret, never stored in a layer):
#   docker build --secret id=env,src=/srv/kct-labs/.env --target migrator -t kct-labs-migrator:<tag> .
#   docker build --secret id=env,src=/srv/kct-labs/.env --target runner   -t kct-labs:<tag> .
#
# NOTE: `next build` prerenders pages from the database, so the build needs network access to
# Postgres and the schema must already be migrated (deploy.sh runs migrations before this build).

ARG NODE_VERSION=22.23.4
ARG PNPM_VERSION=11.25.0

# ---------------------------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
# libc6-compat: required by some native deps (sharp, esbuild) on Alpine/musl.
RUN apk add --no-cache libc6-compat \
  && npm install -g pnpm@${PNPM_VERSION} \
  && npm cache clean --force
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ---------------------------------------------------------------------------------------------
# Dependencies: only re-run when the lockfile/manifest change (best layer caching).
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------------------------
# Migrator: full node_modules + source, no Next build. Runs `payload migrate` with runtime env.
FROM base AS migrator
ENV NODE_ENV=production
# --chown during COPY (a recursive RUN chown over node_modules would take minutes).
# Runs as the non-root `node` user that ships with the official image.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
USER node
CMD ["pnpm", "payload", "migrate"]

# ---------------------------------------------------------------------------------------------
# Builder: compiles the Next.js app (and postbuild next-sitemap → public/robots.txt, sitemap.xml).
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The env file is available only for this RUN (BuildKit secret). Next.js and next-sitemap both
# load `/app/.env` automatically. Next's standalone output COPIES .env files into
# .next/standalone, so they are deleted here and the build fails if any remain — secrets must
# never reach the runner image (runtime env comes from `env_file` in docker-compose.prod.yml).
RUN --mount=type=secret,id=env,target=/app/.env,required=true \
  pnpm run build \
  && rm -f /app/.next/standalone/.env /app/.next/standalone/.env.* \
  && if ls -A /app/.next/standalone | grep -q '^\.env'; then echo "env file leaked into standalone output" >&2; exit 1; fi

# ---------------------------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  PORT=3000 \
  HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Payload uploads (public/media) must survive redeploys → mounted as a volume at runtime.
# Created here with the right owner so an empty named volume inherits uid 1001.
RUN mkdir -p /app/public/media /app/.next/cache \
  && chown -R nextjs:nodejs /app/public/media /app/.next/cache
VOLUME ["/app/public/media"]

USER nextjs
EXPOSE 3000

# Liveness: a static file served by the Next server (no DB dependency → no restart storms
# when the database is briefly unavailable).
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/favicon.ico" || exit 1

CMD ["node", "server.js"]

#!/usr/bin/env bash
# =============================================================================================
# KCT Hub — deploy on the VPS (build happens in Docker on this machine).
#
#   ./deploy/deploy.sh            # pull latest code, migrate DB, build, deploy, health-check
#   ./deploy/deploy.sh rollback   # switch back to the previously deployed image (no rebuild)
#   ./deploy/deploy.sh status     # show current/previous tags and container health
#   ./deploy/deploy.sh start      # (re)start the currently recorded image (no pull/build/migrate)
#
# Overridable settings (env vars): see the CONFIG block below.
# Requirements on the VPS: git, docker (with BuildKit + compose v2 plugin), flock, curl.
# Intended to run as root on the VPS (the app container itself still runs as non-root uid 1001).
# A non-root user in the `docker` group also works.
# =============================================================================================
set -Eeuo pipefail

# ----------------------------------------------------------------------------- CONFIG
APP_NAME="${APP_NAME:-kct-hub}"
APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
BRANCH="${BRANCH:-}"                                  # default: branch currently checked out on the VPS
GIT_REMOTE="${GIT_REMOTE:-origin}"
ENV_FILE="${ENV_FILE:-${APP_DIR}/.env.prod}"          # production env (created on the server, not in git)
MEDIA_DIR="${MEDIA_DIR:-/srv/${APP_NAME}/media}"      # persistent Payload uploads
STATE_DIR="${STATE_DIR:-/srv/${APP_NAME}/state}"      # current/previous deployed tags
APP_PORT="${APP_PORT:-}"                              # public host port (default: PORT from ENV_FILE)
KEEP_IMAGES="${KEEP_IMAGES:-2}"                       # app images kept for rollback (disk is tight)
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-180}"               # seconds to wait for a healthy container
MIGRATE_TIMEOUT="${MIGRATE_TIMEOUT:-900}"             # seconds before a migration is considered hung
MIN_FREE_GB="${MIN_FREE_GB:-8}"                       # free disk required before building
FORCE_BUILD="${FORCE_BUILD:-0}"                       # 1 = rebuild even if the image exists
# The VPS also runs other containers: build-cache pruning is host-wide, so it is opt-in.
PRUNE_BUILD_CACHE="${PRUNE_BUILD_CACHE:-0}"           # 1 = also drop Docker build cache unused for 72h
PROJECT_LABEL="com.kct.project=${APP_NAME}"           # marks our images so cleanup never touches others
COMPOSE_FILE="${APP_DIR}/docker-compose.prod.yml"
LOCK_FILE="/tmp/${APP_NAME}-deploy.lock"
REQUIRED_ENV=(DATABASE_URL PAYLOAD_SECRET CRON_SECRET PREVIEW_SECRET NEXT_PUBLIC_SERVER_URL)

# ----------------------------------------------------------------------------- HELPERS
log()  { printf '\033[1;34m[%s]\033[0m %s\n' "$(date '+%H:%M:%S')" "$*"; }
warn() { printf '\033[1;33m[WARN]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[FAIL]\033[0m %s\n' "$*" >&2; exit 1; }
trap 'printf "\033[1;31m[FAIL]\033[0m line %s: %s\n" "$LINENO" "$BASH_COMMAND" >&2' ERR

compose() {
  IMAGE_TAG="$1" ENV_FILE="$ENV_FILE" MEDIA_DIR="$MEDIA_DIR" APP_PORT="$APP_PORT" \
    docker compose -p "$APP_NAME" -f "$COMPOSE_FILE" "${@:2}"
}

# Reads KEY from the env file without `source` (values may contain & ? $ etc.).
env_value() { grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }

# Public port: explicit APP_PORT, else PORT from the env file, else 3000. Rejects browser-blocked ports.
resolve_port() {
  [[ -f "$ENV_FILE" ]] || die "env file not found: $ENV_FILE"
  if [[ -z "$APP_PORT" ]]; then APP_PORT="$(env_value PORT)"; APP_PORT="${APP_PORT:-3000}"; fi
  [[ "$APP_PORT" =~ ^[0-9]+$ ]] || die "invalid port: $APP_PORT"
  case " 1 7 9 11 13 15 17 19 20 21 22 23 25 37 42 43 53 69 77 79 87 95 101 102 103 104 109 110 111 113 115 117 119 123 135 137 139 143 161 179 389 427 465 512 513 514 515 526 530 531 532 540 548 554 556 563 587 601 636 989 990 993 995 1719 1720 1723 2049 3659 4045 5060 5061 6000 6566 6665 6666 6667 6668 6669 6697 10080 " in
    *" $APP_PORT "*) die "port $APP_PORT is blocked by web browsers (ERR_UNSAFE_PORT) — choose another" ;;
  esac
}

# Shared host: refuse to start if another container/process owns our port or container name,
# instead of failing half-way through `compose up` (or hijacking someone else's container).
check_host_conflicts() {
  local name="${APP_NAME}-app" project others
  if docker inspect "$name" >/dev/null 2>&1; then
    project="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' "$name")"
    [[ "$project" == "$APP_NAME" ]] \
      || die "container '$name' exists but belongs to another stack ('$project') — set APP_NAME to a unique value"
  fi
  others="$(docker ps --filter "publish=${APP_PORT}" --format '{{.Names}}' | grep -vx "$name" || true)"
  [[ -z "$others" ]] \
    || die "port ${APP_PORT} is already published by: ${others//$'\n'/, } — pick a free PORT (and NEXT_PUBLIC_SERVER_URL) in $ENV_FILE"
  if [[ -z "$(docker ps -q --filter "publish=${APP_PORT}" --filter "name=^${name}$")" ]] \
    && command -v ss >/dev/null && [[ -n "$(ss -ltnH "( sport = :${APP_PORT} )")" ]]; then
    die "port ${APP_PORT} is in use by a host process — check: ss -ltnp '( sport = :${APP_PORT} )'"
  fi
}

current_tag()  { cat "$STATE_DIR/current_tag" 2>/dev/null || true; }
previous_tag() { cat "$STATE_DIR/previous_tag" 2>/dev/null || true; }

wait_healthy() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT)) status
  while (( SECONDS < deadline )); do
    status="$(docker inspect -f '{{.State.Health.Status}}' "${APP_NAME}-app" 2>/dev/null || echo missing)"
    case "$status" in
      healthy) return 0 ;;
      unhealthy) return 1 ;;
    esac
    sleep 3
  done
  return 1
}

smoke_test() {
  local path code
  # `/id/...` is a 308 redirect since Indonesian became the default locale; `/en` serves English.
  for path in / /en /apps /apps-sitemap.xml /robots.txt; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "http://127.0.0.1:${APP_PORT}${path}" || echo 000)"
    [[ "$code" == "200" ]] || { warn "smoke test ${path} → HTTP ${code}"; return 1; }
    log "smoke ${path} → 200"
  done
}

switch_to() {
  local tag="$1"
  docker image inspect "${APP_NAME}:${tag}" >/dev/null 2>&1 || die "image ${APP_NAME}:${tag} not found"
  log "starting ${APP_NAME}:${tag}"
  compose "$tag" up -d --remove-orphans --force-recreate
}

record_deploy() {
  local new="$1" old
  old="$(current_tag)"
  if [[ -n "$old" && "$old" != "$new" ]]; then echo "$old" > "$STATE_DIR/previous_tag"; fi
  echo "$new" > "$STATE_DIR/current_tag"
  echo "$(date -Iseconds) ${new}" >> "$STATE_DIR/history.log"
}

cleanup_images() {
  local keep_current keep_previous
  keep_current="$(current_tag)"; keep_previous="$(previous_tag)"
  # App + migrator images, newest first; keep the N newest plus current/previous.
  # App images: keep the newest KEEP_IMAGES plus current/previous (for rollback).
  docker image ls "$APP_NAME" --format '{{.Tag}}' | tail -n +"$((KEEP_IMAGES + 1))" | while read -r tag; do
    [[ "$tag" == "$keep_current" || "$tag" == "$keep_previous" ]] && continue
    docker image rm "${APP_NAME}:${tag}" >/dev/null 2>&1 && log "removed ${APP_NAME}:${tag}" || true
  done
  # Migrator images (~1.6 GB each) are only needed during a deploy: keep the current one only.
  docker image ls "${APP_NAME}-migrator" --format '{{.Tag}}' | while read -r tag; do
    [[ "$tag" == "$keep_current" ]] && continue
    docker image rm "${APP_NAME}-migrator:${tag}" >/dev/null 2>&1 && log "removed ${APP_NAME}-migrator:${tag}" || true
  done
  # Shared host: only dangling images built by this project (other stacks are left alone).
  docker image prune -f --filter "label=${PROJECT_LABEL}" >/dev/null
  if [[ "$PRUNE_BUILD_CACHE" == "1" ]]; then
    log "pruning Docker build cache unused for 72h (host-wide)"
    docker builder prune -f --filter 'until=72h' >/dev/null || true
  fi
  log "disk free: $(df -h --output=avail "$APP_DIR" | tail -1 | tr -d ' ')"
}

# ----------------------------------------------------------------------------- PREFLIGHT
preflight() {
  for cmd in git docker flock curl; do
    command -v "$cmd" >/dev/null || die "missing command: $cmd"
  done
  docker compose version >/dev/null 2>&1 || die "docker compose v2 plugin is required"
  docker info >/dev/null 2>&1 || die "cannot talk to Docker (is the daemon running? run as root or a user in the docker group)"

  [[ -f "$ENV_FILE" ]] || die "env file not found: $ENV_FILE"
  [[ -f "$COMPOSE_FILE" ]] || die "compose file not found: $COMPOSE_FILE"
  if [[ "$(stat -c '%a' "$ENV_FILE")" != "600" && "$(stat -c '%a' "$ENV_FILE")" != "400" ]]; then
    warn "$ENV_FILE should be chmod 600 (contains secrets)"
  fi
  # Only value lines count — the file's comments mention CHANGE_ME in the legend.
  grep -vE '^[[:space:]]*#' "$ENV_FILE" | grep -q 'CHANGE_ME' \
    && die "$ENV_FILE still contains CHANGE_ME placeholders"
  grep -q $'\r' "$ENV_FILE" && die "$ENV_FILE has Windows line endings (CRLF) — run: sed -i 's/\\r$//' $ENV_FILE"
  local key value
  for key in "${REQUIRED_ENV[@]}"; do
    value="$(env_value "$key")"
    [[ -n "$value" ]] || die "$key is empty in $ENV_FILE"
  done
  value="$(env_value NEXT_PUBLIC_SERVER_URL)"
  [[ "$value" =~ ^https?://[^/]+$ ]] || die "NEXT_PUBLIC_SERVER_URL must be http(s)://host[:port] without trailing slash (got: $value)"
  [[ "$value" == http://* ]] && warn "NEXT_PUBLIC_SERVER_URL uses plain HTTP — move to a domain + HTTPS for production SEO/security"
  resolve_port
  if [[ "$value" =~ :([0-9]+)$ && "${BASH_REMATCH[1]}" != "$APP_PORT" ]]; then
    die "port in NEXT_PUBLIC_SERVER_URL (${BASH_REMATCH[1]}) != published port ($APP_PORT)"
  fi
  check_host_conflicts
  [[ "$(env_value DISALLOW_INDEXING)" == "true" ]] && warn "DISALLOW_INDEXING=true → site will be NOINDEX (ok only for staging)"
  # A malformed ID silently disables Google Analytics, so surface it (warn, not die: analytics must never block a deploy).
  value="$(env_value NEXT_PUBLIC_GA_MEASUREMENT_ID)"
  [[ -z "$value" || "$value" =~ ^G-[A-Za-z0-9]{6,14}$ ]] || warn "NEXT_PUBLIC_GA_MEASUREMENT_ID must look like G-XXXXXXXXXX (got: $value) → Google Analytics will be DISABLED"

  # Images and build layers live in Docker's root dir, which may be on another disk than the repo.
  local free_gb docker_root run_free_mb run_free_inodes
  docker_root="$(docker info -f '{{.DockerRootDir}}' 2>/dev/null || echo /var/lib/docker)"
  free_gb="$(df -BG --output=avail "$docker_root" | tail -1 | tr -dc '0-9')"
  (( free_gb >= MIN_FREE_GB )) \
    || die "only ${free_gb}GB free in $docker_root, need ${MIN_FREE_GB}GB to build (check: docker system df; PRUNE_BUILD_CACHE=1 frees old build cache)"
  # runc needs space in the /run tmpfs for every container it starts (incl. each build step);
  # when it is full, builds fail with "mkdir /run/runc: no space left on device".
  run_free_mb="$(df -BM --output=avail /run | tail -1 | tr -dc '0-9')"
  run_free_inodes="$(df --output=iavail /run | tail -1 | tr -dc '0-9')"
  (( run_free_mb >= 50 && run_free_inodes >= 1000 )) \
    || die "/run is full (${run_free_mb}MB, ${run_free_inodes} inodes free) — check: df -h /run; df -i /run; du -xsh /run/* | sort -h"

  mkdir -p "$STATE_DIR" "$MEDIA_DIR"
  if [[ "$(stat -c '%u' "$MEDIA_DIR")" != "1001" ]]; then
    die "$MEDIA_DIR must be owned by uid 1001 (container user). Run once: chown -R 1001:1001 $MEDIA_DIR"
  fi
}

# ----------------------------------------------------------------------------- COMMANDS
cmd_status() {
  echo "current : $(current_tag)"
  echo "previous: $(previous_tag)"
  docker ps --filter "name=${APP_NAME}-app" --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
}

cmd_rollback() {
  resolve_port
  check_host_conflicts
  local prev; prev="$(previous_tag)"
  [[ -n "$prev" ]] || die "no previous deployment recorded"
  warn "rolling back to ${prev}. Database migrations are NOT reverted (they must be backward compatible)."
  switch_to "$prev"
  wait_healthy || die "rollback image is not healthy — check: docker logs ${APP_NAME}-app"
  smoke_test || die "rollback smoke test failed"
  local cur; cur="$(current_tag)"
  echo "$prev" > "$STATE_DIR/current_tag"; echo "$cur" > "$STATE_DIR/previous_tag"
  echo "$(date -Iseconds) rollback ${prev}" >> "$STATE_DIR/history.log"
  log "rollback complete → ${prev}"
}

# Starts the recorded current image again — e.g. after the one-time kct-labs → kct-hub rename
# (deploy/migrate-from-kct-labs.sh) or after the container was removed by hand.
cmd_start() {
  resolve_port
  check_host_conflicts
  local cur; cur="$(current_tag)"
  [[ -n "$cur" ]] || die "no deployment recorded in $STATE_DIR — run a full deploy instead"
  switch_to "$cur"
  wait_healthy || die "image ${cur} is not healthy — check: docker logs ${APP_NAME}-app"
  smoke_test || die "smoke test failed for ${cur}"
  echo "$(date -Iseconds) start ${cur}" >> "$STATE_DIR/history.log"
  log "started → ${cur}"
}

cmd_deploy() {
  preflight
  cd "$APP_DIR"

  # 1. Source code ----------------------------------------------------------------------------
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "$APP_DIR is not a git checkout"
  [[ -n "$BRANCH" ]] || BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  [[ "$BRANCH" != "HEAD" ]] || die "detached HEAD — set BRANCH=<branch> explicitly"
  [[ -z "$(git status --porcelain --untracked-files=no)" ]] || die "working tree has local changes on the VPS — commit/stash them first"
  log "fetching ${GIT_REMOTE}/${BRANCH}"
  git fetch --prune "$GIT_REMOTE"
  git checkout -q "$BRANCH"
  git pull --ff-only "$GIT_REMOTE" "$BRANCH"
  local tag; tag="$(git rev-parse --short=12 HEAD)"
  log "deploying commit ${tag}: $(git log -1 --pretty=%s)"

  export DOCKER_BUILDKIT=1
  local build_args=(--secret "id=env,src=${ENV_FILE}" --label "org.opencontainers.image.revision=${tag}" --label "$PROJECT_LABEL" .)

  # 2. Migrations FIRST: `next build` reads the database, so the schema must be current. --------
  if [[ "$FORCE_BUILD" == "1" ]] || ! docker image inspect "${APP_NAME}-migrator:${tag}" >/dev/null 2>&1; then
    log "building migrator image"
    docker build --target migrator -t "${APP_NAME}-migrator:${tag}" "${build_args[@]}"
  fi
  # `payload migrate` waits forever on a y/N prompt when the DB still has the dev-push marker
  # (batch -1, e.g. after restoring a dev backup) → detect it non-interactively first.
  log "checking migration state"
  local rc=0
  docker run --rm --env-file "$ENV_FILE" "${APP_NAME}-migrator:${tag}"     pnpm payload run scripts/migration-preflight.ts </dev/null || rc=$?
  case "$rc" in
    0) ;;
    3) die "DB contains the dev-push marker (payload_migrations.batch = -1). Run the post-restore SQL in docs/DEPLOYMENT.md (C.4), then re-run." ;;
    4) die "DB migration history says the schema exists but table \"apps\" is missing — the DB was not restored from dev. See docs/DEPLOYMENT.md (G, 'schema mismatch')." ;;
    *) die "migration preflight failed (exit $rc) — is the database reachable from the VPS?" ;;
  esac

  log "running database migrations"
  # stdin from /dev/null + timeout: never hang the pipeline on an unexpected prompt.
  if ! timeout --kill-after=30 "$MIGRATE_TIMEOUT"       docker run --rm --name "${APP_NAME}-migrate" --env-file "$ENV_FILE" "${APP_NAME}-migrator:${tag}" </dev/null; then
    docker rm -f "${APP_NAME}-migrate" >/dev/null 2>&1 || true
    die "migrations failed or timed out — app NOT redeployed (current version keeps running)"
  fi

  # 3. Build the app image -----------------------------------------------------------------------
  if [[ "$FORCE_BUILD" == "1" ]] || ! docker image inspect "${APP_NAME}:${tag}" >/dev/null 2>&1; then
    log "building app image ${APP_NAME}:${tag}"
    docker build --target runner -t "${APP_NAME}:${tag}" "${build_args[@]}"
  else
    log "image ${APP_NAME}:${tag} already exists (FORCE_BUILD=1 to rebuild)"
  fi

  # 4. Switch + verify (auto-rollback on failure) ------------------------------------------------
  local prev; prev="$(current_tag)"
  switch_to "$tag"
  if wait_healthy && smoke_test; then
    record_deploy "$tag"
    log "deploy OK → ${tag}"
  else
    warn "new version failed health/smoke checks — last logs:"
    docker logs --tail 80 "${APP_NAME}-app" >&2 || true
    if [[ -n "$prev" && "$prev" != "$tag" ]]; then
      warn "rolling back to ${prev}"
      switch_to "$prev"
      wait_healthy && smoke_test && die "deploy of ${tag} failed; rolled back to ${prev}"
    fi
    die "deploy of ${tag} failed and no healthy previous version is available"
  fi

  # 5. Housekeeping ------------------------------------------------------------------------------
  cleanup_images
  cmd_status
}

# ----------------------------------------------------------------------------- MAIN
exec 9>"$LOCK_FILE"
flock -n 9 || die "another deploy is already running ($LOCK_FILE)"

case "${1:-deploy}" in
  deploy)   cmd_deploy ;;
  rollback) cmd_rollback ;;
  status)   cmd_status ;;
  start)    cmd_start ;;
  *)        die "usage: $0 [deploy|rollback|status|start]" ;;
esac

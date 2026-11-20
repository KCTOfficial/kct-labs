#!/usr/bin/env bash
# =============================================================================================
# One-time server migration for the KCT Labs → KCT Hub rename (run as root on the VPS).
#
# Moves the Docker/runtime identity from "kct-labs" to "kct-hub" without rebuilding and with
# only a few seconds of downtime:
#   1. retags the deployed images  kct-labs:<tag> → kct-hub:<tag>  (rollback keeps working)
#   2. stops/removes the old container kct-labs-app (frees the public port)
#   3. moves the data dir          /srv/kct-labs → /srv/kct-hub   (media + deploy state)
#   4. starts the same image as    kct-hub-app   (./deploy/deploy.sh start, with health check)
#   5. only after success: removes the old image tags, old migrator images and old network
#
# Prerequisite: the repo folder is already renamed and up to date, e.g.
#   mv /root/projects/kct-labs /root/projects/kct-hub && cd /root/projects/kct-hub && git pull
# Usage:  ./deploy/migrate-from-kct-labs.sh
# Idempotent: re-running after a successful migration only reports "already migrated".
# The database is NOT touched (see docs/DEPLOYMENT.md for the optional DB rename).
# =============================================================================================
set -Eeuo pipefail

OLD_NAME="${OLD_NAME:-kct-labs}"
NEW_NAME="${NEW_NAME:-kct-hub}"
OLD_DATA="${OLD_DATA:-/srv/${OLD_NAME}}"
NEW_DATA="${NEW_DATA:-/srv/${NEW_NAME}}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log()  { printf '\033[1;34m[%s]\033[0m %s\n' "$(date '+%H:%M:%S')" "$*"; }
warn() { printf '\033[1;33m[WARN]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[FAIL]\033[0m %s\n' "$*" >&2; exit 1; }

for cmd in docker flock; do command -v "$cmd" >/dev/null || die "missing command: $cmd"; done
docker info >/dev/null 2>&1 || die "cannot talk to Docker (run as root)"

# A deploy under the old name must not be running while we move its state.
exec 8>"/tmp/${OLD_NAME}-deploy.lock"
flock -n 8 || die "a ${OLD_NAME} deploy is running — wait for it to finish"

if [[ -d "$NEW_DATA" && ! -e "$OLD_DATA" ]]; then
  log "already migrated: $NEW_DATA exists and $OLD_DATA is gone — nothing to do"
  exit 0
fi
[[ -e "$NEW_DATA" ]] && die "both $OLD_DATA and $NEW_DATA exist — inspect them and merge manually"

current=""; previous=""
if [[ -d "$OLD_DATA" ]]; then
  current="$(cat "$OLD_DATA/state/current_tag" 2>/dev/null || true)"
  previous="$(cat "$OLD_DATA/state/previous_tag" 2>/dev/null || true)"
fi
log "old data: ${OLD_DATA} (exists: $([[ -d "$OLD_DATA" ]] && echo yes || echo no)); current=${current:-none} previous=${previous:-none}"

# 1. Retag (non-destructive: both names point at the same image until step 5).
for tag in "$current" "$previous"; do
  [[ -n "$tag" ]] || continue
  if docker image inspect "${OLD_NAME}:${tag}" >/dev/null 2>&1; then
    docker tag "${OLD_NAME}:${tag}" "${NEW_NAME}:${tag}"
    log "tagged ${OLD_NAME}:${tag} → ${NEW_NAME}:${tag}"
  else
    warn "image ${OLD_NAME}:${tag} not found — rollback to it will not be possible"
  fi
done

# 2. Stop the old container (downtime starts here when something was deployed).
if docker inspect "${OLD_NAME}-app" >/dev/null 2>&1; then
  log "removing old container ${OLD_NAME}-app"
  docker rm -f "${OLD_NAME}-app" >/dev/null
fi

# 3. Move media + deploy state (same filesystem → atomic rename, ownership uid 1001 preserved).
if [[ -d "$OLD_DATA" ]]; then
  mv "$OLD_DATA" "$NEW_DATA"
  log "moved $OLD_DATA → $NEW_DATA"
else
  mkdir -p "$NEW_DATA/media" "$NEW_DATA/state"
  chown -R 1001:1001 "$NEW_DATA/media"
  log "created $NEW_DATA (nothing was deployed before)"
fi

# 4. Start the same image under the new name.
if [[ -n "$current" ]]; then
  if ! "$APP_DIR/deploy/deploy.sh" start; then
    die "new container failed to start. Data is in $NEW_DATA and the image is ${NEW_NAME}:${current}.
       Check: docker logs ${NEW_NAME}-app ; fix and retry: ./deploy/deploy.sh start
       To revert to the old name: mv $NEW_DATA $OLD_DATA and redeploy the previous repo revision."
  fi
fi

# 5. Cleanup of the old identity (only reached on success).
for tag in "$current" "$previous"; do
  [[ -n "$tag" ]] || continue
  docker image rm "${OLD_NAME}:${tag}" >/dev/null 2>&1 && log "untagged ${OLD_NAME}:${tag}" || true
done
docker image ls "${OLD_NAME}-migrator" --format '{{.Repository}}:{{.Tag}}' | while read -r ref; do
  docker image rm "$ref" >/dev/null 2>&1 && log "removed $ref" || true
done
docker network rm "${OLD_NAME}_default" >/dev/null 2>&1 && log "removed network ${OLD_NAME}_default" || true

log "migration done. Next deploys: cd $APP_DIR && ./deploy/deploy.sh"
[[ -n "$current" ]] || log "nothing was running before — run a full deploy now: ./deploy/deploy.sh"

#!/usr/bin/env bash

set -euo pipefail

APP_NAME="${APP_NAME:-monitoring_order_lite}"
REMOTE="${REMOTE:-origin}"
BRANCH="${BRANCH:-master}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

fail() {
  printf '\n[ERROR] %s\n' "$1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Command '$1' tidak ditemukan."
}

require_cmd git
require_cmd npm
require_cmd pm2

cd "$ROOT_DIR"

# If the file was pulled from a Windows machine without exec bit preserved,
# this makes future runs work after invoking it once with `bash deploy.sh`.
chmod +x "$0" 2>/dev/null || true

log "Deploy dimulai di $ROOT_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  fail "Working tree tidak bersih. Commit/stash dulu sebelum deploy."
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
  fail "Branch aktif '$CURRENT_BRANCH', expected '$BRANCH'."
fi

log "Fetch update dari $REMOTE/$BRANCH"
git fetch "$REMOTE" "$BRANCH" --prune

LOCAL_HEAD="$(git rev-parse HEAD)"
REMOTE_HEAD="$(git rev-parse "$REMOTE/$BRANCH")"

log "HEAD lokal  : $LOCAL_HEAD"
log "HEAD remote : $REMOTE_HEAD"

if [[ "$LOCAL_HEAD" != "$REMOTE_HEAD" ]]; then
  log "Fast-forward pull ke commit terbaru"
  git pull --ff-only "$REMOTE" "$BRANCH"
else
  log "Branch sudah sinkron, lanjut build ulang"
fi

log "Install dependency"
npm install

log "Build aplikasi"
npm run build

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  log "Restart PM2 app: $APP_NAME"
  pm2 restart "$APP_NAME"
else
  if [[ -f ecosystem.config.js ]]; then
    log "PM2 app belum ada, start via ecosystem.config.js"
    pm2 start ecosystem.config.js --only "$APP_NAME"
  else
    fail "PM2 app '$APP_NAME' tidak ditemukan dan ecosystem.config.js tidak ada."
  fi
fi

log "Status terakhir"
git status --short --branch
pm2 list

log "Deploy selesai"

#!/usr/bin/env bash
#
# Build, swap, restart, and verify the NAS portal — rolling back to the
# previous build when the new one does not come up.
#
# Requires launchd access (run it from your own Terminal, not a sandbox).
# Exit codes: 0 = deployed and healthy, 1 = failed (site left on the previous
# build whenever one exists).
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1

LABEL="com.nas.portal"
DOMAIN="gui/$(id -u)"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
HEALTH_URL="${DEPLOY_HEALTH_URL:-http://127.0.0.1:3000/}"
HEALTH_API_URL="${DEPLOY_HEALTH_API_URL:-http://127.0.0.1:3000/api/system/status}"
HEALTH_TRIES="${DEPLOY_HEALTH_TRIES:-15}"

step() { printf '\n==> %s\n' "$*"; }
fail() { printf '\n[deploy] FAILED: %s\n' "$*" >&2; }

restart_portal() {
  local i
  launchctl bootout "$DOMAIN/$LABEL" >/dev/null 2>&1 || true

  # bootout is asynchronous: bootstrapping the same label immediately after it
  # makes launchd answer EIO. Wait for the job and its port to disappear first.
  for ((i = 0; i < 40; i++)); do
    launchctl print "$DOMAIN/$LABEL" >/dev/null 2>&1 || break
    sleep 0.25
  done
  for ((i = 0; i < 40; i++)); do
    lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1 || break
    sleep 0.25
  done

  for ((i = 0; i < 10; i++)); do
    if launchctl bootstrap "$DOMAIN" "$PLIST" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  printf '[deploy] launchctl bootstrap failed after 10 attempts — is %s installed?\n' "$PLIST" >&2
  launchctl load "$PLIST" >/dev/null 2>&1 || true
}

healthy() {
  local i
  for ((i = 0; i < HEALTH_TRIES; i++)); do
    if curl -sf -o /dev/null -m 2 "$HEALTH_URL" &&
      curl -sf -o /dev/null -m 2 "$HEALTH_API_URL"; then
      return 0
    fi
    sleep 1
  done
  return 1
}

purge_cache() {
  [ -f .env.local ] || return 0
  set -a
  # shellcheck disable=SC1091
  . ./.env.local
  set +a
  if [ -n "${CF_ZONE_ID:-}" ] && [ -n "${CF_API_TOKEN:-}" ]; then
    curl -sf -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}' >/dev/null &&
      echo "CF cache purged" || echo "CF purge skipped"
  fi
}

step "build -> .next-build"
rm -rf .next-build
if ! NEXT_DIST_DIR=.next-build node_modules/.bin/next build; then
  fail "next build"
  exit 1
fi

step "swap in the new build (previous kept as .next.prev)"
rm -rf .next.prev
if [ -d .next ]; then
  mv .next .next.prev || {
    fail "could not back up .next"
    exit 1
  }
fi
if ! mv .next-build .next; then
  fail "could not move the new build into place"
  [ -d .next.prev ] && mv .next.prev .next
  exit 1
fi

step "restart $LABEL"
restart_portal

if healthy; then
  step "healthy"
  purge_cache
  rm -rf .next.prev
  exit 0
fi

fail "the site did not come back on the new build"
if [ -d .next.prev ]; then
  step "rolling back to the previous build"
  rm -rf .next
  mv .next.prev .next || {
    fail "could not restore the previous build"
    exit 1
  }
  restart_portal
  if healthy; then
    step "rolled back — the site is serving the previous build"
  else
    fail "rollback is not healthy either — inspect: launchctl print $DOMAIN/$LABEL"
  fi
else
  fail "no previous build to roll back to"
fi
exit 1

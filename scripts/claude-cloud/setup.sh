#!/bin/bash
# Claude Code cloud environment — SETUP SCRIPT.
#
# Paste this into the cloud environment's "Setup script" field at claude.ai/code
# (or load it with "Choose file"). It provisions the VM only; project setup
# (enterprise submodule, pnpm install, build, Docker services, seed) runs from the
# SessionStart hook in .claude/settings.json -> scripts/claude-cloud/session-start.sh.
#
# Constraints (https://code.claude.com/docs/en/cloud-environments#script-requirements):
#   - runs as root on Ubuntu 24.04, before the environment's variables are set
#   - must exit 0, and must finish in ~5 minutes or the environment is not cached
#   - the filesystem (pnpm store, Docker images) is snapshotted; running processes are not
#
# Every step shares one deadline (BUDGET seconds from start); optional warm-up work
# is cut off when the budget runs out and simply completes at session start instead.

set -u

BUDGET=270 # seconds; leaves headroom under the ~5 minute cache limit
DEADLINE=$((SECONDS + BUDGET))
PNPM_VERSION="11.28.2" # keep in sync with "packageManager" in package.json

log() { printf '[novu-setup] %s\n' "$*"; }

# Seconds left before the shared deadline (minimum 1 so `timeout` still works)
remaining() {
  local left=$((DEADLINE - SECONDS))
  [ "$left" -lt 1 ] && left=1
  echo "$left"
}

# 1. pnpm pinned to the repo's packageManager version
log "Activating pnpm@${PNPM_VERSION} via corepack"
{
  timeout "$(remaining)" corepack enable >/dev/null 2>&1 \
    || timeout "$(remaining)" npm i -g corepack >/dev/null 2>&1
  timeout "$(remaining)" corepack prepare "pnpm@${PNPM_VERSION}" --activate >/dev/null 2>&1 \
    || timeout "$(remaining)" npm i -g "pnpm@${PNPM_VERSION}" >/dev/null 2>&1
} || log "WARN: could not install pnpm@${PNPM_VERSION}"

# 2. Submodules use git@github.com: URLs; route them over HTTPS through the GitHub proxy
git config --global url."https://github.com/".insteadOf "git@github.com:" || true

# 3. Pre-pull the service images used by docker/local/docker-compose.agent.yml, in
#    parallel, so they are part of the cached snapshot (containers start per session).
pull_images() {
  if ! docker info >/dev/null 2>&1; then
    (dockerd >/var/log/dockerd.log 2>&1 &)
    for _ in $(seq 1 30); do
      docker info >/dev/null 2>&1 && break
      [ $((DEADLINE - SECONDS)) -le 0 ] && break
      sleep 1
    done
  fi

  local image
  for image in \
    mongo:8.0.17 \
    redis:latest \
    clickhouse/clickhouse-server:24.3-alpine \
    localstack/localstack:0.14.5; do
    (timeout "$(remaining)" docker pull -q "$image" >/dev/null 2>&1 \
      && log "Pulled $image" \
      || log "WARN: pull of $image did not finish (will pull at session start)") &
  done
  wait
}

# 4. Warm the pnpm store from the lockfile when the repo is already cloned, so the
#    per-session `pnpm install` is mostly linking.
warm_pnpm_store() {
  local repo="" candidate
  for candidate in "$PWD" /home/user/novu /workspace/novu "$HOME/novu"; do
    if [ -f "$candidate/pnpm-lock.yaml" ] && [ -f "$candidate/pnpm-workspace.yaml" ]; then
      repo="$candidate"
      break
    fi
  done

  if [ -z "$repo" ]; then
    log "Repo not found at setup time; skipping pnpm store warm-up"
    return 0
  fi

  log "Warming pnpm store from $repo/pnpm-lock.yaml"
  (cd "$repo" && timeout "$(remaining)" pnpm fetch >/dev/null 2>&1) \
    && log "pnpm store warmed" \
    || log "WARN: pnpm fetch did not finish (install will complete at session start)"
}

pull_images &
warm_pnpm_store &
wait

log "Done in ${SECONDS}s"
exit 0

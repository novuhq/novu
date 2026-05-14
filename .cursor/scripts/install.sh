#!/usr/bin/env bash
# Idempotent install hook for Cursor Background Agents.
# Runs on every agent boot via .cursor/environment.json.
#
# - Wires .source/ to the sibling packages-enterprise clone (multi-repo env).
#   .source is normally a git submodule, but Background Agents clone the
#   private enterprise repo as a sibling instead, so we link it in.
# - Installs deps with the frozen lockfile.
# - Refreshes enterprise src symlinks (no-op when .source is missing).
# - Seeds .env files only if missing (prefers .env.agent over .example.env).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

log() { printf '\033[36m[install]\033[0m %s\n' "$*"; }

link_enterprise_source() {
  if [ -L .source ] && [ -e .source ]; then
    log ".source already linked -> $(readlink .source)"
    return 0
  fi

  if [ -d .source ] && [ -n "$(ls -A .source 2>/dev/null)" ]; then
    log ".source already populated"
    return 0
  fi

  for candidate in \
    "$REPO_ROOT/../packages-enterprise" \
    "$HOME/packages-enterprise" \
    "/workspaces/packages-enterprise" \
    "/workspace/packages-enterprise"; do
    if [ -d "$candidate" ] && [ -d "$candidate/packages" ]; then
      [ -L .source ] && rm -f .source
      [ -d .source ] && rmdir .source 2>/dev/null || true
      ln -sfn "$candidate" .source
      log "Linked .source -> $candidate"
      return 0
    fi
  done

  log "WARN: packages-enterprise sibling clone not found."
  log "      Add 'novuhq/packages-enterprise' to the Background Agent's"
  log "      multi-repo selection (or check repositoryDependencies in"
  log "      .cursor/environment.json). Continuing in OSS-only mode."
}

ensure_env() {
  local target="$1"
  local dir="${target%/*}"

  [ -f "$target" ] && return 0

  if [ -f "$dir/.env.agent" ]; then
    cp "$dir/.env.agent" "$target"
    log "Seeded $target from .env.agent"
  elif [ -f "$dir/.example.env" ]; then
    cp "$dir/.example.env" "$target"
    log "Seeded $target from .example.env"
  fi
}

link_enterprise_source

log "Installing dependencies (pnpm install --frozen-lockfile)"
pnpm install --frozen-lockfile

if [ -e .source ]; then
  log "Refreshing enterprise src symlinks"
  pnpm symlink:submodules || log "WARN: symlink:submodules failed"
else
  log "Skipping symlink:submodules (no .source)"
fi

ensure_env apps/api/src/.env
ensure_env apps/worker/src/.env
ensure_env apps/ws/src/.env
ensure_env apps/dashboard/.env

log "Done"

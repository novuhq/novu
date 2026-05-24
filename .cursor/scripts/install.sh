#!/usr/bin/env bash
# Idempotent install hook for Cursor Background Agents.
# Runs on every agent boot via .cursor/environment.json.
#
# - Wires .source/ to packages-enterprise (sibling under /agent/repos, or git submodule).
#   Prefers a Cursor dependency clone when present; otherwise initializes .source via git.
# - Installs deps with the frozen lockfile.
# - Refreshes enterprise src symlinks (no-op when .source is missing).
# - Seeds .env files only if missing (prefers .env.agent over .example.env).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

log() { printf '\033[36m[install]\033[0m %s\n' "$*"; }

ensure_exec_daemon_dirs() {
  local artifacts_owner
  artifacts_owner="$(stat -c '%U' /opt/cursor/artifacts 2>/dev/null || echo '')"

  if [ "$artifacts_owner" = "ubuntu" ]; then
    return 0
  fi

  log "Preparing /opt/cursor dirs for exec-daemon (screen recording + artifacts)"
  sudo mkdir -p \
    /opt/cursor/artifacts/assets \
    /opt/cursor/artifacts/.cursor \
    /opt/cursor/recording-staging \
    /opt/cursor/logs
  sudo chown -R ubuntu:ubuntu /opt/cursor
  sudo chmod -R 0777 /opt/cursor
}

ensure_exec_daemon_dirs

ensure_tmux() {
  if command -v tmux >/dev/null 2>&1; then
    return 0
  fi

  log "Installing tmux (required for Cursor terminal sessions)"
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends tmux
}

ensure_tmux

ensure_docker_cli_access() {
  if docker info >/dev/null 2>&1; then
    return 0
  fi

  if [ ! -S /var/run/docker.sock ]; then
    return 0
  fi

  log "Docker socket not accessible; widening permissions for agent session"
  sudo chmod 666 /var/run/docker.sock
}

ensure_docker_cli_access

is_enterprise_repo() {
  local path="$1"

  # packages-enterprise uses top-level ee packages (api/, auth/, …), not packages/*.
  [ -d "$path/api" ] && [ -d "$path/auth" ] && [ -e "$path/.git" ]
}

configure_git_for_github_https() {
  if git config --global --get-regexp '^url\.https://github\.com/\.insteadof' >/dev/null 2>&1; then
    return 0
  fi

  git config --global url."https://github.com/".insteadOf "git@github.com:"

  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    gh auth setup-git >/dev/null 2>&1 || true
  fi
}

find_enterprise_repo_candidate() {
  local candidate

  for candidate in \
    "$REPO_ROOT/../packages-enterprise" \
    "$HOME/packages-enterprise" \
    "/workspaces/packages-enterprise" \
    "/workspace/packages-enterprise" \
    "/agent/repos/packages-enterprise"; do
    if is_enterprise_repo "$candidate"; then
      printf '%s' "$candidate"
      return 0
    fi
  done

  if [ -d /agent/repos ]; then
    for candidate in /agent/repos/*; do
      if is_enterprise_repo "$candidate"; then
        printf '%s' "$candidate"
        return 0
      fi
    done
  fi

  return 1
}

link_enterprise_source_to() {
  local target="$1"

  [ -L .source ] && rm -f .source
  [ -d .source ] && rm -rf .source
  ln -sfn "$target" .source
  log "Linked .source -> $target"
}

init_enterprise_submodule() {
  if [ -d .source ] && [ -n "$(ls -A .source 2>/dev/null)" ]; then
    return 0
  fi

  if ! git -C "$REPO_ROOT" config -f .gitmodules --get submodule.enterprise.url >/dev/null 2>&1; then
    return 1
  fi

  log "Initializing .source via git submodule (cloud agent fallback)"
  configure_git_for_github_https
  git -C "$REPO_ROOT" submodule update --init --depth 1 .source

  is_enterprise_repo "$REPO_ROOT/.source"
}

link_enterprise_source() {
  if [ -L .source ] && [ -e .source ]; then
    log ".source already linked -> $(readlink .source)"
    return 0
  fi

  if [ -d .source ] && [ -n "$(ls -A .source 2>/dev/null)" ]; then
    if is_enterprise_repo "$REPO_ROOT/.source"; then
      log ".source already populated"
      return 0
    fi
  fi

  local candidate
  if candidate="$(find_enterprise_repo_candidate)"; then
    link_enterprise_source_to "$candidate"
    return 0
  fi

  if init_enterprise_submodule; then
    log ".source initialized from git submodule"
    return 0
  fi

  log "WARN: packages-enterprise not available."
  log "      Ensure repositoryDependencies includes github.com/novuhq/packages-enterprise"
  log "      and the environment token can read it, or that gh auth can clone .source."
  log "      Continuing in OSS-only mode."
}

ensure_env() {
  local target="$1"
  local dir="${target%/*}"

  if [ -f "$dir/.env.agent" ]; then
    if [ ! -f "$target" ]; then
      cp "$dir/.env.agent" "$target"
      log "Seeded $target from .env.agent"

      return 0
    fi

    local merged=0
    while IFS= read -r line || [ -n "$line" ]; do
      [[ "$line" =~ ^# ]] && continue
      [[ -z "$line" ]] && continue
      local key="${line%%=*}"
      if ! grep -q "^${key}=" "$target"; then
        echo "$line" >> "$target"
        merged=1
      fi
    done < "$dir/.env.agent"

    if [ "$merged" -eq 1 ]; then
      log "Merged missing keys into $target from .env.agent"
    fi
  elif [ -f "$dir/.example.env" ] && [ ! -f "$target" ]; then
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

# Incremental build via Nx cache. After a `git pull` only projects whose
# inputs changed are rebuilt; everything else is a cache hit (~seconds).
# Apps are excluded — they compile on demand when dev servers start.
log "Building workspace dependencies (incremental via Nx cache, apps excluded)"
pnpm build:agents

log "Done"

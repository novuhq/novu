#!/usr/bin/env bash
# Claude Code cloud session bootstrap (SessionStart hook, see .claude/settings.json).
#
# No-op outside cloud sessions (CLAUDE_CODE_REMOTE != true), so local sessions are
# unaffected. Idempotent: runs on every session start and resume.
#
# Foreground (blocks session start, kept short):
#   1. Link/init the enterprise submodule (.source -> packages-enterprise)
#   2. pnpm install (skipped when lockfile + manifests are unchanged)
#   3. Enterprise symlinks + .env files (from .env.agent)
#   4. dockerd + mongo / redis / clickhouse / localstack containers
# Background (logs to $LOG, writes $READY when done):
#   5. pnpm build:agents (Nx cache), ClickHouse migrations, seed agent user/org

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

set -uo pipefail

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$REPO_ROOT" || exit 0

STATE_DIR="/tmp/novu-cloud"
LOG="$STATE_DIR/setup.log"
READY="$STATE_DIR/ready"
FAILED="$STATE_DIR/failed"
mkdir -p "$STATE_DIR"

log() { printf '[novu-cloud] %s\n' "$*" >>"$LOG"; }
status=()

# ---------------------------------------------------------------------------
# 1. Enterprise submodule
# ---------------------------------------------------------------------------
is_enterprise_repo() { [ -d "$1/api" ] && [ -d "$1/auth" ]; }

setup_enterprise() {
  if is_enterprise_repo "$REPO_ROOT/.source"; then
    return 0
  fi

  git config --global url."https://github.com/".insteadOf "git@github.com:" >/dev/null 2>&1 || true

  # Session with packages-enterprise attached as a second repository
  local candidate
  for candidate in "$REPO_ROOT/../packages-enterprise" /home/user/packages-enterprise; do
    if is_enterprise_repo "$candidate"; then
      rm -rf .source && ln -sfn "$candidate" .source
      log "Linked .source -> $candidate"
      return 0
    fi
  done

  # Through the GitHub proxy (works when your GitHub connection can read the repo)
  if git submodule update --init --depth 1 .source >>"$LOG" 2>&1 && is_enterprise_repo .source; then
    log "Initialized .source via GitHub proxy"
    return 0
  fi

  # Explicit read-only token set as an environment variable
  if [ -n "${NOVU_ENTERPRISE_GITHUB_TOKEN:-}" ]; then
    local sha
    sha="$(git ls-tree HEAD .source | awk '{print $3}')"
    rm -rf .source
    if git clone --filter=blob:none --no-checkout \
        "https://x-access-token:${NOVU_ENTERPRISE_GITHUB_TOKEN}@github.com/novuhq/packages-enterprise.git" \
        .source >>"$LOG" 2>&1 \
      && git -C .source checkout -q "$sha" >>"$LOG" 2>&1 \
      && is_enterprise_repo .source; then
      git -C .source remote set-url origin https://github.com/novuhq/packages-enterprise.git
      log "Cloned .source with NOVU_ENTERPRISE_GITHUB_TOKEN at $sha"
      return 0
    fi
    rm -rf .source && mkdir -p .source
  fi

  return 1
}

if setup_enterprise; then
  status+=("enterprise: .source ready")
else
  status+=("enterprise: UNAVAILABLE (Community Edition only) — see $LOG")
fi

# ---------------------------------------------------------------------------
# 2. Dependencies
# ---------------------------------------------------------------------------
HASHES="node_modules/.claude-cloud-install.sha256"
hash_inputs() {
  is_enterprise_repo .source && echo "with-enterprise"
  git ls-files -z -- 'package.json' '**/package.json' pnpm-lock.yaml pnpm-workspace.yaml \
    | xargs -0 sha256sum 2>/dev/null
  git ls-tree HEAD .source 2>/dev/null
}

current_hash="$(hash_inputs | sha256sum | awk '{print $1}')"
if [ -f "$HASHES" ] && [ "$(cat "$HASHES")" = "$current_hash" ]; then
  status+=("deps: up to date")
else
  rm -f "$HASHES"
  log "pnpm install --frozen-lockfile"
  if CI=true pnpm install --frozen-lockfile >>"$LOG" 2>&1; then
    echo "$current_hash" >"$HASHES"
    status+=("deps: installed")
  else
    status+=("deps: pnpm install FAILED — see $LOG")
  fi
fi

if is_enterprise_repo .source; then
  pnpm symlink:submodules >>"$LOG" 2>&1 || log "WARN: symlink:submodules failed"
fi

# ---------------------------------------------------------------------------
# 3. .env files (seed from .env.agent, merge in new keys without overwriting)
# ---------------------------------------------------------------------------
ensure_env() {
  local target="$1" dir="${1%/*}"
  local source="$dir/.env.agent"
  [ -f "$source" ] || source="$dir/.example.env"
  [ -f "$source" ] || return 0

  if [ ! -f "$target" ]; then
    cp "$source" "$target"
    return 0
  fi

  while IFS= read -r line || [ -n "$line" ]; do
    [[ -z "$line" || "$line" =~ ^# ]] && continue
    grep -q "^${line%%=*}=" "$target" || echo "$line" >>"$target"
  done <"$source"
}

for env_file in apps/api/src/.env apps/worker/src/.env apps/ws/src/.env apps/dashboard/.env; do
  ensure_env "$env_file"
done

# ---------------------------------------------------------------------------
# 4. Docker services
# ---------------------------------------------------------------------------
if ! docker info >/dev/null 2>&1; then
  (dockerd >/var/log/dockerd.log 2>&1 &)
  for _ in $(seq 1 30); do docker info >/dev/null 2>&1 && break; sleep 1; done
fi

if docker compose -f docker/local/docker-compose.agent.yml up -d >>"$LOG" 2>&1; then
  status+=("services: mongo:27017 redis:6379 clickhouse:8123 localstack:4566 up")
else
  status+=("services: docker compose FAILED — see $LOG")
fi

# ---------------------------------------------------------------------------
# 5. Background: build, ClickHouse migrations, seed
# ---------------------------------------------------------------------------
PIDFILE="$STATE_DIR/background.pid"
head_sha="$(git rev-parse HEAD)"

if [ -f "$READY" ] && [ "$(cat "$READY")" = "$head_sha" ]; then
  status+=("build+seed: done for ${head_sha:0:10}")
elif [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  status+=("build+seed: still running in background — tail $LOG")
else
  rm -f "$READY" "$FAILED"
  cat >"$STATE_DIR/background.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$REPO_ROOT"
trap 'touch "$FAILED"; echo "[novu-cloud] background setup FAILED"' ERR
echo "[novu-cloud] pnpm build:agents"
pnpm build:agents
echo "[novu-cloud] waiting for ClickHouse"
for _ in \$(seq 1 60); do curl -sf http://localhost:8123/ping >/dev/null && break; sleep 1; done
echo "[novu-cloud] ClickHouse migrations"
pnpm --filter @novu/api-service clickhouse:migrate:local
echo "[novu-cloud] seeding agent user/org"
pnpm seed:agent
echo "$head_sha" >"$READY"
echo "[novu-cloud] background setup done"
EOF
  nohup setsid bash "$STATE_DIR/background.sh" >>"$LOG" 2>&1 </dev/null &
  echo $! >"$PIDFILE"
  status+=("build+seed: started in background — wait for $READY (or $FAILED) before running apps/tests; log: $LOG")
fi

# Hook stdout is added to Claude's context
echo "Novu cloud environment:"
printf ' - %s\n' "${status[@]}"
exit 0

#!/usr/bin/env bash
# Boot-time service startup for Cursor Background Agents.
#
# Called by:
#   - .cursor/environment.json `start` (every agent boot)
#   - scripts/setup-agent.sh           (one-time snapshot creation)
#
# Steps (all idempotent):
#   1. Start the Docker daemon
#   2. Bring up mongo / redis / clickhouse / localstack
#   3. Wait for ClickHouse to accept queries (no built-in healthcheck)
#   4. Apply ClickHouse migrations (tracked in `migrations` table; safe to re-run)
#   5. Seed the default agent user/org (handles USER_ALREADY_EXISTS)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

log() { printf '\033[35m[start]\033[0m %s\n' "$*"; }

ensure_docker() {
  docker info >/dev/null 2>&1 && return 0

  log "Starting Docker daemon..."
  sudo service docker start 2>/dev/null \
    || sudo systemctl start docker 2>/dev/null \
    || (sudo dockerd >/dev/null 2>&1 &)

  for _ in $(seq 1 30); do
    docker info >/dev/null 2>&1 && return 0
    sleep 2
  done

  log "ERROR: Docker daemon did not start within 60s" >&2
  exit 1
}

wait_for_clickhouse() {
  log "Waiting for ClickHouse on :8123..."
  for _ in $(seq 1 60); do
    if curl -sf http://localhost:8123/ping >/dev/null 2>&1; then
      log "ClickHouse ready"
      return 0
    fi
    sleep 1
  done
  log "ERROR: ClickHouse not ready after 60s" >&2

  return 1
}

ensure_docker

log "Bringing up Docker services (mongo, redis, clickhouse, localstack)"
docker compose -f docker/local/docker-compose.agent.yml up -d

wait_for_clickhouse

log "Applying ClickHouse migrations"
pnpm --filter @novu/api-service clickhouse:migrate:local

log "Seeding agent user/org (idempotent)"
pnpm seed:agent

log "Done"

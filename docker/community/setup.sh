#!/usr/bin/env bash
set -euo pipefail

NOVU_DIR="${NOVU_DIR:-./novu}"
REPO_BASE="https://raw.githubusercontent.com/novuhq/novu/next/docker/community"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()   { printf "${GREEN}▸${NC} %s\n" "$*"; }
warn()  { printf "${YELLOW}▸${NC} %s\n" "$*"; }
error() { printf "${RED}✗${NC} %s\n" "$*" >&2; }

check_deps() {
  local missing=()
  for cmd in curl docker openssl; do
    if ! command -v "$cmd" &>/dev/null; then
      missing+=("$cmd")
    fi
  done
  if ! docker compose version &>/dev/null 2>&1; then
    missing+=("docker-compose-v2")
  fi
  if [ ${#missing[@]} -gt 0 ]; then
    error "Missing required tools: ${missing[*]}"
    exit 1
  fi
}

generate_secret() {
  openssl rand -hex "$1"
}

create_env() {
  local env_file="$1"
  local env_example="$2"

  if [ -f "$env_file" ]; then
    warn ".env already exists — checking secrets..."
    local needs_update=false
    for key in JWT_SECRET STORE_ENCRYPTION_KEY NOVU_SECRET_KEY; do
      val=$(grep "^${key}=" "$env_file" | cut -d'=' -f2-)
      if [ -z "$val" ]; then
        needs_update=true
        break
      fi
    done

    if [ "$needs_update" = true ]; then
      warn "Empty secrets found in existing .env — filling them in"
      fill_secrets "$env_file"
      chmod 600 "$env_file"
    else
      log "All secrets already set in .env"
    fi

    return
  fi

  cp "$env_example" "$env_file"
  fill_secrets "$env_file"
  chmod 600 "$env_file"
  log "Created .env with secure random secrets"
}

fill_secrets() {
  local env_file="$1"
  local jwt_secret store_key novu_key

  jwt_secret=$(generate_secret 32)
  store_key=$(generate_secret 16)
  novu_key=$(generate_secret 32)

  replace_if_empty "$env_file" "JWT_SECRET" "$jwt_secret"
  replace_if_empty "$env_file" "STORE_ENCRYPTION_KEY" "$store_key"
  replace_if_empty "$env_file" "NOVU_SECRET_KEY" "$novu_key"
}

replace_if_empty() {
  local file="$1" key="$2" value="$3"
  local current
  current=$(grep "^${key}=" "$file" | cut -d'=' -f2-)
  if [ -z "$current" ]; then
    sed_inplace "s|^${key}=$|${key}=${value}|" "$file"
  fi
}

sed_inplace() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

# ── Main ─────────────────────────────────────────────────────────────────

main() {
  echo ""
  log "Novu Self-Hosted Setup"
  echo ""

  check_deps

  if [ -f "docker-compose.yml" ] && [ -f ".env.example" ]; then
    NOVU_DIR="."
  else
    mkdir -p "$NOVU_DIR"
    log "Downloading docker-compose.yml..."
    curl -fsSL "${REPO_BASE}/docker-compose.yml" -o "${NOVU_DIR}/docker-compose.yml"
    log "Downloading .env.example..."
    curl -fsSL "${REPO_BASE}/.env.example" -o "${NOVU_DIR}/.env.example"
  fi

  cd "$NOVU_DIR"

  create_env ".env" ".env.example"

  echo ""
  log "Setup complete. Starting Novu..."
  echo ""

  docker compose up -d

  echo ""
  log "Novu is running:"
  echo "  Dashboard : http://localhost:4000"
  echo "  API       : http://localhost:3000"
  echo "  WebSocket : http://localhost:3002"
  echo ""
  log "View logs with: docker compose logs -f"
  echo ""
}

main "$@"

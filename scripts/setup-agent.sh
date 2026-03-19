#!/usr/bin/env bash
set -e

ensure_docker() {
  if docker info >/dev/null 2>&1; then
    echo "Docker is ready."
    return
  fi

  echo "Starting Docker daemon..."
  if [[ "$(uname)" == "Linux" ]]; then
    sudo systemctl start docker 2>/dev/null || sudo service docker start 2>/dev/null || sudo dockerd &
    sleep 3

    if ! docker info >/dev/null 2>&1; then
      echo "Granting Docker socket access to current user..."
      sudo usermod -aG docker "$USER" 2>/dev/null || true
      sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
    fi
  elif [[ "$(uname)" == "Darwin" ]]; then
    open -a Docker
    echo "Waiting for Docker Desktop to start..."
  fi

  for i in $(seq 1 30); do
    docker info >/dev/null 2>&1 && break
    sleep 2
  done

  if ! docker info >/dev/null 2>&1; then
    echo "Error: Docker daemon did not start within 60s."
    exit 1
  fi

  echo "Docker is ready."
}

git submodule update --init --recursive
git config --global submodule.recurse true

pnpm install:with-ee
pnpm build

cp apps/api/src/.env.agent apps/api/src/.env
cp apps/dashboard/.env.agent apps/dashboard/.env
cp apps/worker/src/.env.agent apps/worker/src/.env

ensure_docker
docker compose -f docker/local/docker-compose.agent.yml down --remove-orphans 2>/dev/null || true
docker compose -f docker/local/docker-compose.agent.yml up -d

pnpm seed:agent

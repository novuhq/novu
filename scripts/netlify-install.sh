#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

TRUST_FLAG="$(bash scripts/configure-pnpm-private-registry.sh)"
pnpm install --frozen-lockfile ${TRUST_FLAG}

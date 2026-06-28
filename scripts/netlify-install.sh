#!/usr/bin/env bash
set -euo pipefail

TRUST_FLAG="$(bash "$(dirname "$0")/configure-pnpm-private-registry.sh")"
pnpm install --frozen-lockfile ${TRUST_FLAG}

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

JUDGE_FLAG=""
if [[ "${1:-}" == "--judge" ]]; then
  JUDGE_FLAG="--judge"
  shift
fi

pnpm start ${JUDGE_FLAG} -- "$@"

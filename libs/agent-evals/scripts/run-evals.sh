#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "${1:-}" == "--judge" ]]; then
  export NOVU_EVAL_JUDGE=true
  shift
fi

pnpm eval "$@"

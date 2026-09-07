#!/usr/bin/env bash
# Run knip and save Markdown output for the AI agent.
#
# Usage:  bash .cursor/scripts/dead-code/scan.sh
# Env:    KNIP_ARGS  — extra arguments (e.g. "--workspace apps/api")

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
OUT_DIR="$REPO_ROOT/.cursor-artifacts/deadcode"

mkdir -p "$OUT_DIR"
cd "$REPO_ROOT"

CONFIG_REL="${SCRIPT_DIR#"$REPO_ROOT/"}/knip.config.jsonc"

echo "Running knip (config: $CONFIG_REL)..."
KNIP_EXIT=0
npx knip \
  --config="$CONFIG_REL" \
  --reporter markdown \
  --no-progress \
  ${KNIP_ARGS:-} \
  > "$OUT_DIR/knip.md" \
  2> "$OUT_DIR/knip-stderr.txt" \
  || KNIP_EXIT=$?

if [ ! -s "$OUT_DIR/knip.md" ] && [ -s "$OUT_DIR/knip-stderr.txt" ]; then
  echo "ERROR: knip produced no output (exit code $KNIP_EXIT)." >&2
  echo "Stderr:" >&2
  cat "$OUT_DIR/knip-stderr.txt" >&2
  exit 1
fi

echo "Done (exit code $KNIP_EXIT). Output: $OUT_DIR/knip.md"

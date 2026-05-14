#!/usr/bin/env bash
# One-time bootstrap for the Cursor Background Agent base snapshot.
#
# Runs ONCE during environment/snapshot creation in the Cursor dashboard.
# After the snapshot is captured, every subsequent agent boot reuses it and
# only re-runs the lightweight `install` and `start` hooks from
# .cursor/environment.json.
#
# This script owns the work that should NOT repeat on every boot:
#   1. .cursor/scripts/install.sh   - shared with per-boot install hook
#   2. pnpm build                   - heavy; cached in the snapshot
#   3. .cursor/scripts/start.sh     - shared with per-boot start hook
#                                     (services + CH migrations + seed)
#
# Target environment: Cursor cloud agent VM (Ubuntu, Docker preinstalled
# from .cursor/Dockerfile). Not intended for local developer machines.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

bash .cursor/scripts/install.sh

pnpm build

bash .cursor/scripts/start.sh

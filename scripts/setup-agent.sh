#!/usr/bin/env bash
# One-time bootstrap for the Cursor Background Agent base snapshot.
#
# Runs ONCE during environment/snapshot creation in the Cursor dashboard.
# After the snapshot is captured, every subsequent agent boot reuses it and
# re-runs the same install + start hooks from .cursor/environment.json.
#
# This script is intentionally thin - it just invokes the per-boot hooks
# in order, capturing their full output (deps + build + services + seed)
# into the snapshot. Boots after snapshot creation are fast because Nx
# cache hits, pnpm install no-ops on unchanged deps, and docker reuses
# existing containers.
#
# Target environment: Cursor cloud agent VM (Ubuntu, Docker preinstalled
# from .cursor/Dockerfile). Not intended for local developer machines.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

bash .cursor/scripts/install.sh
bash .cursor/scripts/start.sh

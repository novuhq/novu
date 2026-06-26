#!/usr/bin/env bash
#
# Sync the Novu agent skills from the standalone novuhq/skills repository into
# the Mintlify docs site so they are served at /skill.md and /.well-known/*.
#
# Mintlify serves custom multi-skill setups from `docs/.mintlify/skills/<name>/SKILL.md`.
# Because Mintlify does not initialise git submodules at build time and only resolves
# symlinks within the same repo, the skills must exist as real committed files. This
# script mirrors them so a GitHub Action (or a human) can open a PR whenever they drift.
#
# Usage:
#   scripts/sync-skills.sh
#
# Environment variables (all optional):
#   SKILLS_REPO   Source repository slug.        Default: novuhq/skills
#   SKILLS_REF    Branch/tag/sha to sync from.   Default: main
#   SKILLS_REMOTE Full clone URL override.       Default: https://github.com/$SKILLS_REPO.git
#   DEST_DIR      Destination skills directory.  Default: docs/.mintlify/skills
#   STRICT        If "true", exit non-zero when any skill fails validation. Default: false
#
set -euo pipefail

SKILLS_REPO="${SKILLS_REPO:-novuhq/skills}"
SKILLS_REF="${SKILLS_REF:-main}"
SKILLS_REMOTE="${SKILLS_REMOTE:-https://github.com/${SKILLS_REPO}.git}"
STRICT="${STRICT:-false}"

# Resolve repo root so the script works regardless of the current working directory.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST_DIR="${DEST_DIR:-${REPO_ROOT}/docs/.mintlify/skills}"

log() { printf '%s\n' "$*" >&2; }

require() {
  command -v "$1" >/dev/null 2>&1 || { log "error: required command '$1' not found"; exit 1; }
}

require git

TMP_DIR="$(mktemp -d)"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

log "==> Cloning ${SKILLS_REPO}@${SKILLS_REF}"
git clone --quiet --depth 1 --branch "$SKILLS_REF" "$SKILLS_REMOTE" "$TMP_DIR/skills-src" 2>/dev/null \
  || git clone --quiet --depth 1 "$SKILLS_REMOTE" "$TMP_DIR/skills-src"

SRC_SKILLS="$TMP_DIR/skills-src/skills"
if [ ! -d "$SRC_SKILLS" ]; then
  log "error: '${SKILLS_REPO}' does not contain a top-level 'skills/' directory"
  exit 1
fi

# Validate that a SKILL.md starts with YAML frontmatter containing name + description.
# Mintlify requires custom skill files to begin with such frontmatter.
validate_skill() {
  local skill_md="$1"
  [ -f "$skill_md" ] || return 1
  # First non-empty line must be the frontmatter delimiter.
  if ! head -n 1 "$skill_md" | grep -q '^---[[:space:]]*$'; then
    return 1
  fi
  # Extract the frontmatter block (between the first two `---` delimiters).
  local frontmatter
  frontmatter="$(awk 'NR==1 && /^---[[:space:]]*$/ {inblock=1; next} inblock && /^---[[:space:]]*$/ {exit} inblock {print}' "$skill_md")"
  printf '%s\n' "$frontmatter" | grep -q '^name:[[:space:]]*[^[:space:]]' || return 1
  printf '%s\n' "$frontmatter" | grep -q '^description:[[:space:]]*[^[:space:]]' || return 1
  return 0
}

STAGE_DIR="$TMP_DIR/stage"
mkdir -p "$STAGE_DIR"

declare -a SYNCED=()
declare -a SKIPPED=()

for skill_path in "$SRC_SKILLS"/*/; do
  [ -d "$skill_path" ] || continue
  skill_name="$(basename "$skill_path")"
  if validate_skill "${skill_path}SKILL.md"; then
    cp -R "$skill_path" "$STAGE_DIR/$skill_name"
    SYNCED+=("$skill_name")
  else
    SKIPPED+=("$skill_name")
    log "warning: skipping '${skill_name}' — SKILL.md is missing valid YAML frontmatter (requires 'name' and 'description')"
  fi
done

if [ "${#SYNCED[@]}" -eq 0 ]; then
  log "error: no valid skills found to sync"
  exit 1
fi

# Mirror the validated skills, removing any skill that no longer exists upstream.
# DEST_DIR is dedicated to synced skills, so it is safe to replace wholesale.
rm -rf "$DEST_DIR"
mkdir -p "$DEST_DIR"
cp -R "$STAGE_DIR"/. "$DEST_DIR"/

log ""
log "==> Synced ${#SYNCED[@]} skill(s) into ${DEST_DIR#"$REPO_ROOT"/}:"
for s in "${SYNCED[@]}"; do log "    - $s"; done
if [ "${#SKIPPED[@]}" -gt 0 ]; then
  log ""
  log "==> Skipped ${#SKIPPED[@]} skill(s) due to invalid/missing frontmatter:"
  for s in "${SKIPPED[@]}"; do log "    - $s"; done
fi

# Surface results in GitHub Actions summaries when available.
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "### Skills sync"
    echo ""
    echo "Source: \`${SKILLS_REPO}@${SKILLS_REF}\`"
    echo ""
    echo "Synced ${#SYNCED[@]} skill(s):"
    for s in "${SYNCED[@]}"; do echo "- \`$s\`"; done
    if [ "${#SKIPPED[@]}" -gt 0 ]; then
      echo ""
      echo "Skipped ${#SKIPPED[@]} skill(s) (missing \`name\`/\`description\` frontmatter):"
      for s in "${SKIPPED[@]}"; do echo "- \`$s\`"; done
    fi
  } >> "$GITHUB_STEP_SUMMARY"
fi

if [ "$STRICT" = "true" ] && [ "${#SKIPPED[@]}" -gt 0 ]; then
  log ""
  log "error: STRICT mode enabled and ${#SKIPPED[@]} skill(s) failed validation"
  exit 1
fi

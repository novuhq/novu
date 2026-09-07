---
name: nv-worktree-commands
description: >-
  Git worktree command reference: path naming, create/remove/prune, `.env*`
  copy, package-manager install, and cleanup. Use when implementing or
  debugging worktree setup — not as the primary user-facing workflow (see
  nv-worktree-create).
---

# Git worktree commands

Reference for agents implementing worktree workflows. Prefer `nv-worktree-create` for the end-to-end flow.

## Path naming

```text
REPO_ROOT  = $(git rev-parse --show-toplevel)
REPO_PARENT = $(dirname "$REPO_ROOT")
BRANCH     = user-provided name (used as git branch)
DIR_NAME   = sanitize(BRANCH)   # lowercase; `/` → `-`
WORKTREE   = "$REPO_PARENT/$DIR_NAME"
```

Examples (repo at `/Users/me/work/novu`):

| Branch | Worktree path |
|---|---|
| `more-dcr-oauths` | `/Users/me/work/more-dcr-oauths` |
| `nv-1234/foo-bar` | `/Users/me/work/nv-1234-foo-bar` |

Abort if `WORKTREE` already exists on disk or in `git worktree list`.

## Create (new branch)

From current HEAD:

```bash
git worktree add -b <branch> <worktree-path>
```

From a specific base:

```bash
git worktree add -b <branch> <worktree-path> <base-ref>
```

`<base-ref>`: `HEAD`, `main`, `origin/main`, a tag, or a commit SHA.

## Inspect

```bash
git worktree list
git -C <worktree-path> status -sb
git -C <worktree-path> rev-parse HEAD
```

## Copy local env files

`git worktree add` does not bring gitignored files. Copy **local secret env files only** from the main checkout — not `.env.example` / `.env.template` (those are already in git).

**Preferred — `rsync` with explicit includes** (from main repo root):

```bash
rsync -a \
  --prune-empty-dirs \
  --include='*/' \
  --include='.env' \
  --include='.env.*' \
  --exclude='.env.example' \
  --exclude='.env.template' \
  --exclude='*' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='build/' \
  --exclude='.next/' \
  --exclude='.turbo/' \
  "<main-repo-root>/" "<worktree-path>/"
```

**Alternative — copy only gitignored env files** (when `rsync` is unavailable):

```bash
cd <main-repo-root>
git ls-files -z --others --ignored --exclude-standard \
| while IFS= read -r -d '' f; do
    base="$(basename "$f")"
    case "$base" in
      .env|.env.*)
        case "$base" in
          .env.example|.env.template) continue ;;
        esac
        mkdir -p "<worktree-path>/$(dirname "$f")"
        cp -a "$f" "<worktree-path>/$f"
        ;;
    esac
  done
```

After copying, list what landed (e.g. `find <worktree-path> -type f \( -name '.env' -o -name '.env.*' \) ! -name '.env.example' ! -name '.env.template'`).

### Novu-specific

- Copy from the **parent checkout**, not `node scripts/setup-env-files.js`. That script generates a **new** `STORE_ENCRYPTION_KEY` when `.env` is missing — a worktree would then disagree with the parent and shared local Mongo/Redis.
- Typical files copied: `apps/api/src/.env`, `.env.agent`, `.env.development`, `apps/dashboard/.env`, `apps/worker/src/.env`, `apps/ws/src/.env`, etc.
- Skip `playground/` env unless the task needs it.

## Install dependencies

| Lockfile | Command |
|---|---|
| `pnpm-lock.yaml` | `pnpm install` |
| `yarn.lock` | `yarn install` |
| `package-lock.json` | `npm install` |
| `bun.lockb` | `bun install` |

Run from the worktree root.

## Build

```bash
pnpm build   # or npm/yarn/bun equivalent
```

Skip if no build script exists.

## Remove

```bash
git worktree remove <worktree-path>
git worktree prune
```

Remove uncommitted work in the worktree first, or use `--force` only when the user explicitly asks.

For auditing merged/stale worktrees and batch cleanup, read `nv-worktree-cleanup`.

## Anti-patterns

- `git worktree add --detach` when the goal is a named feature branch — use `-b`.
- `cp -r` the entire repo instead of `git worktree add`.
- Reusing `~/.cursor/worktrees/…` detached paths when a sibling `../<name>` worktree is enough.
- Running full setup scripts (`pnpm setup:agent`) in Cursor Cloud child worktrees when the parent already ran them.

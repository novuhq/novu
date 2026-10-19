---
name: nv-worktree-commands
description: >-
  Git worktree command reference: path naming, create/remove/prune, `.env`
  copy and cleanup. Use when implementing or
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

`git worktree add` does not bring gitignored files. Only plain `.env` files are gitignored in Novu; `.env.development`, `.env.agent`, `.env.test`, etc. are tracked and already present in the worktree.

**Default — ask git for the ignored `.env` files (~0.1s).** `--directory` stops git from descending into ignored dirs like `node_modules`, `.nx`, `dist`:

```bash
cd <main-repo-root>
git ls-files -z -o -i --exclude-standard --directory \
| grep -zE '(^|/)\.env$' \
| rsync -a --from0 --files-from=- ./ "<worktree-path>/"
```

**`--lite` — core apps only** (no search at all):

```bash
cd <main-repo-root>
for f in apps/api/src/.env apps/worker/src/.env apps/ws/src/.env apps/dashboard/.env; do
  [ -f "$f" ] && echo "$f"
done | rsync -a --files-from=- ./ "<worktree-path>/"
```

**Never** use `rsync --include='*/'` over the whole repo: it descends into `node_modules` and `.nx` (measured ~11s vs ~0.1s).

After copying, report the list that was sent (the commands above copy ~8 files).

### Novu-specific

- Copy from the **parent checkout**, not `node scripts/setup-env-files.js`. That script generates a **new** `STORE_ENCRYPTION_KEY` when `.env` is missing — a worktree would then disagree with the parent and shared local Mongo/Redis.
- Typical files copied: `apps/api/src/.env`, `apps/dashboard/.env`, `apps/worker/src/.env`, `apps/ws/src/.env`, plus `apps/inbound-mail`, `libs/agent-evals`.
- Skip `playground/` env unless the task needs it.

## Install / build

**Never run install or build** (`pnpm install`, `pnpm build`, `pnpm setup:agent`) as part of worktree creation. If the user wants them, they will ask.

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

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
MAIN_ROOT  = $(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")   # the main checkout, also when run from a worktree
BRANCH     = user-provided name (used as git branch)
DIR_NAME   = sanitize(BRANCH)   # lowercase; `/` → `-`
WORKTREE   = "$MAIN_ROOT/.claude/worktrees/$DIR_NAME"
```

Don't use `git rev-parse --show-toplevel` for `MAIN_ROOT`: inside a worktree it returns that worktree, which would nest the new one inside it.

Examples (repo at `/Users/me/work/novu`):

| Branch | Worktree path |
|---|---|
| `more-dcr-oauths` | `/Users/me/work/novu/.claude/worktrees/more-dcr-oauths` |
| `nv-1234/foo-bar` | `/Users/me/work/novu/.claude/worktrees/nv-1234-foo-bar` |

Why `.claude/worktrees/`: Claude Code enters worktrees there without asking, but asks for approval on every entry to a path outside it, and no permission rule turns that off. The folder is gitignored, so the main checkout's `git status`, Biome and Nx skip it.

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
- Reusing `~/.cursor/worktrees/…` detached paths when a `.claude/worktrees/<name>` worktree is enough.
- Creating worktrees next to the repo (`../<name>`): Claude Code then asks for approval every time it enters one.
- Running full setup scripts (`pnpm setup:agent`) in Cursor Cloud child worktrees when the parent already ran them.

---
name: nv-worktree-create
description: >-
  Create a git worktree under the repo's gitignored `.claude/worktrees/` folder
  and a new branch with the same name, copy local `.env` files, optionally
  initialize the enterprise submodule (`--enterprise`), and move the agent into
  the worktree. Use when the user asks for a worktree, parallel branch checkout,
  or `/worktree` with a branch name.
disable-model-invocation: true
---

# Create a git worktree

**Goal:** one name → new branch + worktree at `<main-repo-root>/.claude/worktrees/<name>`, ready to work in. Claude Code enters worktrees in that folder without asking; it asks for approval on every entry to a path outside it, and no permission rule turns that off. The folder is gitignored.

For git command details and path naming, read `nv-worktree-commands`. For cleanup, read `nv-worktree-cleanup`.

## Inputs

| Input | Required | Default |
|---|---|---|
| Branch / worktree name | yes — ask if missing | — |
| Base ref | no | current `HEAD` |
| `--lite` | no | off — copy only the core app `.env` files (api, worker, ws, dashboard), no dirty-check |
| `--no-env` | no | off — skip the env copy entirely |
| `--enterprise` | no | off — also link/init the enterprise `.source` submodule (slow: network + symlinks) |

Use the name as-is for the git branch. Use the sanitized name for the directory (see `nv-worktree-commands`).

## Steps

1. **Preflight** — one call from the main repo root:
   ```bash
   git rev-parse --show-toplevel && git worktree list && git status --porcelain
   ```
   Abort if the target path already exists. If the status is non-empty, warn that the working tree is dirty and ask whether to proceed (skip this ask with `--lite`).

2. **Create** — always a **new** branch and worktree:
   ```bash
   git worktree add -b <branch> <worktree-path> [<base-ref>]
   ```
   Omit `<base-ref>` to branch from current `HEAD`.

3. **Copy local env files** — only the gitignored `.env` files (the `.env.*` variants are tracked and already in the worktree). Use the fast `git ls-files` recipe in `nv-worktree-commands` (~0.1s). With `--lite` use its core-apps recipe; with `--no-env` skip. Do **not** use a recursive `rsync` over the repo (walks `node_modules`/`.nx`, ~10s). Report what was copied. Do **not** run `setup-env-files.js` — it regenerates encryption keys.

4. **Enterprise submodule** — **only with `--enterprise`**; otherwise skip and continue in OSS mode. From the worktree root (best-effort; do not block handoff):
   - Skip if `.source` already exists or is linked.
   - Prefer linking an existing `packages-enterprise` clone before submodule init — same candidates as `.cursor/scripts/install.sh` (`<main-repo-root>/../packages-enterprise`, the main checkout's `.source`, `/agent/repos/packages-enterprise`, etc.). Resolve them from the main checkout, not from the worktree: `../` from the worktree points inside `.claude/worktrees/`.
   - Else configure HTTPS git fallback when SSH is unavailable, then shallow-init `.source` (matches `install.sh`):
     ```bash
     git config --global url."https://github.com/".insteadOf "git@github.com:"
     gh auth setup-git
     git submodule update --init --depth 1 .source
     ```
   - If `.source` is available, refresh symlinks (warn-only on failure):
     ```bash
     pnpm symlink:submodules || echo "WARN: symlink:submodules failed; continuing in OSS mode"
     ```
   - If enterprise setup fails, warn and continue in OSS mode — do not block the worktree. For troubleshooting, read `enterprise-submodule`.

5. **Hand off** — move the agent into the absolute worktree path:
   - Cursor: `move_agent_to_root`. Not `move_agent_to_cloned_root`.
   - Claude Code: `EnterWorktree` with `path`.

6. **Confirm** — branch name, worktree path, base ref, copied env files, enterprise submodule status (or "skipped"). Mention that until `pnpm install` runs in the worktree, Node and `npx` find packages in the main checkout's root `node_modules` (a parent folder), so commands can run with the main checkout's dependency versions instead of failing.

## Example

User: `/worktree branch=more-dcr-oauths`

```text
Branch:     more-dcr-oauths
Path:       .claude/worktrees/more-dcr-oauths
Command:    git worktree add -b more-dcr-oauths .claude/worktrees/more-dcr-oauths
```

Then copy `.env` and hand off (`move_agent_to_root` or `EnterWorktree`). Add `--enterprise` to also wire `.source` + `pnpm symlink:submodules`.

## Do not

- Check out an existing branch — this skill always creates a **new** branch.
- Copy the whole repo — only `.env`.
- Run `pnpm install`, `pnpm build`, or `pnpm setup:agent` — **never**, not even if a task fails; tell the user instead. (`pnpm symlink:submodules` under `--enterprise` is the only pnpm script allowed.)
- Symlink `node_modules` from the parent checkout.
- Pick the branch name without the user providing it (or confirming a suggested name).

---
name: nv-worktree-create
description: >-
  Create a sibling git worktree and a new branch with the same name, copy local
  `.env` files, optionally initialize the enterprise submodule (`--enterprise`),
  and move the agent into the worktree. Use when the user asks for a worktree,
  parallel branch checkout, or `/worktree` with a branch name.
disable-model-invocation: true
---

# Create a sibling git worktree

**Goal:** one name → new branch + sibling worktree at `../<name>`, ready to work in.

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
   - Prefer linking an existing `packages-enterprise` clone before submodule init — same candidates as `.cursor/scripts/install.sh` (sibling `../packages-enterprise`, parent checkout `.source`, `/agent/repos/packages-enterprise`, etc.).
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

5. **Hand off** — `move_agent_to_root` with the absolute worktree path. Not `move_agent_to_cloned_root`.

6. **Confirm** — branch name, worktree path, base ref, copied env files, enterprise submodule status (or "skipped").

## Example

User: `/worktree branch=more-dcr-oauths`

```text
Branch:     more-dcr-oauths
Path:       ../more-dcr-oauths
Command:    git worktree add -b more-dcr-oauths ../more-dcr-oauths
```

Then copy `.env`, `move_agent_to_root`. Add `--enterprise` to also wire `.source` + `pnpm symlink:submodules`.

## Do not

- Check out an existing branch — this skill always creates a **new** branch.
- Copy the whole repo — only `.env`.
- Run `pnpm install`, `pnpm build`, or `pnpm setup:agent` — **never**, not even if a task fails; tell the user instead. (`pnpm symlink:submodules` under `--enterprise` is the only pnpm script allowed.)
- Symlink `node_modules` from the parent checkout.
- Pick the branch name without the user providing it (or confirming a suggested name).

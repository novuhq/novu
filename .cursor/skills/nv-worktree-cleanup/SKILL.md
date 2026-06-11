---
name: nv-worktree-cleanup
description: >-
  Audits git worktrees and removes the ones that are safe to delete — merged
  into the base branch (including squash-merges via `gh`), missing on disk,
  or explicitly confirmed by the user — then deletes the associated local
  branches and runs `git worktree prune`. Use when the user asks to clean up
  worktrees, prune worktrees, list stale worktrees, remove merged worktrees
  or branches, or reclaim disk space from old checkouts.
disable-model-invocation: true
---

# Clean up git worktrees

End state: stale, merged, and missing worktrees are removed; their local branches are deleted; `git worktree prune` has run; the user has signed off on every deletion.

## Hard rules

1. **Never `--force` remove a worktree without explicit user confirmation.** Dirty worktrees stay until the user says otherwise.
2. **Never delete the main worktree** (the one at `git rev-parse --show-toplevel` of the primary checkout) or the worktree the agent is currently sitting in. Detect the agent's worktree by comparing `pwd` (or `git rev-parse --show-toplevel` from the current directory) against each path from `git worktree list`. If they match, refuse deletion and tell the user to move first via `move_agent_to_root`.
3. **Confirm deletions in one batch** via `AskQuestion` with `allow_multiple: true`. Don't delete one-by-one without a single approval step.
4. **Use `git branch -d` (safe delete) by default.** Only use `-D` for branches the user explicitly flags as okay to force-delete.

## Workflow

### 1. Enumerate worktrees

```bash
git worktree list --porcelain
```

Parse into entries: `path`, `branch`, `HEAD`. Skip the primary worktree.

### 2. Determine the base branch

Check in order:

- `git symbolic-ref refs/remotes/origin/HEAD` (gives e.g. `refs/remotes/origin/main`)
- Fall back to `main`, then `next`, then `master`

Use `origin/<base>` for merge checks so local staleness doesn't matter. Run `git fetch --prune origin` first to make checks accurate.

### 3. Classify each worktree

For each non-primary worktree, compute one of:

| Status | Detection | Default action |
|---|---|---|
| **missing** | path does not exist on disk | prune only |
| **merged-direct** | `git merge-base --is-ancestor <branch> origin/<base>` succeeds | remove + delete branch |
| **merged-squash** | `gh pr list --state merged --head <branch> --json number` returns a PR (requires GitHub CLI — if `gh` is missing, skip this classification and flag the branch as **active** with a note to install `gh` or verify merge manually) | remove + delete branch (with `-D` after confirm, since `-d` will refuse) |
| **dirty** | `git -C <path> status --porcelain` is non-empty | flag, do not remove |
| **unpushed** | branch has commits not on `origin/<branch>` and no merged PR | flag, do not remove |
| **active** | none of the above | leave alone |

Also flag any worktree that is **the current agent root** — compare `pwd` / `git rev-parse --show-toplevel` against each worktree path, mark matches as such, and exclude them from the removable set.

### 4. Present the summary and get one consolidated approval

Use `AskQuestion` with `allow_multiple: true`. Group by category in the prompt so the user can scan it. For each removable entry, the option label should include path, branch, and reason. Example option labels:

- `merged: ../more-dcr-oauths (branch more-dcr-oauths)`
- `missing: ../old-experiment (branch old-experiment)`
- `dirty: ../wip-bar (branch wip/bar) — has uncommitted changes`

For dirty / unpushed entries, surface them as separate options so the user can opt in to force-removing if they really want to.

### 5. Execute confirmed removals

For each confirmed worktree:

```bash
git worktree remove <path>            # safe path
git worktree remove --force <path>    # only if user opted in for dirty
git branch -d <branch>                # safe delete (refuses if unmerged)
git branch -D <branch>                # only if user opted in (squash-merged or force); squash-merges leave the branch ahead/unmerged in topology so `-d` refuses — confirm merge via `gh pr list` first
```

For **missing** entries, skip `remove` and rely on prune in the next step.

### 6. Finalize

```bash
git worktree prune
git worktree list   # show the user the new state
```

Report:

- Removed worktrees (with branch names)
- Skipped worktrees and why (dirty/unpushed/active)
- Any branch deletions that failed and why

## Anti-patterns

- Don't loop `git worktree remove --force` over every entry "to be safe". Force is for explicit user opt-in only.
- Don't delete branches before removing the worktree that has them checked out — `git branch -d` will fail with "checked out at ...". Order is: remove worktree, then delete branch.
- Don't trust a local "branch is behind origin/main" as proof of merge. Squash-merges leave the branch ahead and unmerged in topology; use `gh pr list --state merged --head <branch>` for that case.
- Don't run `git worktree prune` before listing — you'll lose the metadata you need to identify missing entries.
- Don't act without `git fetch --prune origin` first; otherwise "merged into origin/main" checks can be wrong.

## Example session

User: "clean up my worktrees"

Agent flow:

1. `git fetch --prune origin`
2. `git worktree list --porcelain` → 5 worktrees (1 primary + 4 others)
3. Classify:
   - `../nv-100-x` → merged-direct
   - `../nv-200-y` → merged-squash (PR #4321 merged)
   - `../nv-300-z` → dirty (3 modified files)
   - `../old-experiment` → missing on disk
4. `AskQuestion`: which of these to remove? (multi-select, dirty entry pre-flagged with a warning label)
5. User picks the two merged ones + missing.
6. `git worktree remove ../nv-100-x && git branch -d nv-100/x`
7. `git worktree remove ../nv-200-y && git branch -D nv-200/y` (squash-merge needed `-D`, user confirmed)
8. `git worktree prune` (cleans up `../old-experiment`)
9. Report: 3 removed, 1 skipped (dirty), final `git worktree list`.

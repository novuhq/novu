---
name: nv-background-implement
description: >-
  Implement a feature or refactor via a single subagent on an isolated git
  worktree: plan-first implementation, thermo-nuclear code quality review,
  apply review fixes, then merge the worktree branch back into the parent
  branch and clean up. Use when the user asks to run a change "in a subagent
  with a worktree", wants isolated implementation merged back, or invokes
  /nv-subagent-implement. For multi-slice parallel fan-out use nv-implement
  instead.
disable-model-invocation: true
---

# nv-subagent-implement

One task → one subagent on its own worktree branch → strict review → merge back to the parent branch. Invoking this skill authorizes the commits it produces (implementation, review-fix, and merge commits).

## Workflow

```
- [ ] 1. Preflight + scope the task
- [ ] 2. Launch implementation subagent (isolated worktree)
- [ ] 3. Thermo-nuclear review on the worktree branch
- [ ] 4. Apply review fixes in the worktree, commit
- [ ] 5. Merge back into parent branch
- [ ] 6. Teardown (worktree + branch)
```

### 1. Preflight + scope

From the main checkout record:

```bash
git branch --show-current   # PARENT_BRANCH
git rev-parse HEAD          # BASE_SHA
git status --porcelain      # note dirty files — do NOT block; stash later if merge needs it
git worktree list
```

Before launching, ripgrep the symbols/params involved so the subagent prompt can list **concrete known touchpoints** (files + symbols). A vague prompt produces a vague slice.

### 2. Launch implementation subagent

Use `Task` with `subagent_type: best-of-n-runner` (it provisions its own worktree + branch), `run_in_background: true`. The subagent sees nothing of the conversation — the prompt must be self-contained:

- **Parent context**: parent branch, repo path, one-sentence goal.
- **Scope boundaries**: exact concept in scope; name similar-but-unrelated symbols to leave alone; work only inside the worktree; do not push; never edit `libs/internal-sdk`; Novu conventions (named exports, blank line before `return`, frontend `type` / backend `interface`, no nested ternaries).
- **Known touchpoints**: numbered file list from preflight, plus the ripgrep terms to re-verify.
- **Required workflow**: plan doc first at `docs/agents/plans/<task>.md` (files/symbols, compat notes, verification), then full implementation — not plan-only; update tests and run the relevant unit specs; commit `type(scope): why`; do NOT merge — the parent agent merges.
- **Return contract**: worktree absolute path, branch name, commit SHAs, plan doc path, files-changed summary, test commands + results, intentionally-kept references with reasons, risks/follow-ups.

While it runs, end the turn — the completion notification carries the report.

### 3. Thermo-nuclear review

Launch `Task` with `subagent_type: thermo-nuclear-code-quality-review` against the **worktree** path:

```
Full Repository Path: <worktree-path>
Diff: branch changes
Custom Instructions: Review only commits since base <BASE_SHA> on branch <worktree-branch>.
<one-paragraph description of the change + what to focus on / what NOT to flag>
If actionable structural issues exist, list concrete file-level fixes; otherwise approve.
```

**Done when:** verdict received. Approval with fixes → step 4. Blockers → resume the implementation subagent with the findings, then re-review.

### 4. Apply review fixes

Apply approved-with-nit fixes directly in the worktree (small, mechanical ones yourself; structural ones via `resume` on the implementation subagent). Commit in the worktree:

```bash
git -C <worktree-path> add <files> && git -C <worktree-path> commit -m "refactor(scope): <review fix>"
```

Lint-staged hooks run on commit — let them.

### 5. Merge back

From the main checkout on PARENT_BRANCH. If parent WIP touches files the merge also touches, stash around the merge:

```bash
git stash push -m "wip before <task> merge" -- <dirty-files>   # only if needed
git merge --no-ff <worktree-branch> -m "merge: <task summary>"
git stash pop                                                   # if stashed
```

**Done when:** merge commit exists on PARENT_BRANCH, WIP restored unstaged, `git status -sb` matches pre-merge dirty set.

### 6. Teardown

```bash
git worktree remove <worktree-path>
git branch -d <worktree-branch>      # -d, not -D: proves it merged
git worktree prune
```

**Done when:** `git worktree list` shows only the main checkout and the branch is deleted.

## Guardrails

- One subagent, one worktree, one branch. If the work needs multiple disjoint slices in parallel, switch to `nv-implement`.
- Never push the worktree branch or the parent branch — merging back is local; the user decides when to push.
- Don't run `pnpm setup:agent` / full installs in the worktree; the parent checkout is already configured.
- Report honestly: subagent test results, review verdict, and any risks (e.g. persisted data still containing removed keys) go in the final summary.

## Related skills

- [nv-implement](../nv-implement/SKILL.md) — parallel multi-slice variant
- [nv-worktree-commands](../nv-worktree-commands/SKILL.md) — worktree command reference
- `/thermo-nuclear-code-quality-review` — the review gate used in step 3

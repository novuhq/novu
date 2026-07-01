---
name: nv-review-local-changes
description: >-
  Commit local changes as a baseline, run a thermo-nuclear code quality review scoped
  to ONLY that commit, then commit the resulting refactor as a separate follow-up
  commit. Use when the user asks to review their local/uncommitted changes for AI slop
  and redundant code, or invokes nv-review-local-changes.
disable-model-invocation: true
---

# Review Local Changes (commit → nuclear review → refactor commit)

A three-commit workflow: snapshot the current work as a baseline commit, audit **only
that commit** with the thermo-nuclear code quality review, then land the cleanup as its
own follow-up commit. Keeps the feature diff and the review-driven refactor separately
reviewable.

Invoking this skill authorizes the two commits it creates (steps 1 and 3). Do not amend
or squash the baseline commit.

## Workflow

```
- [ ] 1. Baseline commit (the work to review)
- [ ] 2. Thermo-nuclear review scoped to that commit only
- [ ] 3. Triage + fix, then a separate refactor commit
```

### 1. Baseline commit

- Inspect first (parallel): `git status`, `git diff` (staged + unstaged), `git log --oneline -15` for message style.
- Stage the cohesive change only: if the user already staged files, commit those; otherwise stage the related modified files. Exclude unrelated local edits.
- Commit with the repo's conventional style — `type(scope): concise why` (scopes: `dashboard`, `api-service`, `worker`, `shared`, …). Use a HEREDOC for the message.
- `lint-staged` + `biome check --write` run on commit and may auto-format staged files; the commit still succeeds. If a hook *fails*, fix and make a new commit (never `--amend`).
- Capture the baseline SHA immediately after committing — this is the ONLY review target:

```bash
git rev-parse HEAD   # BASE_SHA
```

### 2. Thermo-nuclear review — scoped to BASE_SHA only

Gather the exact scope, then launch **one** `thermo-nuclear-code-quality-review` subagent (Task tool, `readonly: true`, foreground so you can act on results):

```bash
git show <BASE_SHA> --stat     # changed file list
git show <BASE_SHA>            # committed diff to paste into the prompt
```

Subagent prompt template:

~~~
Perform a thermo-nuclear code quality review scoped STRICTLY to a single commit. Load
and apply the rubric from the `thermo-nuclear-code-quality-review` skill.

SCOPE (critical): Review ONLY the lines changed in commit <BASE_SHA>. You may READ full
files for context, but every finding MUST point at a line introduced/modified by this
commit. Do not report on pre-existing code or the wider branch.

Full Repository Path: <repo path>
Commit under review: <BASE_SHA> "<subject>"
Changed files (read full current contents for context):
- <path 1>
- <path 2> ...

The committed diff:
```diff
<paste `git show <BASE_SHA>` diff>
```

Focus on: AI slop, redundant/dead code, duplicated logic, unnecessary abstractions or
props, inverted/confusing boolean naming, and state-management smells (redundant state
vs derived values, effect misuse, stale-closure/dep-array issues). For every finding
give: file, specific symbol/line from this commit, severity, WHY it's a problem, and a
concrete minimal fix. Separate must-fix from optional. Skip nitpicks that don't affect
correctness or maintainability. Do NOT modify files — return findings only.
~~~

### 3. Triage, fix, and refactor commit

- **Verify before deleting**: confirm each dead-code/redundancy claim with `Grep` (call sites, setters, other callers) — do not trust the review blindly.
- Apply **must-fix** and high-value findings as **behavior-preserving** edits. Defer intentional or low-value findings and state the reason to the user.
- Don't expand scope or add features during triage.
- After edits: `ReadLints` on every touched file; `Grep` for stale identifiers after any rename. Only fix pre-existing lints if necessary.
- **Concurrency guard**: before staging, confirm no one else committed — `git rev-parse HEAD` must still equal `BASE_SHA`, and `git status --porcelain` should list only your triage-touched files. If `HEAD` moved, stop and re-scope: a parallel agent committed into this tree.
- Stage only the triage-touched files and make a **new** commit (never amend BASE_SHA):

```bash
git commit -m "$(cat <<'EOF'
refactor(<scope>): <what was removed/renamed and why>
EOF
)"
```

- Confirm the history: `git log --oneline -3` shows BASE_SHA then the refactor commit.

## Parallel agents / isolation

The git index and working tree are shared, process-global state — this skill assumes **one agent per working tree** and does not coordinate concurrent agents. Two agents in the same checkout will cross-stage each other's files, capture the wrong `BASE_SHA`, and stack commits on the wrong base.

- **Preferred**: run each agent in its own branch + worktree created with [nv-worktree-create](../nv-worktree-create/SKILL.md) before running this skill — an isolated index/tree/branch means agents physically cannot clobber each other's staging or history.
- **Always tear the worktree down when done** so no orphan worktrees/branches accumulate:
  1. Preserve the work first — its commits must be pushed, turned into a PR, or handed back to the orchestrator. Never delete a worktree whose commits aren't captured somewhere.
  2. `move_agent_to_root` out of the worktree — you cannot remove the worktree you are sitting in.
  3. Remove the worktree + branch via [nv-worktree-cleanup](../nv-worktree-cleanup/SKILL.md). Never force-remove a dirty/unpushed worktree without explicit confirmation — that silently drops commits.
- **If sharing one tree is unavoidable**: serialize — only one agent runs steps 1–3 at a time — and rely on the guards above (`HEAD == BASE_SHA`, explicit-path staging, `git status --porcelain` check). Effective parallelism is lost.

## Guardrails

- Keep the commits separate: baseline (step 1) and, when refactors are applied, the refactor (step 3). Never squash them or `--amend` the baseline.
- The review targets the single baseline commit only — never the whole branch.
- If the review surfaces nothing worth fixing, skip step 3 and report a clean result.
- Do not push or open a PR unless the user asks.

## Related skills

- `thermo-nuclear-code-quality-review` — the audit rubric used in step 2
- `deslop` — remove AI slop from a diff
- [nv-worktree-create](../nv-worktree-create/SKILL.md) — isolate parallel agents in their own branch + worktree
- [nv-worktree-cleanup](../nv-worktree-cleanup/SKILL.md) — tear down the worktree + branch when done
- [novu-prepare-pr](../novu-prepare-pr/SKILL.md) — full post-implementation PR prep

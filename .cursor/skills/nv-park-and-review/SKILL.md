---
name: nv-park-and-review
description: >-
  Commit local changes as a baseline, hop into a lightweight review worktree, run a
  thermo-nuclear code quality review scoped to ONLY that commit, commit the resulting
  refactor as a separate follow-up commit, then land it back and tear the worktree
  down. Use when the user asks to review their local/uncommitted changes for AI slop
  and redundant code, or invokes nv-park-and-review.
disable-model-invocation: true
---

# Park and Review (commit → worktree → nuclear review → refactor commit)

Snapshot the current work as a baseline commit, immediately exit to a throwaway review
worktree, audit **only that commit** with the thermo-nuclear code quality review, then
land the cleanup as its own follow-up commit. Keeps the feature diff and the
review-driven refactor separately reviewable, and frees the main checkout the moment
the baseline is committed.

Invoking this skill authorizes the two commits it creates (steps 1 and 4). Do not amend
or squash the baseline commit.

## Workflow

```
- [ ] 1. Baseline commit (the work to review)
- [ ] 2. Exit to a review worktree (one command)
- [ ] 3. Thermo-nuclear review scoped to that commit only
- [ ] 4. Triage + fix, then a separate refactor commit
- [ ] 5. Land back on the original branch + teardown
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

### 2. Exit to a review worktree — immediately after the commit

Move the rest of the workflow (review, triage edits, refactor commit) out of the main
checkout so it is free for other work. Do **not** use `nv-worktree-create` here — a
single lightweight command is enough; no env copying, install, or build is needed for a
review pass:

```bash
git worktree add -b review/<branch>-<BASE_SHA:0:7> ../review-<BASE_SHA:0:7> <BASE_SHA>
```

- From here on, run every command and file edit inside the worktree path — never touch
  the main checkout until step 5.
- Abort and fall back to reviewing in place if the worktree path already exists.

### 3. Thermo-nuclear review — scoped to BASE_SHA only

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

Full Repository Path: <worktree path>
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

### 4. Triage, fix, and refactor commit — in the worktree

- **Verify before deleting**: confirm each dead-code/redundancy claim with `Grep` (call sites, setters, other callers) — do not trust the review blindly.
- Apply **must-fix** and high-value findings as **behavior-preserving** edits. Defer intentional or low-value findings and state the reason to the user.
- Don't expand scope or add features during triage.
- After edits: `ReadLints` on every touched file; `Grep` for stale identifiers after any rename. Only fix pre-existing lints if necessary.
- Stage only the triage-touched files and make a **new** commit (never amend BASE_SHA):

```bash
git commit -m "$(cat <<'EOF'
refactor(<scope>): <what was removed/renamed and why>
EOF
)"
```

- Confirm the history: `git log --oneline -3` shows BASE_SHA then the refactor commit.

### 5. Land back on the original branch + teardown

From the **main checkout**, fast-forward the original branch onto the review branch,
then remove the worktree — plain commands, no cleanup skill needed:

```bash
git merge --ff-only review/<branch>-<BASE_SHA:0:7>
git worktree remove ../review-<BASE_SHA:0:7>
git branch -d review/<branch>-<BASE_SHA:0:7>
```

If `--ff-only` fails, the original branch moved while you were reviewing — do not
force anything; report the divergence and leave the review branch in place for the
user to reconcile.

## Guardrails

- Keep the commits separate: baseline (step 1) and, when refactors are applied, the refactor (step 4). Never squash them or `--amend` the baseline.
- The review targets the single baseline commit only — never the whole branch.
- If the review surfaces nothing worth fixing, skip step 4, and in step 5 just remove the worktree and branch (nothing to merge) and report a clean result.
- Do not push or open a PR unless the user asks.

## Related skills

- `thermo-nuclear-code-quality-review` — the audit rubric used in step 3
- `deslop` — remove AI slop from a diff
- [nv-worktree-commands](../nv-worktree-commands/SKILL.md) — worktree command reference if the lightweight setup needs debugging
- [novu-prepare-pr](../novu-prepare-pr/SKILL.md) — full post-implementation PR prep

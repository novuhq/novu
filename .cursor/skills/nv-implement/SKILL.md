---
name: nv-implement
description: Implement planned work by fanning out parallel subagents on isolated worktrees — TDD at pre-agreed seams, per-slice nv-park-and-review, merge back, full suite once at the end.
disable-model-invocation: true
---

# nv-implement

Implement the work described (plan file, spec, or ticket) as **vertical slices**, one subagent per slice, each on its own worktree. Use `/tdd` where possible, at pre-agreed seams. Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Invoking this skill authorizes the commits it produces (slice commits, review refactor commits, merge commits, and integration fixes).

## Workflow

```
- [ ] 1. Cut the work into seams
- [ ] 2. Resolve feature branch + one worktree per seam
- [ ] 3. Fan out subagents (TDD → commit → /nv-park-and-review)
- [ ] 4. Merge slices back into the feature branch
- [ ] 5. Integration pass (typecheck + cross-slice fallout + thermo-nuclear review)
- [ ] 6. Full suite once + teardown
```

### 1. Cut the work into seams

Split the plan into slices that touch **disjoint files** — each slice independently committable and testable. Typical Novu cuts: policy/backend logic, create-path + migration, copy/DTO/docs, dashboard UI.

For each seam decide upfront: is it TDD-able (public function, use case, resolver → yes) or verify-by-lint (dashboard UI with no unit harness → no)? Tell the subagent which.

**Done when:** every plan item is owned by exactly one seam, and no two seams edit the same file. If two seams must touch the same file, merge them into one slice — do not parallelize a conflict.

### 2. Resolve feature branch + one worktree per seam

Detect the integration target first (`git branch --show-current`):

- **Already on a feature branch** (anything other than `next` / `main` / `master`): treat the current branch as `<feature-branch>`. Do not create a new branch from `origin/next`. Slice worktrees branch from this HEAD; all merges go back here.
- **On `next` / `main` / `master` (or detached):** create a new feature branch from `origin/next`, then proceed.

```bash
git fetch origin next
# only when starting fresh from next/main/master:
git checkout -b <feature-branch> origin/next

# always — slice branches from current feature-branch HEAD:
git worktree add -b <feature-branch>-<seam> ../wt-<seam> HEAD
```

Symlink dependencies into each worktree (no install needed):

```bash
ln -s <main-checkout>/node_modules ../wt-<seam>/node_modules
```

**Done when:** `<feature-branch>` is set (existing or newly created), and `git worktree list` shows one worktree per seam, all at that feature branch HEAD.

### 3. Fan out subagents

Launch all slice subagents **in one message** (parallel Task calls, `run_in_background: true`). Each prompt must carry full context — subagents see nothing of this conversation. Include:

- Worktree path + branch; hard boundary: work ONLY there
- The slice's goal and the locked product decisions it depends on
- Exact files to change and files owned by **other** slices (do not touch)
- `/tdd` instruction for TDD-able seams: vertical slices, one behavior at a time, with the prioritized behavior list
- The test command (see Commands below) and instruction to run single spec files regularly
- Closing step: commit with `type(scope): why`, then run `/nv-park-and-review` from the worktree

**Done when:** every subagent reports commits + test results + review triage. Read each summary; a subagent that skipped review or left tests red gets resumed, not merged.

### 4. Merge slices back into the feature branch

From the main checkout, on `<feature-branch>` (the same branch resolved in step 2 — never merge slices into `next` directly):

```bash
git merge --no-ff <feature-branch>-<seam> -m "merge: <slice summary>"
```

Merge in dependency order (backend policy before tests that rely on it). Then remove worktrees and delete slice branches.

**Done when:** all slice branches merged into `<feature-branch>`, `git worktree list` shows only the main checkout, slice branches deleted.

### 5. Integration pass

Slices were reviewed in isolation — the seams between them were not. Expect cross-slice fallout: one slice changed copy while another slice's spec asserts the old string; one slice widened a type another slice consumes.

1. Typecheck: `pnpm exec nest build` in `apps/api`; `ReadLints` on dashboard files
2. Run every spec file touched by any slice, together, from the main checkout
3. Fix fallout as small commits on the feature branch
4. Launch **one** `thermo-nuclear-code-quality-review` subagent over the full feature-branch diff (merge-base with `origin/next` → HEAD) — the main agent runs this, not a slice. Fix valid findings as small commits; re-run touched specs after.

**Done when:** typecheck is clean, all touched spec files pass in one run, and the whole-diff review is done with valid findings addressed.

### 6. Full suite once + teardown

Run the full relevant suite once (e.g. all `src/app/agents/**/*.spec.ts`). Report genuinely-related failures fixed; unrelated environmental failures named as such — not silently ignored, not chased.

**Done when:** suite result reported with pass/fail counts and any unrelated failures explained.

## Commands (Novu)

```bash
# API typecheck (catches what TS_NODE_TRANSPILE_ONLY hides)
cd apps/api && pnpm exec nest build

# Single spec file(s) — mocha, from apps/api
TS_NODE_PROJECT=tsconfig.spec.json TS_NODE_TRANSPILE_ONLY=true NODE_ENV=test \
NOVU_ENTERPRISE=true CLERK_ENABLED=true NEW_RELIC_ENABLED=false \
NODE_OPTIONS=--no-experimental-strip-types \
npx mocha --timeout 15000 --require ts-node/register --exit --no-config 'src/path/to/file.spec.ts'
```

Dashboard has no unit harness for most components — verify via `ReadLints`; do not invent a test harness.

## Guardrails

- If the checkout is already on a feature branch, reuse it — do not branch from `origin/next` or merge slices into `next`.
- One slice, one worktree, one branch — a subagent that edits outside its worktree corrupts a sibling slice.
- Slice commits and review refactor commits stay separate (per `/nv-park-and-review`); never amend or squash them during merge.
- E2E suites that need a running API/DB are out of scope for slices — flag them for CI instead.
- If a Linear ticket is required for the eventual PR, create it early; hand off to `/novu-prepare-pr` when implementation is done.

## Related skills

- `/tdd` — the red-green loop each TDD-able slice runs
- `/nv-park-and-review` — each slice's closing review
- `thermo-nuclear-code-quality-review` — the whole-diff audit in step 5
- [novu-prepare-pr](../novu-prepare-pr/SKILL.md) — PR prep after implementation
- [nv-worktree-commands](../nv-worktree-commands/SKILL.md) — worktree debugging reference

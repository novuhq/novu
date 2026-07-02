---
name: address-pr-review
description: >-
  Critically triage pull request review comments against PR requirements and
  codebase reality, implement only valid fixes, and reply only when declining a
  suggestion. Use when the user asks to address PR comments, review feedback,
  CodeRabbit/Bugbot threads, or `/address-pr-review`.
---
# Address PR Review

Implement review feedback on the active PR **only when it holds up under scrutiny**. Do not treat comments as a todo list — evaluate each one against the PR's actual requirements, intended behavior, and codebase reality before changing anything.

**Do not reply or resolve threads for fixes you land.** Reply on GitHub **only** when you decide not to implement something (or need clarification).

## Critical evaluation (read first)

Review comments are suggestions, not orders. Before touching code, answer:

1. **What is this PR trying to accomplish?** Read the PR title/description, Linear ticket if present, and the diff. A comment that contradicts the stated goal is a decline, not a fix.
2. **Is the comment still valid?** Read current code at the cited path — many bot comments are stale after prior commits.
3. **Is there a real problem?** Distinguish:
   - **Real bug / security / correctness gap** → fix if in scope
   - **Missing validation the API contract already promises** → fix
   - **Style, refactor, or "nice to have"** → usually decline unless project rules require it
   - **Bot false positive** → decline with reason
   - **Out of scope for this PR** → decline; note if it should be a follow-up ticket
4. **Does the suggested fix match project conventions?** Prefer existing patterns in the repo over the reviewer's generic advice.
5. **What is the blast radius?** Avoid drive-by refactors, new abstractions, or scope creep while "addressing feedback."

When in doubt, **do not implement** — reply asking for clarification or declining with a short rationale. Blindly applying every CodeRabbit/Bugbot comment is a failure mode.

## Workflow

```
Progress:
- [ ] 1. Resolve active PR
- [ ] 2. Fetch unresolved review threads only
- [ ] 3. Triage each comment
- [ ] 4. Implement valid fixes (minimal diff)
- [ ] 5. Reply only for declined items
- [ ] 6. Validate, commit, push
- [ ] 7. Summarize for the user
```

### 1. Resolve active PR

```bash
gh pr view --json number,url,headRefName,baseRefName
```

If ambiguous, use the branch the user is on.

### 2. Fetch unresolved threads

Use GraphQL. Read **only** thread metadata and the first comment body per thread — not full JSON dumps.

```bash
gh api graphql -f query='
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      reviewThreads(first: 50) {
        nodes {
          id
          isResolved
          comments(first: 1) {
            nodes {
              databaseId
              author { login }
              path
              line
              body
            }
          }
        }
      }
    }
  }
}' -f owner=ORG -f name=REPO -F number=PR_NUMBER \
  --jq '.data.repository.pullRequest.reviewThreads.nodes[]
    | select(.isResolved == false)
    | {threadId: .id, commentId: .comments.nodes[0].databaseId,
       author: .comments.nodes[0].author.login,
       path: .comments.nodes[0].path, line: .comments.nodes[0].line,
       body: .comments.nodes[0].body}'
```

Skip resolved threads. For each unresolved thread, read the minimum file context needed to act.

### 3. Triage each comment

Establish PR context **before** triaging individual threads: skim the PR description, ticket acceptance criteria, and files changed so you know what "correct" looks like.

For every unresolved thread, decide:

| Verdict | Action on GitHub | Action in code |
|---------|------------------|----------------|
| **Valid — fix** | **Nothing** (no reply, do not resolve) | Implement minimal fix |
| **Invalid / out of scope / already fixed / not worth it** | Reply with brief reason | No change |
| **Unclear** | Reply asking one focused question | No change until clarified |

**Fix only when all of these are true:**

- The comment identifies a real issue (or a gap vs stated requirements), not just a preference.
- The fix belongs in **this** PR, not a separate cleanup.
- You can verify the problem in current code (not from stale diff context).
- The change is proportional — smallest diff that solves the actual problem.

**Decline (with reply) when:**

- The suggestion conflicts with PR requirements or product intent.
- Behavior is already correct; the reviewer misread the code.
- The comment is stylistic/refactor noise without measurable benefit.
- Bot analysis is wrong or low-confidence (common for CodeRabbit nits).
- Maintainer or prior thread already decided otherwise.
- Fixing it would expand scope, add risk, or violate project rules.

Validate before acting:

- Re-read the PR goal and ticket — does this comment serve it?
- Read current code at the cited path — comments may be stale after prior commits.
- Trace the code path: would the suggested change actually fix the reported issue?
- Bugbot/CodeQL: fix only confirmed issues; decline false positives with a one-line reason.
- Prefer project conventions over reviewer preference when they conflict.
- Do not expand scope beyond what the comment requires — and skip comments that *should* be out of scope.

### 4. Implement fixes

- One focused commit (or small logical commits) for review-driven changes.
- Run targeted build/tests for touched areas.
- Push to the PR branch.

**Do not** post "fixed in …" replies or resolve threads for implemented fixes.

### 5. Reply only for declined items

Use the REST API to reply **in thread** only when not implementing:

```bash
gh api repos/OWNER/REPO/pulls/PR_NUMBER/comments -X POST \
  -f body="Not implementing: <concise reason>." \
  -F in_reply_to=COMMENT_DATABASE_ID
```

Reply tone: factual, one or two sentences, no debate.

**Do not** call `resolveReviewThread` unless the user explicitly asks to resolve threads.

Example decline replies:

- `Not implementing: @novu/thalamus is an internal package; maintainer confirmed the bump is intentional.`
- `Not implementing: this path is already covered by <other validation>; no behavior change needed.`
- `Not implementing: out of scope for this PR — tracked separately in NV-XXXX.`

### 6. Summarize for the user

Report:

1. **Fixed** — bullet list (path + one-line what changed + why it was a real issue). No GitHub reply was posted.
2. **Declined** — bullet list with reason + link to your reply if posted.
3. **Skipped / stale** — comments that needed no action and why (including "already correct" or "stale after commit X").
4. **Follow-ups** — anything blocking merge (CI, human review, open questions).

Include counts when useful (e.g. "3 fixed, 7 declined, 2 stale") so it is obvious you triaged critically rather than rubber-stamping.

## Rules

- **Be skeptical** — default is "does this comment make sense?" not "how do I apply it?"
- **Requirements first** — evaluate against PR/ticket intent, not comment volume.
- **Never** reply on GitHub for comments you fixed in code.
- **Never** resolve review threads as part of this workflow unless the user asks.
- **Always** reply when declining (or when unclear and you need an answer), with a clear reason.
- Keep diffs minimal; do not refactor unrelated code.
- Do not change CI/workflows just to silence checks.
- It is OK to fix **few** comments and decline **many** — that is often the right outcome.

## Related skills

- `novu-prepare-pr` — full PR prep workflow including review feedback and CI.
- `babysit` — merge-ready loop (CI, conflicts, comments at a high level).
- `get-pr-comments` — read-only summary of feedback when not implementing yet.

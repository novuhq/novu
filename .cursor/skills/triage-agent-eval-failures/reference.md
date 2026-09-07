# Triage examples

Worked examples for the `triage-agent-eval-failures` skill. Each walks through evidence → verdict → fix target.

## Example 1: Real playbook regression — `usedDashboardOAuthWhenPrompted`

**Scenario:** `dashboard-prompt-login`  
**Failing grader:** `usedDashboardOAuthWhenPrompted` (deterministic)  
**Re-run result:** 5/5 failed → real

**Evidence:**

```
userPrompt: "I'm signed in to the Novu dashboard..."
trackedCommands: ["npx novu connect --keyless --channel slack"]
```

The grader in `catalog.ts` checks: when `userPrompt` mentions "signed in to the Novu dashboard", every `trackedCommands` entry must omit `--keyless`. The agent ran connect with `--keyless` anyway.

**Verdict:** Real — execution. The playbook did not steer the agent toward dashboard OAuth when the user says they are signed in.

**Fix target:** `packages/shared/docs/agent-onboarding.md` — clarify that dashboard-signed-in users must omit `--keyless`.

**Do not:** Loosen the grader to accept `--keyless` when the prompt mentions the dashboard.

---

## Example 2: Test bug — `readAuthUrlFile` with correct behavior

**Scenario:** `dashboard-prompt-login`  
**Failing grader:** `readAuthUrlFile` (deterministic)  
**Re-run result:** 5/5 failed → real (but test is wrong)

**Evidence:**

```
toolCalls: [
  { name: "Read", args: { file_path: "/project/novu-connect-auth-url.txt" } }
]
capturedUrls: ["https://auth.novu.test/oauth/device?code=abc"]
transcriptText: "Open https://auth.novu.test/oauth/device?code=abc to authorize"
```

The grader checks for `novu-connect-auth-url` in the Read path, `/oauth/device` in `capturedUrls`, or `/oauth/device` in the transcript. All three are satisfied.

**Verdict:** Test bug — grader. The failure reason may reference a path variant the check does not cover (e.g. relative vs absolute path in `file_path`). Inspect `catalog.readAuthUrlFile` for an overly narrow `includes('novu-connect-auth-url')` match.

**Fix target:** `src/suites/agent-onboarding/catalog.ts` — widen the Read path check or normalize paths before comparing.

**Do not:** Change the playbook; the agent already surfaced the auth URL correctly.

---

## Example 3: Flaky judge — `conclusionFirstReport`

**Scenario:** `dashboard-prompt-login`  
**Failing grader:** `conclusionFirstReport` (judge)  
**Re-run result:** 2/5 failed → flaky

**Evidence (passing run):**

```
finalText: "✓ Your agent is live. Open the dashboard to manage it: https://dashboard.novu.test/agents/dash-agent-1"
```

**Evidence (failing run, same agent output):**

```
finalText: "✓ Your agent is live. Open the dashboard to manage it: https://dashboard.novu.test/agents/dash-agent-1"
judge rationale: "The message leads with a success statement but then adds setup context before the next action."
```

The deterministic graders all pass. The judge prompt asks whether the first line states the CLI result followed by the single next action. The agent output is identical; only the judge verdict flips.

**Verdict:** Flaky judge. Non-deterministic LLM grading on a borderline structure.

**Fix target:** Either sharpen `judgePrompts.conclusionFirstReport` in `catalog.ts` with explicit pass/fail examples, or accept variance and track pass@k. Do not edit the playbook for a 2/5 flake.

**Note:** A judge returning `UNKNOWN` scores as `skip` (pass). An `UNKNOWN` is not a regression signal.

---

## Example 4: Test bug — stale tape chunk

**Scenario:** `dashboard-prompt-login`  
**Failing grader:** `reportedSuccess` (deterministic)  
**Re-run result:** 5/5 failed → real (but tape is wrong)

**Evidence:**

```
trackedCommands: ["npx novu connect --channel slack"]  // correct
polledShellIds: ["shell-1"]  // correct
transcriptText: "Waiting for connect to finish..."  // agent never saw success stdout
```

The agent polled the background shell but the final transcript never contains "agent is live". The tape in `scenario.ts` emits success stdout in the last chunk, but `connectTape` validation rejected the command before replay (e.g. `requireNoKeyless: true` but parser flags differ).

**Verdict:** Test bug — tape/scenario. The fixture did not replay the expected CLI output; the agent behaved correctly given what it received.

**Fix target:** `scenarios/dashboard-prompt-login/scenario.ts` — fix `tape` chunks or `connectTape` validation flags. Check `connect-parser.ts` if parsed flags do not match tape `when` conditions.

**Do not:** Change the playbook to tell the agent to report success when the CLI gave no success signal.

---

## Example 5: Real playbook regression — `confirmedBeforeRun`

**Scenario:** `persona-infra-exclusion`  
**Failing grader:** `confirmedBeforeRun` (deterministic)  
**Re-run result:** 5/5 failed → real

**Evidence:**

```
toolCalls: [
  { name: "Bash", args: { command: "npx novu connect ..." } },  // index 0
  { name: "AskUserQuestion", result: { selectedId: "approve" } }  // index 2
]
```

The grader requires an `AskUserQuestion` with `selectedId: "approve"` **before** the first connect `Bash` call. Connect ran first.

**Verdict:** Real — execution. The playbook does not enforce (or the agent ignored) the confirm-before-run step.

**Fix target:** `packages/shared/docs/agent-onboarding.md` — strengthen the approval picker requirement before running connect.

**Do not:** Remove or weaken `catalog.confirmedBeforeRun`.

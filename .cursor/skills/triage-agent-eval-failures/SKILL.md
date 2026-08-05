---
name: triage-agent-eval-failures
description: Triage failing @novu/agent-evals scenarios to decide whether a failure is real or flaky, and whether to fix the playbook/prompt or the test (grader, tape, scenario, or judge). Use when an agent-evals scenario fails, when the user asks why an eval is red, or when deciding whether to fix the test or the prompt.
---

# Triage Agent Eval Failures

Diagnose a failing scenario in `libs/agent-evals` and produce a verdict: is the failure **real** (the playbook under test regressed) or is the **test** wrong (grader / tape / scenario / judge), or is it just **flaky** (model non-determinism)?

The thing under test is the playbook doc (`packages/shared/docs/agent-onboarding.md`), injected as the agent system prompt. Everything else (`graders.ts`, `catalog.ts`, `scenario.ts`, judge prompts) is test scaffolding. **Never fix the playbook to satisfy a broken grader, and never loosen a grader to hide a real playbook regression.**

## Rule 0: rule out flakiness before changing anything

Scenarios run a live model concurrently, so one red run is one sample, not a verdict. Re-run the single failing scenario 3–5× first:

```bash
pnpm --filter @novu/agent-evals exec vitest run --config vitest.evals.config.ts -t <scenario-id>
```

- Fails **every** run → deterministic failure, continue triage.
- Fails **intermittently** → flaky. The cause is usually a non-deterministic judge grader or an over-strict regex. Do not edit the playbook. Tighten the grader/judge prompt or accept variance; consider pass@k rather than single-run gating.

To reproduce judge graders locally:

```bash
pnpm --filter @novu/agent-evals exec vitest run --config vitest.evals.config.ts -t <scenario-id>
```

## Step 1: identify which grader failed and its kind

Each scenario registers graders in `scenarios/<id>/graders.ts`. The **kind** is the strongest triage signal:

- **Deterministic** graders (`catalog.*`, `contains`, `matches`) inspect the structured `RunResult`. A fail means the agent's actions/output objectively did not match — or the check is too strict.
- **Judge** graders (`sharedJudgeGraders`, `judge(...)`) call a second LLM pass. A fail is fuzzy and can be the judge prompt's fault, not the agent's.

Find the grader's logic:

| Layer | Location |
| --- | --- |
| Per-scenario grader wiring | `src/suites/agent-onboarding/scenarios/<id>/graders.ts` |
| Deterministic grader bodies | `src/suites/agent-onboarding/catalog.ts` (`catalog` object) |
| Judge prompts | `catalog.ts` (`judgePrompts`) + `sharedJudgeGraders` |
| Generic helpers | `src/core/graders.ts` (`contains`, `matches`, `toolCallsNamed`, `transcriptText`) |
| Judge mechanics | `src/core/judge.ts` (returns `skip` on `UNKNOWN`) |

## Step 2: read the RunResult evidence

Graders read fields off `RunResult` (`src/core/types.ts`). Map the failing grader to the field it checks and compare against what the agent actually did in the run output:

- `trackedCommands` — raw connect command strings (flag checks like `--keyless`, `--secret-key`, `--slack-config-token`).
- `toolCalls` — every `Bash` / `BashOutput` / `AskUserQuestion` / `Read` call with args (`run_in_background`, `file_path`, picker `selectedId`).
- `polledShellIds` / `killedShellIds` — background-polling and kill behavior.
- `capturedUrls` / `openedFiles` — surfaced URLs and opened files (e.g. QR `.png`, auth-url file).
- `finalText` / `assistantMessages` — user-facing report (`transcriptText` joins these).
- `metadata.description` — the drafted agent description (persona / infra-token graders).

## Step 3: classify the failure

Walk top-down and stop at the first match:

| Symptom | Verdict | Fix target |
| --- | --- | --- |
| Agent never ran the tracked command / ignored an instruction it should follow | **Real — discovery** | Playbook `agent-onboarding.md` (instruction unclear/missing) |
| Deterministic grader fails and the `RunResult` confirms the agent genuinely did the wrong thing | **Real — execution** | Playbook `agent-onboarding.md` |
| Deterministic grader fails but `RunResult` shows the agent behaved correctly (regex too strict, wrong field, valid variant rejected) | **Test bug** | `catalog.ts` grader logic |
| Fails only on the scripted CLI path; tape stdout/`when`/`validate` or scripted answers are wrong or stale | **Test bug** | `scenario.ts` (`tape`, `scriptedAnswers`), `connect-parser.ts` |
| Judge grader fails but the description/report actually satisfies the criterion | **Test bug** | Judge prompt in `catalog.ts` (`judgePrompts`) |
| Judge verdict flips run-to-run | **Flaky judge** | Sharpen judge prompt; rely on `UNKNOWN`→`skip` escape hatch |
| Passes sometimes, fails sometimes, no clear cause | **Flaky** | Do not edit playbook; re-run (Rule 0) |

A scenario passes only when every active grader averages ≥ `0.8` (`JUDGE_THRESHOLD`). A judge returning `UNKNOWN` becomes `skip` and scores `1` — it never causes a fail, so an `UNKNOWN` is not evidence of a real regression.

## Step 4: apply one bounded fix, then verify

1. Change **only** the layer the verdict points to — playbook **or** test, never both to chase green.
2. Re-run the single scenario (Step 0 command).
3. Confirm the fix holds across the 3–5 re-runs and that no other scenario regressed.
4. If editing a deterministic grader, also run the synthetic unit tests so you don't break grader contracts:

```bash
pnpm --filter @novu/agent-evals test
```

## Output format

Report the verdict concisely with cited evidence:

```
Scenario: <id>
Failing grader: <name> (deterministic | judge)
Re-run result: <N/M failed> → real | flaky
Evidence: <RunResult field + actual vs expected>
Verdict: real playbook regression | test bug (<grader|tape|scenario|judge>) | flaky
Fix target: <file path>  (or: no change — flaky/UNKNOWN)
```

## Additional resources

For worked triage examples (real regression vs test bug vs flaky judge), see [reference.md](reference.md).

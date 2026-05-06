/**
 * Closure-state Stop hook.
 *
 * The Claude Agent SDK fires the `Stop` lifecycle hook every time the model
 * decides to end a turn. By returning `{ decision: 'block', reason: '...' }`
 * we force the model to keep working. Without this hook, an agent that
 * believes it has nothing to do (or that hits a silent permission denial)
 * just exits — which is exactly the failure mode that produced an empty
 * `Files changed: (none)` report on the user's first run.
 *
 * State machine, in order of priority:
 *
 * 1. Report has been written      → allow stop.
 * 2. We've already retried `maxRetries` times → allow stop (avoid loops).
 * 3. No tool calls made yet       → block with "do something" prompt.
 * 4. No edits/writes made yet     → block with "actually apply edits" prompt.
 * 5. Edits made but no report     → block with "now write the report" prompt.
 *
 * `WizardStopHookState` is mutated by `run-agent.ts` as messages stream in.
 * The hook itself only reads from it, so the closure is reentrant-safe even
 * if the SDK invokes `Stop` concurrently (it does not, but defending here
 * costs nothing).
 */

export interface WizardStopHookState {
  /** Set true when the agent calls `Write` with `novu-wizard-report.md`. */
  reportWritten: boolean;
  /** Total tool_use blocks observed across the run. */
  toolCallCount: number;
  /** Total `Write` / `Edit` / `mcp__novu__create_workflow` calls observed. */
  productiveCallCount: number;
}

export interface CreateStopHookOptions {
  /** Cap on how many times we'll re-prompt. Default 3. */
  maxRetries?: number;
}

/**
 * Loose shape of what the SDK feeds the hook. We deliberately don't import
 * `HookInput` from `@anthropic-ai/claude-agent-sdk` here so the Wizard build
 * stays independent of SDK type churn (the SDK is dynamically imported in
 * `iterator.ts`).
 */
export interface StopHookInputLike {
  hook_event_name?: string;
  stop_hook_active?: boolean;
}

export type SyncHookOutput =
  | Record<string, never>
  | {
      decision?: 'block' | 'approve';
      reason?: string;
      continue?: boolean;
      suppressOutput?: boolean;
      stopReason?: string;
      systemMessage?: string;
    };

export type StopHookCallback = (input: StopHookInputLike) => Promise<SyncHookOutput>;

export function createWizardStopHook(
  state: WizardStopHookState,
  options: CreateStopHookOptions = {}
): StopHookCallback {
  const maxRetries = options.maxRetries ?? 3;
  let retryCount = 0;

  return async (input: StopHookInputLike): Promise<SyncHookOutput> => {
    // Only act on Stop events; let any other hook type pass through cleanly.
    if (input.hook_event_name && input.hook_event_name !== 'Stop') {
      return {};
    }

    if (state.reportWritten) return {};

    if (retryCount >= maxRetries) return {};
    retryCount += 1;

    if (state.toolCallCount === 0) {
      return {
        decision: 'block',
        reason:
          "You haven't called any tools yet. The wizard is autonomous — do not ask the user anything. " +
          'Start now: (1) Read the relevant SKILL.md files installed in `.claude/skills/`, ' +
          '(2) make the canonical TodoWrite call, then (3) start applying edits with the Write/Edit tools. ' +
          'When you are genuinely done, your final action MUST be `Write ./novu-wizard-report.md`.',
      };
    }

    if (state.productiveCallCount === 0) {
      return {
        decision: 'block',
        reason:
          "You've explored the project but haven't applied any edits yet. The wizard runs in `acceptEdits` mode — " +
          'every Write/Edit/mcp__novu__create_workflow call is auto-approved, so apply your plan now. ' +
          "Don't write the report until you've done at least the package install, the Inbox component (if goal includes inbox), " +
          'and any workflow + trigger edits required by the goal.',
      };
    }

    return {
      decision: 'block',
      reason:
        "You've applied edits but haven't written the wizard report yet. " +
        'Your final action MUST be `Write ./novu-wizard-report.md` — the CLI reads this file ' +
        'to render the outro screen and surface what changed. Write it now and then stop.',
    };
  };
}

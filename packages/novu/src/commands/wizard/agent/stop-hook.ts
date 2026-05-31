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
 * State machine (parallel-fan-out variant), in order of priority:
 *
 * 1. We've already retried `maxRetries` times → allow stop (avoid loops).
 * 2. No tool calls made yet                  → block with "do something" prompt.
 * 3. No subagents dispatched yet             → block with "fan out now" prompt.
 * 4. Subagents dispatched, none completed yet → block with "wait for them" prompt.
 * 5. Some still in flight                    → block with "wait for them" prompt.
 * 6. All dispatched subagents completed      → allow stop (TS report writer takes over).
 *
 * `WizardStopHookState` is mutated by `run-agent.ts` as messages stream in.
 * The hook itself only reads from it, so the closure is reentrant-safe even
 * if the SDK invokes `Stop` concurrently (it does not, but defending here
 * costs nothing).
 */

export interface WizardStopHookState {
  /** Total tool_use blocks observed across the run. */
  toolCallCount: number;
  /** Total `Write` / `Edit` / `mcp__novu__create_workflow` calls observed. */
  productiveCallCount: number;
  /** Number of `Task` subagents the main agent has dispatched. */
  branchesDispatched: number;
  /** Number of dispatched subagents whose `tool_result` has been observed. */
  branchesCompleted: number;
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
    if (input.hook_event_name && input.hook_event_name !== 'Stop') {
      return {};
    }

    if (state.branchesDispatched > 0 && state.branchesCompleted >= state.branchesDispatched) {
      return {};
    }

    if (retryCount >= maxRetries) return {};
    retryCount += 1;

    if (state.toolCallCount === 0) {
      return {
        decision: 'block',
        reason:
          "You haven't called any tools yet. The wizard is autonomous — do not ask the user anything. " +
          'Start now: (1) Read the relevant SKILL.md files installed in `.claude/skills/`, ' +
          '(2) make the canonical TodoWrite call, then (3) survey the project, install Novu packages, ' +
          'and dispatch the three parallel `Task` subagents (Inbox / Workflows+Triggers / Subscribers).',
      };
    }

    if (state.branchesDispatched === 0) {
      const productiveHint =
        state.productiveCallCount === 0 ? "You've explored the project but haven't applied any edits yet. " : '';

      return {
        decision: 'block',
        reason:
          productiveHint +
          'Dispatch the three parallel `Task` subagents now (Inbox / Workflows+Triggers / Subscribers). ' +
          'Each subagent owns its own domain; the wizard waits for all of them before ending the run. ' +
          'Skip the Subscribers branch only if no auth provider was detected during the survey.',
      };
    }

    return {
      decision: 'block',
      reason:
        `You've dispatched ${state.branchesDispatched} subagent(s) but only ${state.branchesCompleted} have ` +
        'finished. Wait for every dispatched `Task` to return, then end the turn. The wizard CLI parses each ' +
        "subagent's structured JSON directly off the stream — do NOT aggregate or echo the results yourself.",
    };
  };
}

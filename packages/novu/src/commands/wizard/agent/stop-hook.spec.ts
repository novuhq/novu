import { describe, expect, it } from 'vitest';
import { createWizardStopHook, type WizardStopHookState } from './stop-hook';

function freshState(overrides: Partial<WizardStopHookState> = {}): WizardStopHookState {
  return {
    toolCallCount: 0,
    productiveCallCount: 0,
    branchesDispatched: 0,
    branchesCompleted: 0,
    ...overrides,
  };
}

describe('createWizardStopHook', () => {
  it("blocks the first stop with a 'do something' nudge when no tool calls happened", async () => {
    const hook = createWizardStopHook(freshState());
    const result = await hook({ hook_event_name: 'Stop' });
    expect(result.decision).toBe('block');
    expect(result.reason ?? '').toMatch(/haven't called any tools/i);
  });

  it('blocks until subagents are dispatched once tool calls happened', async () => {
    const state = freshState({ toolCallCount: 4, productiveCallCount: 2 });
    const hook = createWizardStopHook(state);
    const result = await hook({ hook_event_name: 'Stop' });
    expect(result.decision).toBe('block');
    expect(result.reason ?? '').toMatch(/Dispatch the three parallel `Task` subagents/i);
  });

  it('blocks while subagents are still running', async () => {
    const state = freshState({ toolCallCount: 8, branchesDispatched: 3, branchesCompleted: 1 });
    const hook = createWizardStopHook(state);
    const result = await hook({ hook_event_name: 'Stop' });
    expect(result.decision).toBe('block');
    expect(result.reason ?? '').toMatch(/dispatched 3 subagent\(s\) but only 1 have/i);
  });

  it('allows stopping once every dispatched subagent has completed', async () => {
    const state = freshState({ toolCallCount: 8, branchesDispatched: 3, branchesCompleted: 3 });
    const hook = createWizardStopHook(state);
    const result = await hook({ hook_event_name: 'Stop' });
    expect(result.decision).toBeUndefined();
  });

  it('allows stopping when only two branches were dispatched (subscribers skipped)', async () => {
    const state = freshState({ toolCallCount: 6, branchesDispatched: 2, branchesCompleted: 2 });
    const hook = createWizardStopHook(state);
    const result = await hook({ hook_event_name: 'Stop' });
    expect(result.decision).toBeUndefined();
  });

  it('caps re-prompts at maxRetries to avoid infinite loops', async () => {
    const state = freshState({ toolCallCount: 0 });
    const hook = createWizardStopHook(state, { maxRetries: 2 });

    expect((await hook({ hook_event_name: 'Stop' })).decision).toBe('block');
    expect((await hook({ hook_event_name: 'Stop' })).decision).toBe('block');
    expect((await hook({ hook_event_name: 'Stop' })).decision).toBeUndefined();
  });

  it('ignores non-Stop hook events', async () => {
    const hook = createWizardStopHook(freshState());
    const result = await hook({ hook_event_name: 'PreToolUse' });
    expect(result).toEqual({});
  });
});

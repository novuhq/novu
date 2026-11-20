import { describe, expect, it } from 'vitest';
import { getWorkflowRunLimit } from './usage-limits';

function settings(onDemandLimit: number | null, pauseAtLimit: boolean) {
  return { workflowRuns: { onDemandLimit }, pauseAtLimit };
}

describe('getWorkflowRunLimit', () => {
  it('adds the on-demand limit to the included runs', () => {
    expect(getWorkflowRunLimit(30_000, settings(10_000, false))).toBe(40_000);
  });

  it('keeps an on-demand limit of 0 at the included runs', () => {
    expect(getWorkflowRunLimit(30_000, settings(0, false))).toBe(30_000);
  });

  it('pauses at the included runs without an on-demand limit', () => {
    expect(getWorkflowRunLimit(30_000, settings(null, true))).toBe(30_000);
  });

  it('has no limit without an on-demand limit or pause', () => {
    expect(getWorkflowRunLimit(30_000, settings(null, false))).toBeNull();
  });
});

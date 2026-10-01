import { describe, expect, it } from 'vitest';
import { getWorkflowRunLimit } from './usage-limits';

describe('getWorkflowRunLimit', () => {
  it('adds the on-demand limit to the included runs', () => {
    expect(getWorkflowRunLimit(30_000, { onDemandLimit: 10_000, pauseAtLimit: false })).toBe(40_000);
  });

  it('keeps an on-demand limit of 0 at the included runs', () => {
    expect(getWorkflowRunLimit(30_000, { onDemandLimit: 0, pauseAtLimit: false })).toBe(30_000);
  });

  it('pauses at the included runs without an on-demand limit', () => {
    expect(getWorkflowRunLimit(30_000, { onDemandLimit: null, pauseAtLimit: true })).toBe(30_000);
  });

  it('has no limit without an on-demand limit or pause', () => {
    expect(getWorkflowRunLimit(30_000, { onDemandLimit: null, pauseAtLimit: false })).toBeNull();
  });
});

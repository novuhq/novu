import { describe, expect, it, vi } from 'vitest';
import type { InternalPlanHandle } from './plan-handle';
import { wrapToolsWithPlan } from './plan-track';

function fakePlanHandle() {
  return {
    upsertTask: vi.fn(),
    step: vi.fn(),
    title: vi.fn(),
    finish: vi.fn(),
    fail: vi.fn(),
  } as unknown as InternalPlanHandle & { upsertTask: ReturnType<typeof vi.fn> };
}

describe('wrapToolsWithPlan', () => {
  it('reports tool progress via getPlan on first activity', async () => {
    const plan = fakePlanHandle();
    const getPlan = vi.fn(() => plan);
    const tools = wrapToolsWithPlan(getPlan, {
      search: { execute: vi.fn().mockResolvedValue('ok') },
    });

    await tools.search.execute?.({}, { toolCallId: 'call_1' });

    expect(getPlan).toHaveBeenCalled();
    expect(plan.upsertTask).toHaveBeenCalledWith('call_1', expect.objectContaining({ status: 'complete' }));
  });

  it('does not resolve the plan before any tool runs', () => {
    const getPlan = vi.fn(() => fakePlanHandle());

    wrapToolsWithPlan(getPlan, { search: { execute: vi.fn() } });

    expect(getPlan).not.toHaveBeenCalled();
  });
});

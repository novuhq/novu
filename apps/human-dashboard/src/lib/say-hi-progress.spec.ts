import { describe, expect, it } from 'vitest';
import type { HostStatus } from './host-status';
import type { OnboardingState } from './onboarding-state';
import { legacyStepOf, resolveSayHiStep, stepNumberOf } from './say-hi-progress';

const STARTED = '2026-11-09T10:00:00.000Z';
const AGENT = { id: 'agent_1', createdAt: '2026-11-09T10:01:00.000Z', cardShown: null };
const MADE: OnboardingState = { startedAt: STARTED, agentId: 'agent_1' };

function status(fields: Partial<HostStatus> = {}): HostStatus {
  return {
    connected: false,
    lastCheckedAt: null,
    lastCheckedVia: null,
    hosts: [],
    firstCheckedAt: null,
    waitingMessage: null,
    ...fields,
  };
}

describe('the onboarding where the agent says hi', () => {
  it('names the agent first, then asks where it lives, then connects it', () => {
    expect(resolveSayHiStep(null, {}, null)).toBe('name');
    expect(resolveSayHiStep(AGENT, MADE, status())).toBe('host');
    expect(resolveSayHiStep(AGENT, { ...MADE, hostPickedAt: STARTED, pickedHost: 'chatgpt' }, status())).toBe(
      'connect'
    );
  });

  it('asks the agent to say hi once a host came in, through a code, a check or a sign-in', () => {
    const picked = { ...MADE, hostPickedAt: STARTED };

    expect(resolveSayHiStep(AGENT, picked, status({ connected: true }))).toBe('say-hi');
    expect(resolveSayHiStep(AGENT, picked, status(), true)).toBe('say-hi');
    // A host that connected before the operator picked one still counts.
    expect(resolveSayHiStep(AGENT, MADE, status({ connected: true }))).toBe('say-hi');
  });

  it('shows the card once the agent showed it, even before the page asked', () => {
    expect(resolveSayHiStep({ ...AGENT, cardShown: { at: STARTED } }, MADE, status())).toBe('said-hi');
    expect(resolveSayHiStep(AGENT, MADE, status({ connected: true, cardShown: { at: STARTED } }))).toBe('said-hi');
  });

  it('asks where the agent lives again after "Do it later"', () => {
    const skipped = { ...MADE, hostPickedAt: STARTED, skippedAt: '2026-11-09T10:05:00.000Z' };

    expect(resolveSayHiStep(AGENT, skipped, status())).toBe('host');
    expect(resolveSayHiStep(AGENT, { ...skipped, hostPickedAt: '2026-11-09T10:06:00.000Z' }, status())).toBe('connect');
  });

  it('has nothing for an agent the steps didn’t make, nor once the operator opened the inbox', () => {
    expect(resolveSayHiStep(AGENT, {}, status())).toBe('done');
    expect(resolveSayHiStep(AGENT, { ...MADE, finishedAt: STARTED }, status({ connected: true }))).toBe('done');
  });

  it('keeps the setup unfinished for the dashboard until a host connects, and never past it', () => {
    expect(legacyStepOf('name')).toBe('address');
    expect(legacyStepOf('host')).toBe('connect');
    expect(legacyStepOf('connect')).toBe('connect');
    expect(legacyStepOf('say-hi')).toBe('reach');
    expect(legacyStepOf('said-hi')).toBe('reach');
    expect(legacyStepOf('done')).toBe('done');
  });

  it('counts saying hi as the fourth step, before and after the card', () => {
    expect([stepNumberOf('name'), stepNumberOf('host'), stepNumberOf('connect')]).toEqual([1, 2, 3]);
    expect([stepNumberOf('say-hi'), stepNumberOf('said-hi')]).toEqual([4, 4]);
  });
});

import { describe, expect, it } from 'vitest';
import {
  awaitsTestMail,
  rememberTestReply,
  resolveStep,
  signedInSince,
  wasMadeInTheSteps,
} from './onboarding-progress';
import type { OnboardingState } from './onboarding-state';

describe('wasMadeInTheSteps', () => {
  const agent = { id: 'agent_1', createdAt: '2026-10-22T12:00:00.000Z' };

  it('is false when the web never recorded an agentId (CLI or MCP setup)', () => {
    expect(wasMadeInTheSteps(agent, { startedAt: '2026-10-22T11:00:00.000Z' })).toBe(false);
  });

  it('is false when agentId belongs to a different agent', () => {
    expect(
      wasMadeInTheSteps(agent, {
        startedAt: '2026-10-22T11:00:00.000Z',
        agentId: 'other_agent',
      })
    ).toBe(false);
  });

  it('is true when the web created this agent during the steps', () => {
    expect(
      wasMadeInTheSteps(agent, {
        startedAt: '2026-10-22T11:00:00.000Z',
        agentId: 'agent_1',
      })
    ).toBe(true);
  });

  it('is false when the agent is older than the onboarding visit', () => {
    expect(
      wasMadeInTheSteps(
        { id: 'agent_1', createdAt: '2026-10-01T00:00:00.000Z' },
        { startedAt: '2026-10-22T11:00:00.000Z', agentId: 'agent_1' }
      )
    ).toBe(false);
  });
});

describe('awaitsTestMail', () => {
  const agent = { id: 'agent_1', createdAt: '2026-10-22T12:00:00.000Z' };
  const inSteps = { startedAt: '2026-10-22T11:00:00.000Z', agentId: 'agent_1' };

  it('is true while the test step is still open', () => {
    expect(awaitsTestMail(agent, inSteps)).toBe(true);
  });

  it('is false once the operator left the test step', () => {
    expect(awaitsTestMail(agent, { ...inSteps, testLeftAt: '2026-10-22T12:30:00.000Z' })).toBe(false);
  });

  it('is false once onboarding is finished', () => {
    expect(awaitsTestMail(agent, { ...inSteps, finishedAt: '2026-10-22T13:00:00.000Z' })).toBe(false);
  });

  it('is false for an agent that was not made in the steps', () => {
    expect(awaitsTestMail(agent, { startedAt: '2026-10-22T11:00:00.000Z' })).toBe(false);
  });

  it('is false without an agent', () => {
    expect(awaitsTestMail(null, inSteps)).toBe(false);
  });
});

describe('rememberTestReply', () => {
  it('stores the time and drops a sender and subject an older build saved', () => {
    const state = {
      startedAt: '2026-10-22T11:00:00.000Z',
      testInboundFrom: 'Ada',
      testInboundSubject: 'Hello',
    } as OnboardingState;

    expect(rememberTestReply(state, '2026-10-22T12:05:00.000Z')).toEqual({
      startedAt: '2026-10-22T11:00:00.000Z',
      testReplyAt: '2026-10-22T12:05:00.000Z',
    });
  });

  it('drops a stored sender without changing the time', () => {
    const state = { testReplyAt: '2026-10-22T12:05:00.000Z', testInboundFrom: 'Ada' } as OnboardingState;

    expect(rememberTestReply(state, '2026-10-22T12:05:00.000Z')).toEqual({
      testReplyAt: '2026-10-22T12:05:00.000Z',
    });
  });

  it('forgets the time when the inbox no longer has the mail', () => {
    expect(rememberTestReply({ testReplyAt: '2026-10-22T12:05:00.000Z' }, undefined)).toEqual({});
  });

  it('returns the same state when the time is unchanged and no sender is stored', () => {
    const state = { testReplyAt: '2026-10-22T12:05:00.000Z' };

    expect(rememberTestReply(state, state.testReplyAt)).toBe(state);
  });
});

describe('resolveStep', () => {
  it('is done for an MCP-made agent even when startedAt was written by viewing step 1', () => {
    expect(
      resolveStep(
        { id: 'agent_1', createdAt: '2026-10-22T12:00:00.000Z' },
        { startedAt: '2026-10-22T11:00:00.000Z' },
        {
          connected: true,
          hosts: [],
          lastCheckedAt: null,
          lastCheckedVia: null,
          firstCheckedAt: null,
          waitingMessage: null,
        }
      )
    ).toBe('done');
  });

  it('moves on to step 4 once a host signed in through the MCP server, before the API sees it check', () => {
    const agent = { id: 'agent_1', createdAt: '2026-10-28T15:20:00.000Z' };
    const state = { startedAt: '2026-10-28T15:00:00.000Z', agentId: 'agent_1', testLeftAt: '2026-10-28T15:30:00.000Z' };
    const noHost = {
      connected: false,
      hosts: [],
      lastCheckedAt: null,
      lastCheckedVia: null,
      firstCheckedAt: null,
      waitingMessage: null,
    };

    expect(resolveStep(agent, state, noHost)).toBe('connect');
    expect(resolveStep(agent, state, noHost, true)).toBe('reach');
  });
});

describe('signedInSince', () => {
  it('counts a sign-in since the agent was made, not one an app made before it and never used since', () => {
    const agent = { id: 'agent_1', createdAt: '2026-10-28T15:20:00.000Z' };

    expect(signedInSince('2026-10-28T15:39:57.471Z', agent)).toBe(true);
    expect(signedInSince('2026-10-28T10:23:26.136Z', agent)).toBe(false);
    expect(signedInSince('2026-10-28T10:23:26.136Z', { id: 'agent_1' })).toBe(true);
  });
});

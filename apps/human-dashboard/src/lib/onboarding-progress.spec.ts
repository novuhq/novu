import { describe, expect, it } from 'vitest';
import { resolveStep, wasMadeInTheSteps } from './onboarding-progress';

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
});

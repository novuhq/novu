import { describe, expect, it, vi } from 'vitest';
import { CloudRegionEnum } from '../../dev/enums';
import type { AgentRecord } from '../api/agents';
import type { ConnectCommandOptions } from '../types';
import type { ConnectUI } from '../ui/ui';
import {
  filterSelfHostedAgents,
  isCustomCodeConnect,
  isSelfHostedAgent,
  resolveCustomCodeAgent,
} from './resolve-custom-code-agent';

function createOptions(overrides: Partial<ConnectCommandOptions> = {}): ConnectCommandOptions {
  return {
    region: CloudRegionEnum.US,
    apiUrl: 'http://localhost:3000',
    dashboardUrl: 'http://localhost:4200',
    connectDashboardUrl: 'http://localhost:4201',
    ...overrides,
  };
}

function createAgent(overrides: Partial<AgentRecord> = {}): AgentRecord {
  return {
    _id: 'agent-1',
    identifier: 'support-agent',
    name: 'Support Agent',
    runtime: undefined,
    ...overrides,
  };
}

function createUi(overrides: Partial<ConnectUI> = {}): ConnectUI {
  return {
    pickExistingOrCreate: vi.fn(),
    ...overrides,
  } as ConnectUI;
}

describe('isCustomCodeConnect', () => {
  it('returns true when runtime is custom-code', () => {
    expect(isCustomCodeConnect(createOptions({ runtime: 'custom-code' }))).toBe(true);
  });

  it('returns true when agent identifier is set', () => {
    expect(isCustomCodeConnect(createOptions({ agentIdentifier: 'support-agent' }))).toBe(true);
  });

  it('returns false for default managed connect', () => {
    expect(isCustomCodeConnect(createOptions())).toBe(false);
  });
});

describe('isSelfHostedAgent', () => {
  it('treats missing runtime as self-hosted', () => {
    expect(isSelfHostedAgent(createAgent())).toBe(true);
  });

  it('rejects managed agents', () => {
    expect(isSelfHostedAgent(createAgent({ runtime: 'managed' }))).toBe(false);
  });
});

describe('filterSelfHostedAgents', () => {
  it('filters out managed agents', () => {
    const agents = [
      createAgent({ identifier: 'self-hosted', runtime: undefined }),
      createAgent({ identifier: 'managed', runtime: 'managed' }),
    ];

    expect(filterSelfHostedAgents(agents).map((agent) => agent.identifier)).toEqual(['self-hosted']);
  });
});

describe('resolveCustomCodeAgent', () => {
  it('resolves by identifier', async () => {
    const agents = [createAgent()];

    const result = await resolveCustomCodeAgent(
      agents,
      createOptions({ agentIdentifier: 'support-agent' }),
      createUi()
    );

    expect(result).toEqual({
      id: 'agent-1',
      identifier: 'support-agent',
      name: 'Support Agent',
    });
  });

  it('errors when identifier is not found', async () => {
    await expect(resolveCustomCodeAgent([], createOptions({ agentIdentifier: 'missing' }), createUi())).rejects.toThrow(
      'Agent "missing" was not found'
    );
  });

  it('rejects managed agents', async () => {
    const agents = [createAgent({ runtime: 'managed' })];

    await expect(
      resolveCustomCodeAgent(agents, createOptions({ agentIdentifier: 'support-agent' }), createUi())
    ).rejects.toThrow('managed agent');
  });

  it('auto-selects the only self-hosted agent when identifier is omitted', async () => {
    const agents = [createAgent()];

    const result = await resolveCustomCodeAgent(agents, createOptions({ runtime: 'custom-code' }), createUi());

    expect(result.identifier).toBe('support-agent');
  });

  it('uses the picker when multiple self-hosted agents exist', async () => {
    const agents = [
      createAgent({ _id: 'a1', identifier: 'agent-a', name: 'Agent A' }),
      createAgent({ _id: 'a2', identifier: 'agent-b', name: 'Agent B' }),
    ];
    const ui = createUi({
      pickExistingOrCreate: vi.fn().mockResolvedValue({
        action: 'use',
        agent: { id: 'a2', identifier: 'agent-b', name: 'Agent B' },
      }),
    });

    const result = await resolveCustomCodeAgent(agents, createOptions({ runtime: 'custom-code' }), ui);

    expect(result.identifier).toBe('agent-b');
    expect(ui.pickExistingOrCreate).toHaveBeenCalledOnce();
  });
});

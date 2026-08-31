import { describe, expect, it, vi } from 'vitest';
import type { ConnectApiClient } from '../../api/client';
import type { ConnectCommandOptions } from '../../types';
import type { ConnectUI } from '../../ui/ui';

const listAgents = vi.fn();
const createBridgeAgent = vi.fn();

vi.mock('../../api/agents', () => ({
  listAgents: (...args: unknown[]) => listAgents(...args),
  createBridgeAgent: (...args: unknown[]) => createBridgeAgent(...args),
}));

import { createBridgeAgentFlow } from './create-bridge-agent';

const client = {} as ConnectApiClient;

function createUi() {
  return {
    pickExistingOrCreate: vi.fn(),
    promptForAgentName: vi.fn(),
    creatingAgent: vi.fn(),
  } as unknown as ConnectUI & {
    pickExistingOrCreate: ReturnType<typeof vi.fn>;
    promptForAgentName: ReturnType<typeof vi.fn>;
    creatingAgent: ReturnType<typeof vi.fn>;
  };
}

describe('createBridgeAgentFlow', () => {
  it('reuses --agent-identifier and skips the picker', async () => {
    const ui = createUi();
    listAgents.mockResolvedValue([
      { _id: '1', identifier: 'fred', name: 'Fred', runtime: 'self-hosted' },
      { _id: '2', identifier: 'other', name: 'Other', runtime: 'self-hosted' },
    ]);

    const result = await createBridgeAgentFlow(client, ui, {
      agentIdentifier: 'fred',
    } as ConnectCommandOptions);

    expect(result).toEqual({
      agent: { id: '1', identifier: 'fred', name: 'Fred' },
      flow: 'reused',
    });
    expect(ui.pickExistingOrCreate).not.toHaveBeenCalled();
    expect(createBridgeAgent).not.toHaveBeenCalled();
  });

  it('throws when --agent-identifier does not match this environment', async () => {
    const ui = createUi();
    listAgents.mockResolvedValue([{ _id: '1', identifier: 'fred', name: 'Fred', runtime: 'self-hosted' }]);

    await expect(
      createBridgeAgentFlow(client, ui, { agentIdentifier: 'missing' } as ConnectCommandOptions)
    ).rejects.toThrow('No agent found with identifier "missing" in this environment.');
    expect(ui.pickExistingOrCreate).not.toHaveBeenCalled();
  });
});

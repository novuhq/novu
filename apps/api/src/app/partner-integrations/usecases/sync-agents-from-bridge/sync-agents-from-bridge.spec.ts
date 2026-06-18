import { assert, stub } from 'sinon';
import { SyncAgentsFromBridgeCommand } from './sync-agents-from-bridge.command';
import { SyncAgentsFromBridge } from './sync-agents-from-bridge.usecase';

describe('SyncAgentsFromBridge', () => {
  const baseCommand = SyncAgentsFromBridgeCommand.create({
    organizationId: 'org-id',
    environmentId: 'env-id',
    userId: 'user-id',
    bridgeUrl: 'https://my-app.vercel.app/api/novu',
    isProduction: true,
  });

  function createSyncAgentsFromBridge(
    overrides: {
      getFlag?: () => Promise<boolean>;
      discoverResult?: { agents?: Array<{ agentId: string; name?: string; description?: string }> };
      existingAgent?: Record<string, unknown> | null;
      registeredAgent?: Record<string, unknown>;
    } = {}
  ) {
    const executeBridgeRequestMock = {
      execute: stub().resolves(overrides.discoverResult ?? { workflows: [], agents: [] }),
    };
    const agentRepositoryMock = {
      findOne: stub().resolves(overrides.existingAgent ?? null),
    };
    const registerDiscoveredAgentMock = {
      execute: stub().resolves(
        overrides.registeredAgent ?? {
          _id: 'agent-id',
          identifier: 'support-agent',
          bridgeUrl: undefined,
        }
      ),
    };
    const updateAgentMock = {
      execute: stub().resolves(undefined),
    };
    const featureFlagsServiceMock = {
      getFlag: overrides.getFlag ?? (async () => true),
    };
    const loggerMock = {
      setContext: stub(),
      warn: stub(),
      info: stub(),
      error: stub(),
      debug: stub(),
      trace: stub(),
    };

    const syncAgentsFromBridge = new SyncAgentsFromBridge(
      executeBridgeRequestMock,
      agentRepositoryMock,
      registerDiscoveredAgentMock,
      updateAgentMock,
      featureFlagsServiceMock,
      loggerMock
    );

    return {
      syncAgentsFromBridge,
      executeBridgeRequestMock,
      agentRepositoryMock,
      registerDiscoveredAgentMock,
      updateAgentMock,
    };
  }

  it('should no-op when conversational agents are disabled', async () => {
    const { syncAgentsFromBridge, executeBridgeRequestMock } = createSyncAgentsFromBridge({
      getFlag: async () => false,
      discoverResult: { agents: [{ agentId: 'support-agent' }] },
    });

    await syncAgentsFromBridge.execute(baseCommand);

    assert.notCalled(executeBridgeRequestMock.execute);
  });

  it('should auto-create missing production agents from discover metadata', async () => {
    const { syncAgentsFromBridge, registerDiscoveredAgentMock, updateAgentMock } = createSyncAgentsFromBridge({
      discoverResult: {
        agents: [{ agentId: 'support-agent', name: 'Support Agent', description: 'Handles support' }],
      },
    });

    await syncAgentsFromBridge.execute(
      SyncAgentsFromBridgeCommand.create({
        ...baseCommand,
        discoverResult: {
          workflows: [],
          agents: [{ agentId: 'support-agent', name: 'Support Agent', description: 'Handles support' }],
        },
      })
    );

    assert.calledOnce(registerDiscoveredAgentMock.execute);
    assert.calledOnce(updateAgentMock.execute);
  });

  it('should skip bridge update when production bridge URL is already registered', async () => {
    const { syncAgentsFromBridge, registerDiscoveredAgentMock, updateAgentMock } = createSyncAgentsFromBridge({
      existingAgent: {
        identifier: 'support-agent',
        bridgeUrl: 'https://my-app.vercel.app/api/novu',
      },
    });

    await syncAgentsFromBridge.execute(
      SyncAgentsFromBridgeCommand.create({
        ...baseCommand,
        discoverResult: {
          workflows: [],
          agents: [{ agentId: 'support-agent' }],
        },
      })
    );

    assert.notCalled(registerDiscoveredAgentMock.execute);
    assert.notCalled(updateAgentMock.execute);
  });

  it('should register preview bridge URL without auto-creating missing agents', async () => {
    const { syncAgentsFromBridge, registerDiscoveredAgentMock, updateAgentMock } = createSyncAgentsFromBridge({
      existingAgent: {
        identifier: 'support-agent',
        devBridgeUrl: 'https://preview.vercel.app/api/novu',
        devBridgeActive: false,
      },
    });

    await syncAgentsFromBridge.execute(
      SyncAgentsFromBridgeCommand.create({
        organizationId: 'org-id',
        environmentId: 'env-id',
        userId: 'user-id',
        bridgeUrl: 'https://preview.vercel.app/api/novu',
        isProduction: false,
        discoverResult: {
          workflows: [],
          agents: [{ agentId: 'support-agent' }],
        },
      })
    );

    assert.notCalled(registerDiscoveredAgentMock.execute);
    assert.calledOnce(updateAgentMock.execute);
  });

  it('should skip preview sync when agent does not exist', async () => {
    const { syncAgentsFromBridge, updateAgentMock } = createSyncAgentsFromBridge({
      existingAgent: null,
    });

    await syncAgentsFromBridge.execute(
      SyncAgentsFromBridgeCommand.create({
        organizationId: 'org-id',
        environmentId: 'env-id',
        userId: 'user-id',
        bridgeUrl: 'https://preview.vercel.app/api/novu',
        isProduction: false,
        discoverResult: {
          workflows: [],
          agents: [{ agentId: 'support-agent' }],
        },
      })
    );

    assert.notCalled(updateAgentMock.execute);
  });

  it('should use a single discover result when provided', async () => {
    const { syncAgentsFromBridge, executeBridgeRequestMock, updateAgentMock } = createSyncAgentsFromBridge({
      existingAgent: {
        identifier: 'support-agent',
      },
    });

    await syncAgentsFromBridge.execute(
      SyncAgentsFromBridgeCommand.create({
        ...baseCommand,
        discoverResult: {
          workflows: [],
          agents: [{ agentId: 'support-agent' }],
        },
      })
    );

    assert.notCalled(executeBridgeRequestMock.execute);
    assert.calledOnce(updateAgentMock.execute);
  });
});

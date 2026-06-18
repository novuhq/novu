import { assert, stub } from 'sinon';
import { SyncAgentsFromBridgeCommand } from './sync-agents-from-bridge.command';
import { SyncAgentsFromBridge } from './sync-agents-from-bridge.usecase';

describe('SyncAgentsFromBridge', () => {
  it('should no-op when conversational agents are disabled', async () => {
    const executeBridgeRequestMock = {
      execute: stub().resolves({ workflows: [], agents: [{ agentId: 'support-agent' }] }),
    };
    const syncAgentsFromBridge = new SyncAgentsFromBridge(
      executeBridgeRequestMock,
      { findOne: stub() },
      { execute: stub() },
      { execute: stub() },
      { getFlag: async () => false },
      { setContext: stub(), warn: stub(), info: stub(), error: stub(), debug: stub(), trace: stub() }
    );

    await syncAgentsFromBridge.execute(
      SyncAgentsFromBridgeCommand.create({
        organizationId: 'org-id',
        environmentId: 'env-id',
        userId: 'user-id',
        bridgeUrl: 'https://my-app.vercel.app/api/novu',
        isProduction: true,
      })
    );

    assert.notCalled(executeBridgeRequestMock.execute);
  });
});

import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { type ManagedAgentContext, ManagedAgentService } from './managed-agent.service';

const AGENT_ID = 'agent_456';
const ENV_ID = 'env_789';
const ORG_ID = 'org_321';
const SUBSCRIBER_MONGO_ID = 'sub_mongo_123';
const CONVERSATION_ID = 'conv_111';
const STALE_VAULT_ID = 'vlt_011CdBB7PqywiEejNVEFwXu1';
const FRESH_VAULT_ID = 'vlt_fresh';

const VAULT_NOT_FOUND_ERROR = new Error(
  `404 {"type":"error","error":{"type":"not_found_error","message":"vault ${STALE_VAULT_ID} not found"},"request_id":"req_test"}`
);

function makeLogger() {
  return { setContext: sinon.stub(), warn: sinon.stub(), error: sinon.stub(), info: sinon.stub(), debug: sinon.stub() };
}

function makeContext(overrides: Partial<ManagedAgentContext> = {}): ManagedAgentContext {
  return {
    config: {
      environmentId: ENV_ID,
      organizationId: ORG_ID,
      agentIdentifier: 'agent-id',
      integrationIdentifier: 'integration-id',
      platform: AgentPlatformEnum.SLACK,
      acknowledgeOnReceived: false,
    } as any,
    conversation: { _id: CONVERSATION_ID, channels: [] } as any,
    subscriber: { _id: SUBSCRIBER_MONGO_ID, subscriberId: 'sub-1' } as any,
    userMessageText: 'hello',
    ...overrides,
  };
}

function makeAgent() {
  return { _id: AGENT_ID, managedRuntime: { providerId: 'anthropic', _integrationId: 'int_1' } } as any;
}

describe('ManagedAgentService', () => {
  describe('dispatch — stale vault self-heal', () => {
    let providerSend: sinon.SinonStub;
    let agentMcpSessionService: Record<string, sinon.SinonStub>;
    let conversationRepository: Record<string, sinon.SinonStub>;
    let service: ManagedAgentService;

    beforeEach(() => {
      providerSend = sinon.stub();

      const providerFactory = {
        getOrCreate: sinon.stub().resolves({
          provider: { send: providerSend },
          runtimeProvider: { capabilities: { tokenVault: true } },
        }),
      };

      agentMcpSessionService = {
        resolveVaultIds: sinon.stub().resolves([STALE_VAULT_ID]),
        resolveConnectedMcps: sinon.stub().resolves(undefined),
        rebindSubscriberVault: sinon.stub().resolves([FRESH_VAULT_ID]),
      };

      conversationRepository = {
        clearExternalSessionId: sinon.stub().resolves(),
        setExternalSessionIdIfMissing: sinon.stub().resolves(true),
      };

      const conversationService = { getHistory: sinon.stub().resolves([]) };
      const demoQuota = { assertAllowed: sinon.stub().resolves() };
      const agentRuntimeDefinition = { reconcileIfStale: sinon.stub().resolves() };

      service = new ManagedAgentService(
        {} as any,
        providerFactory as any,
        {} as any,
        conversationRepository as any,
        {} as any,
        conversationService as any,
        {} as any,
        agentMcpSessionService as any,
        demoQuota as any,
        {} as any,
        agentRuntimeDefinition as any,
        makeLogger() as any
      );
    });

    it('rebinds to a fresh vault and retries once when createSession rejects a stale vault id', async () => {
      providerSend.onFirstCall().rejects(VAULT_NOT_FOUND_ERROR);
      providerSend.onSecondCall().resolves({ sessionId: 'sess_new', status: 'active' });

      const result = await service.dispatch(makeContext(), makeAgent());

      expect(result).to.deep.equal({ status: 'active' });
      expect(providerSend.calledTwice).to.equal(true);

      expect(agentMcpSessionService.rebindSubscriberVault.calledOnce).to.equal(true);
      expect(agentMcpSessionService.rebindSubscriberVault.firstCall.args[0]).to.include({
        agentId: AGENT_ID,
        subscriberMongoId: SUBSCRIBER_MONGO_ID,
        staleVaultId: STALE_VAULT_ID,
      });

      expect(conversationRepository.clearExternalSessionId.calledOnce).to.equal(true);

      const secondSendArgs = providerSend.secondCall.args[0];
      expect(secondSendArgs.vaultIds).to.deep.equal([FRESH_VAULT_ID]);
      expect(secondSendArgs.sessionId).to.equal(undefined);

      expect(conversationRepository.setExternalSessionIdIfMissing.calledOnce).to.equal(true);
      expect(conversationRepository.setExternalSessionIdIfMissing.firstCall.args).to.include('sess_new');
      expect(conversationRepository.setExternalSessionIdIfMissing.firstCall.args).to.include(FRESH_VAULT_ID);
    });

    it('rethrows unrelated errors without attempting a rebind', async () => {
      const otherError = new Error('rate limited');
      providerSend.rejects(otherError);

      let caught: Error | null = null;
      try {
        await service.dispatch(makeContext(), makeAgent());
      } catch (err) {
        caught = err as Error;
      }

      expect(caught).to.equal(otherError);
      expect(providerSend.calledOnce).to.equal(true);
      expect(agentMcpSessionService.rebindSubscriberVault.called).to.equal(false);
    });

    it('rethrows a vault-not-found error for a vault id that was not part of this turn', async () => {
      const unrelatedVaultError = new Error('vault vlt_unrelated not found');
      providerSend.rejects(unrelatedVaultError);

      let caught: Error | null = null;
      try {
        await service.dispatch(makeContext(), makeAgent());
      } catch (err) {
        caught = err as Error;
      }

      expect(caught).to.equal(unrelatedVaultError);
      expect(agentMcpSessionService.rebindSubscriberVault.called).to.equal(false);
    });

    it('rethrows the vault-not-found error without a subscriber to rebind against', async () => {
      providerSend.rejects(VAULT_NOT_FOUND_ERROR);

      let caught: Error | null = null;
      try {
        await service.dispatch(makeContext({ subscriber: null }), makeAgent());
      } catch (err) {
        caught = err as Error;
      }

      expect(caught).to.equal(VAULT_NOT_FOUND_ERROR);
      expect(agentMcpSessionService.rebindSubscriberVault.called).to.equal(false);
    });
  });
});

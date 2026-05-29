import { expect } from 'chai';
import sinon from 'sinon';

import { McpConnectionVaultService } from './mcp-connection-vault.service';

const SUBSCRIBER_MONGO_ID = 'sub_mongo_123';
const AGENT_ID = 'agent_456';
const ENV_ID = 'env_789';
const ORG_ID = 'org_321';

function makeLogger() {
  return {
    setContext: sinon.stub(),
    warn: sinon.stub(),
    error: sinon.stub(),
    info: sinon.stub(),
    debug: sinon.stub(),
  };
}

function makeRuntimeProvider(overrides: Partial<Record<string, sinon.SinonStub>> = {}) {
  return {
    capabilities: { tokenVault: true },
    createVault: sinon.stub().resolves({ externalVaultId: 'vlt_new' }),
    ...overrides,
  };
}

function makeMcpConnectionRepo(overrides: Partial<Record<string, sinon.SinonStub>> = {}) {
  return {
    findSubscriberExternalVaultId: sinon.stub().resolves(null),
    findSubscriberConnectionsForAgent: sinon.stub().resolves([]),
    setSubscriberExternalVaultIdIfMissing: sinon.stub().resolves(0),
    setConnectionExternalVaultIdIfMissing: sinon.stub().resolves(true),
    create: sinon.stub().resolves({}),
    findOne: sinon.stub().resolves(null),
    ...overrides,
  };
}

function makeAgentMcpServerRepo(enablements: Array<{ _id: string; mcpId: string }> = []) {
  return {
    findByAgent: sinon.stub().resolves(enablements),
    findOAuthEnablementsForAgent: sinon.stub().resolves(enablements),
  };
}

function makeService(
  repo: ReturnType<typeof makeMcpConnectionRepo>,
  enablementRepo: ReturnType<typeof makeAgentMcpServerRepo>
) {
  return new McpConnectionVaultService(repo as any, enablementRepo as any, makeLogger() as any);
}

describe('McpConnectionVaultService', () => {
  describe('resolveVaultIds', () => {
    it('returns [] when no subscriber is provided (anonymous platform turn)', async () => {
      const repo = makeMcpConnectionRepo();
      const service = makeService(repo, makeAgentMcpServerRepo());

      const result = await service.resolveVaultIds({
        agentId: AGENT_ID,
        environmentId: ENV_ID,
        organizationId: ORG_ID,
        runtimeProvider: makeRuntimeProvider() as any,
      });

      expect(result).to.deep.equal([]);
      // No enablement / vault lookups occur on the anonymous path.
      expect(repo.findSubscriberExternalVaultId.called).to.equal(false);
    });

    it('returns the existing subscriber vault id when one is already stored', async () => {
      const repo = makeMcpConnectionRepo({
        findSubscriberExternalVaultId: sinon.stub().resolves('vlt_existing'),
      });
      const enablementRepo = makeAgentMcpServerRepo([{ _id: 'ams_1', mcpId: 'linear' }]);
      const runtimeProvider = makeRuntimeProvider();
      const service = makeService(repo, enablementRepo);

      const result = await service.resolveVaultIds({
        agentId: AGENT_ID,
        environmentId: ENV_ID,
        organizationId: ORG_ID,
        subscriberMongoId: SUBSCRIBER_MONGO_ID,
        runtimeProvider: runtimeProvider as any,
      });

      expect(result).to.deep.equal(['vlt_existing']);
      expect(runtimeProvider.createVault.called).to.equal(false);
    });

    it('returns [] when no OAuth-capable MCPs are enabled and no vault exists', async () => {
      const repo = makeMcpConnectionRepo();
      // No OAuth enablement at all → `findOAuthEnablementsForAgent` returns [] → null.
      const service = makeService(repo, makeAgentMcpServerRepo([]));
      const runtimeProvider = makeRuntimeProvider();

      const result = await service.resolveVaultIds({
        agentId: AGENT_ID,
        environmentId: ENV_ID,
        organizationId: ORG_ID,
        subscriberMongoId: SUBSCRIBER_MONGO_ID,
        runtimeProvider: runtimeProvider as any,
      });

      expect(result).to.deep.equal([]);
      expect(runtimeProvider.createVault.called).to.equal(false);
    });

    it('returns [] when the runtime provider lacks tokenVault capability', async () => {
      const repo = makeMcpConnectionRepo();
      const service = makeService(repo, makeAgentMcpServerRepo([{ _id: 'ams_1', mcpId: 'linear' }]));
      const runtimeProvider = makeRuntimeProvider({});
      runtimeProvider.capabilities = { tokenVault: false } as any;

      const result = await service.resolveVaultIds({
        agentId: AGENT_ID,
        environmentId: ENV_ID,
        organizationId: ORG_ID,
        subscriberMongoId: SUBSCRIBER_MONGO_ID,
        runtimeProvider: runtimeProvider as any,
      });

      expect(result).to.deep.equal([]);
      expect(runtimeProvider.createVault.called).to.equal(false);
    });

    it('creates an anchor row when no subscriber connection exists yet and returns the new vault id', async () => {
      const repo = makeMcpConnectionRepo({
        // First call: no vault. Second call (the recheck inside the anchor
        // path): also no vault. After the create, no further reads happen.
        findSubscriberExternalVaultId: sinon.stub().resolves(null),
        findSubscriberConnectionsForAgent: sinon.stub().resolves([]),
        create: sinon.stub().resolves({}),
      });
      const enablement = { _id: 'ams_1', mcpId: 'linear' };
      const enablementRepo = makeAgentMcpServerRepo([enablement]);
      const runtimeProvider = makeRuntimeProvider({
        createVault: sinon.stub().resolves({ externalVaultId: 'vlt_anchor' }),
      });
      const service = makeService(repo, enablementRepo);

      const result = await service.resolveVaultIds({
        agentId: AGENT_ID,
        environmentId: ENV_ID,
        organizationId: ORG_ID,
        subscriberMongoId: SUBSCRIBER_MONGO_ID,
        runtimeProvider: runtimeProvider as any,
      });

      expect(result).to.deep.equal(['vlt_anchor']);
      expect(runtimeProvider.createVault.calledOnce).to.equal(true);
      expect(repo.create.calledOnce).to.equal(true);
      const createArg = repo.create.firstCall.args[0];
      expect(createArg).to.include({
        _agentMcpServerId: enablement._id,
        _subscriberId: SUBSCRIBER_MONGO_ID,
        mcpId: enablement.mcpId,
      });
      expect(createArg.auth).to.deep.equal({ externalVaultId: 'vlt_anchor' });
    });

    it('propagates the new vault id onto existing subscriber rows that lack one', async () => {
      const existingConnections = [
        { _id: 'mc_1', _agentMcpServerId: 'ams_1', _subscriberId: SUBSCRIBER_MONGO_ID, auth: {} },
      ];
      const findStub = sinon.stub();
      findStub.onFirstCall().resolves(null); // resolveSubscriberVaultId pre-check
      findStub.onSecondCall().resolves(null); // ensureSubscriberVaultAnchor re-check
      findStub.onThirdCall().resolves('vlt_propagated'); // post-propagate winner read
      const repo = makeMcpConnectionRepo({
        findSubscriberExternalVaultId: findStub,
        findSubscriberConnectionsForAgent: sinon.stub().resolves(existingConnections),
        setSubscriberExternalVaultIdIfMissing: sinon.stub().resolves(1),
      });
      const enablementRepo = makeAgentMcpServerRepo([{ _id: 'ams_1', mcpId: 'linear' }]);
      const runtimeProvider = makeRuntimeProvider({
        createVault: sinon.stub().resolves({ externalVaultId: 'vlt_propagated' }),
      });
      const service = makeService(repo, enablementRepo);

      const result = await service.resolveVaultIds({
        agentId: AGENT_ID,
        environmentId: ENV_ID,
        organizationId: ORG_ID,
        subscriberMongoId: SUBSCRIBER_MONGO_ID,
        runtimeProvider: runtimeProvider as any,
      });

      expect(result).to.deep.equal(['vlt_propagated']);
      expect(repo.setSubscriberExternalVaultIdIfMissing.calledOnce).to.equal(true);
      expect(repo.create.called).to.equal(false);
    });

    it('skips the upstream vault create when a sibling vault already exists', async () => {
      // Race-A recovery path: caller did the cheap pre-check, found nothing,
      // entered the anchor path, but a concurrent racer just set the vault.
      // The internal re-check picks it up and avoids a second `createVault`.
      const findStub = sinon.stub();
      findStub.onFirstCall().resolves(null); // top-level pre-check
      findStub.onSecondCall().resolves('vlt_racewinner'); // recheck inside anchor
      const repo = makeMcpConnectionRepo({
        findSubscriberExternalVaultId: findStub,
      });
      const enablementRepo = makeAgentMcpServerRepo([{ _id: 'ams_1', mcpId: 'linear' }]);
      const runtimeProvider = makeRuntimeProvider();
      const service = makeService(repo, enablementRepo);

      const result = await service.resolveVaultIds({
        agentId: AGENT_ID,
        environmentId: ENV_ID,
        organizationId: ORG_ID,
        subscriberMongoId: SUBSCRIBER_MONGO_ID,
        runtimeProvider: runtimeProvider as any,
      });

      expect(result).to.deep.equal(['vlt_racewinner']);
      expect(runtimeProvider.createVault.called).to.equal(false);
    });

    it('recovers from a duplicate-key insert race and returns the winner vault id', async () => {
      const e11000: Error & { code?: number } = new Error('E11000 duplicate key error');
      e11000.code = 11000;

      const findStub = sinon.stub();
      findStub.onFirstCall().resolves(null); // top-level pre-check
      findStub.onSecondCall().resolves(null); // anchor recheck
      findStub.onThirdCall().resolves('vlt_winner'); // post-E11000 winner lookup
      const repo = makeMcpConnectionRepo({
        findSubscriberExternalVaultId: findStub,
        findSubscriberConnectionsForAgent: sinon.stub().resolves([]),
        create: sinon.stub().rejects(e11000),
      });
      const enablementRepo = makeAgentMcpServerRepo([{ _id: 'ams_1', mcpId: 'linear' }]);
      const runtimeProvider = makeRuntimeProvider({
        createVault: sinon.stub().resolves({ externalVaultId: 'vlt_loser' }),
      });
      const service = makeService(repo, enablementRepo);

      const result = await service.resolveVaultIds({
        agentId: AGENT_ID,
        environmentId: ENV_ID,
        organizationId: ORG_ID,
        subscriberMongoId: SUBSCRIBER_MONGO_ID,
        runtimeProvider: runtimeProvider as any,
      });

      // Loser converges on the winner's vault id rather than throwing.
      expect(result).to.deep.equal(['vlt_winner']);
      expect(repo.create.calledOnce).to.equal(true);
    });

    it('rethrows non-duplicate-key errors from create', async () => {
      const findStub = sinon.stub();
      findStub.onFirstCall().resolves(null);
      findStub.onSecondCall().resolves(null);
      const repo = makeMcpConnectionRepo({
        findSubscriberExternalVaultId: findStub,
        findSubscriberConnectionsForAgent: sinon.stub().resolves([]),
        create: sinon.stub().rejects(new Error('boom')),
      });
      const enablementRepo = makeAgentMcpServerRepo([{ _id: 'ams_1', mcpId: 'linear' }]);
      const runtimeProvider = makeRuntimeProvider({
        createVault: sinon.stub().resolves({ externalVaultId: 'vlt_x' }),
      });
      const service = makeService(repo, enablementRepo);

      let caught: Error | null = null;
      try {
        await service.resolveVaultIds({
          agentId: AGENT_ID,
          environmentId: ENV_ID,
          organizationId: ORG_ID,
          subscriberMongoId: SUBSCRIBER_MONGO_ID,
          runtimeProvider: runtimeProvider as any,
        });
      } catch (err) {
        caught = err as Error;
      }

      expect(caught?.message).to.equal('boom');
    });
  });

  describe('ensureConnectionVault', () => {
    const baseConnection = {
      _id: 'mc_99',
      _organizationId: ORG_ID,
      _environmentId: ENV_ID,
      _subscriberId: SUBSCRIBER_MONGO_ID,
      scope: 'subscriber' as const,
      mcpId: 'linear',
      _agentMcpServerId: 'ams_1',
      authMode: 'dcr' as const,
      status: 'pending_oauth' as const,
      auth: undefined,
      createdAt: '',
      updatedAt: '',
    } as any;

    it('short-circuits and returns the cached vault id when already set', async () => {
      const repo = makeMcpConnectionRepo();
      const runtimeProvider = makeRuntimeProvider();
      const service = makeService(repo, makeAgentMcpServerRepo([]));

      const result = await service.ensureConnectionVault({
        connection: { ...baseConnection, auth: { externalVaultId: 'vlt_cached' } },
        agentId: AGENT_ID,
        runtimeProvider: runtimeProvider as any,
      });

      expect(result).to.equal('vlt_cached');
      expect(runtimeProvider.createVault.called).to.equal(false);
    });

    it('reuses a sibling subscriber vault when one exists and writes it onto the row', async () => {
      const repo = makeMcpConnectionRepo({
        findSubscriberExternalVaultId: sinon.stub().resolves('vlt_sibling'),
      });
      const runtimeProvider = makeRuntimeProvider();
      const service = makeService(repo, makeAgentMcpServerRepo([{ _id: 'ams_1', mcpId: 'linear' }]));

      const result = await service.ensureConnectionVault({
        connection: { ...baseConnection },
        agentId: AGENT_ID,
        runtimeProvider: runtimeProvider as any,
      });

      expect(result).to.equal('vlt_sibling');
      expect(runtimeProvider.createVault.called).to.equal(false);
      expect(repo.setConnectionExternalVaultIdIfMissing.calledOnce).to.equal(true);
      expect(repo.setConnectionExternalVaultIdIfMissing.firstCall.args[0]).to.include({
        connectionId: baseConnection._id,
        externalVaultId: 'vlt_sibling',
      });
    });

    it('creates a vault and propagates the id onto sibling subscriber rows when none exists', async () => {
      const repo = makeMcpConnectionRepo({
        findSubscriberExternalVaultId: sinon.stub().resolves(null),
        setConnectionExternalVaultIdIfMissing: sinon.stub().resolves(true),
        setSubscriberExternalVaultIdIfMissing: sinon.stub().resolves(1),
      });
      const runtimeProvider = makeRuntimeProvider({
        createVault: sinon.stub().resolves({ externalVaultId: 'vlt_brand_new' }),
      });
      const service = makeService(repo, makeAgentMcpServerRepo([{ _id: 'ams_1', mcpId: 'linear' }]));

      const result = await service.ensureConnectionVault({
        connection: { ...baseConnection },
        agentId: AGENT_ID,
        runtimeProvider: runtimeProvider as any,
      });

      expect(result).to.equal('vlt_brand_new');
      expect(runtimeProvider.createVault.calledOnce).to.equal(true);
      expect(repo.setSubscriberExternalVaultIdIfMissing.calledOnce).to.equal(true);
    });

    it('detects a lost race and returns the winner vault id when setConnection claim fails', async () => {
      const winnerConnection = { ...baseConnection, auth: { externalVaultId: 'vlt_winner' } };
      const repo = makeMcpConnectionRepo({
        findSubscriberExternalVaultId: sinon.stub().resolves(null),
        setConnectionExternalVaultIdIfMissing: sinon.stub().resolves(false),
        findOne: sinon.stub().resolves(winnerConnection),
      });
      const runtimeProvider = makeRuntimeProvider({
        createVault: sinon.stub().resolves({ externalVaultId: 'vlt_loser' }),
      });
      const logger = makeLogger();
      const service = new McpConnectionVaultService(
        repo as any,
        makeAgentMcpServerRepo([{ _id: 'ams_1', mcpId: 'linear' }]) as any,
        logger as any
      );

      const result = await service.ensureConnectionVault({
        connection: { ...baseConnection },
        agentId: AGENT_ID,
        runtimeProvider: runtimeProvider as any,
      });

      expect(result).to.equal('vlt_winner');
      expect(logger.warn.calledOnce).to.equal(true);
      expect(repo.setSubscriberExternalVaultIdIfMissing.called).to.equal(false);
    });
  });
});

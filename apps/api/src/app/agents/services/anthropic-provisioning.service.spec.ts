import { expect } from 'chai';
import sinon from 'sinon';

import { AGENT_TOOL_NAMES, type AgentToolToggle, AnthropicProvisioningService } from './anthropic-provisioning.service';

const ORG_ID = 'org-id';
const ENV_ID = 'env-id';
const USER_ID = 'user-id';
const API_KEY = 'sk-ant-test';

describe('AnthropicProvisioningService', () => {
  function makeLogger() {
    return {
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
      setContext: sinon.stub(),
    };
  }

  function makeRegistry(initial?: string) {
    return {
      get: sinon.stub().resolves(initial),
      set: sinon.stub().resolves(),
    };
  }

  function buildService(
    overrides: {
      registry?: ReturnType<typeof makeRegistry>;
      logger?: ReturnType<typeof makeLogger>;
      sdkStubs?: {
        environments?: { create?: sinon.SinonStub };
        agents?: { create?: sinon.SinonStub; archive?: sinon.SinonStub };
      };
    } = {}
  ) {
    const registry = overrides.registry ?? makeRegistry();
    const logger = overrides.logger ?? makeLogger();
    const service = new AnthropicProvisioningService(registry as any, logger as any);

    const environmentsCreate =
      overrides.sdkStubs?.environments?.create ?? sinon.stub().resolves({ id: 'env_anthropic_1' });
    const agentsCreate = overrides.sdkStubs?.agents?.create ?? sinon.stub().resolves({ id: 'agent_anthropic_1' });
    const agentsArchive = overrides.sdkStubs?.agents?.archive ?? sinon.stub().resolves({});

    sinon.stub(service as any, 'buildClient').callsFake(() => ({
      beta: {
        environments: { create: environmentsCreate },
        agents: { create: agentsCreate, archive: agentsArchive },
      },
    }));

    return { service, registry, logger, environmentsCreate, agentsCreate, agentsArchive };
  }

  afterEach(() => sinon.restore());

  describe('ensureSharedEnvironment', () => {
    it('returns the cached id without contacting Anthropic when one exists', async () => {
      const registry = makeRegistry('env_existing');
      const { service, environmentsCreate } = buildService({ registry });

      const result = await service.ensureSharedEnvironment({
        organizationId: ORG_ID,
        environmentId: ENV_ID,
        userId: USER_ID,
        apiKey: API_KEY,
      });

      expect(result).to.equal('env_existing');
      expect(environmentsCreate.called).to.equal(false);
      expect(registry.set.called).to.equal(false);
    });

    it('creates a new Anthropic environment and caches it when no id is stored', async () => {
      const { service, environmentsCreate, registry } = buildService();

      const result = await service.ensureSharedEnvironment({
        organizationId: ORG_ID,
        environmentId: ENV_ID,
        userId: USER_ID,
        apiKey: API_KEY,
      });

      expect(result).to.equal('env_anthropic_1');
      expect(environmentsCreate.calledOnce).to.equal(true);
      const createArg = environmentsCreate.firstCall.args[0];
      expect(createArg.config.type).to.equal('cloud');
      expect(createArg.config.networking.type).to.equal('unrestricted');
      expect(createArg.name).to.match(/novu-/);
      expect(registry.set.calledOnce).to.equal(true);
      expect(registry.set.firstCall.args[0].anthropicEnvironmentId).to.equal('env_anthropic_1');
    });

    it('does not cache when Anthropic creation fails', async () => {
      const sdkStubs = {
        environments: { create: sinon.stub().rejects(new Error('anthropic down')) },
      };
      const { service, registry } = buildService({ sdkStubs });

      try {
        await service.ensureSharedEnvironment({
          organizationId: ORG_ID,
          environmentId: ENV_ID,
          userId: USER_ID,
          apiKey: API_KEY,
        });
        throw new Error('expected to throw');
      } catch (err) {
        expect((err as Error).message).to.equal('anthropic down');
      }

      expect(registry.set.called).to.equal(false);
    });
  });

  describe('createAgent', () => {
    it('omits configs when no toggles are provided', async () => {
      const { service, agentsCreate } = buildService();

      const result = await service.createAgent({
        apiKey: API_KEY,
        name: 'Wine Sommelier',
        description: 'A great wine sommelier',
        system: 'You are a sommelier.',
      });

      expect(result.agentId).to.equal('agent_anthropic_1');
      expect(agentsCreate.calledOnce).to.equal(true);
      const arg = agentsCreate.firstCall.args[0];
      expect(arg.name).to.equal('Wine Sommelier');
      expect(arg.system).to.equal('You are a sommelier.');
      expect(arg.description).to.equal('A great wine sommelier');
      expect(arg.tools).to.have.length(1);
      expect(arg.tools[0].type).to.equal('agent_toolset_20260401');
      expect(arg.tools[0].configs).to.equal(undefined);
    });

    it('passes through tool toggle overrides', async () => {
      const toggles: AgentToolToggle[] = [
        { name: 'web_fetch', enabled: false },
        { name: 'web_search', enabled: false },
      ];
      const { service, agentsCreate } = buildService();

      await service.createAgent({
        apiKey: API_KEY,
        name: 'Reader',
        system: 'system',
        tools: toggles,
      });

      const arg = agentsCreate.firstCall.args[0];
      expect(arg.tools[0].configs).to.deep.equal([
        { name: 'web_fetch', enabled: false },
        { name: 'web_search', enabled: false },
      ]);
    });
  });

  describe('archiveAgent', () => {
    it('swallows SDK errors instead of bubbling so cleanup is best-effort', async () => {
      const sdkStubs = {
        agents: { archive: sinon.stub().rejects(new Error('not found')) },
      };
      const { service, logger } = buildService({ sdkStubs });

      await service.archiveAgent(API_KEY, 'agent_anthropic_1');

      expect(logger.warn.calledOnce).to.equal(true);
    });
  });

  describe('AGENT_TOOL_NAMES', () => {
    it('exposes the eight Anthropic toolset tool names', () => {
      expect(AGENT_TOOL_NAMES).to.have.length(8);
    });
  });
});

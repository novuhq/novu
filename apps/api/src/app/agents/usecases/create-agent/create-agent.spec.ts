import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { type AgentEntity, AgentRuntimeEnum } from '@novu/dal';
import { expect } from 'chai';
import sinon from 'sinon';

import type { ManagedRuntimeSetupDto } from '../../dtos/agent-runtime.dto';
import type { CreateAgentCommand } from './create-agent.command';
import { CreateAgent } from './create-agent.usecase';

const ENV_ID = 'env-id';
const ORG_ID = 'org-id';
const USER_ID = 'user-id';

function makeAgent(overrides: Partial<AgentEntity> = {}): AgentEntity {
  return {
    _id: 'agent-id',
    name: 'Wine Sommelier',
    identifier: 'wine-sommelier',
    active: true,
    _environmentId: ENV_ID,
    _organizationId: ORG_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as AgentEntity;
}

function baseCommand(overrides: Partial<CreateAgentCommand> = {}): CreateAgentCommand {
  return {
    userId: USER_ID,
    environmentId: ENV_ID,
    organizationId: ORG_ID,
    name: 'Wine Sommelier',
    identifier: 'wine-sommelier',
    ...overrides,
  } as CreateAgentCommand;
}

describe('CreateAgent usecase', () => {
  let agentRepo: { findOne: sinon.SinonStub; create: sinon.SinonStub };
  let analytics: { track: sinon.SinonStub };
  let featureFlags: { getFlag: sinon.SinonStub };
  let credentialsService: { upsertApiKey: sinon.SinonStub; getApiKey: sinon.SinonStub };
  let provisioningService: {
    ensureSharedEnvironment: sinon.SinonStub;
    createAgent: sinon.SinonStub;
    archiveAgent: sinon.SinonStub;
  };
  let logger: {
    warn: sinon.SinonStub;
    error: sinon.SinonStub;
    debug: sinon.SinonStub;
    info: sinon.SinonStub;
    setContext: sinon.SinonStub;
  };

  function build() {
    return new CreateAgent(
      agentRepo as any,
      analytics as any,
      featureFlags as any,
      credentialsService as any,
      provisioningService as any,
      logger as any
    );
  }

  beforeEach(() => {
    agentRepo = { findOne: sinon.stub().resolves(null), create: sinon.stub() };
    analytics = { track: sinon.stub() };
    featureFlags = { getFlag: sinon.stub().resolves(true) };
    credentialsService = { upsertApiKey: sinon.stub().resolves(), getApiKey: sinon.stub().resolves('sk-ant') };
    provisioningService = {
      ensureSharedEnvironment: sinon.stub().resolves('env_anthropic_1'),
      createAgent: sinon.stub().resolves({ agentId: 'agent_anthropic_1' }),
      archiveAgent: sinon.stub().resolves(),
    };
    logger = {
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
      setContext: sinon.stub(),
    };
  });

  afterEach(() => sinon.restore());

  describe('duplicates', () => {
    it('throws ConflictException when identifier already exists', async () => {
      agentRepo.findOne.resolves({ _id: 'existing' });

      try {
        await build().execute(baseCommand());
        throw new Error('expected to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(ConflictException);
      }
    });
  });

  describe('bridge runtime', () => {
    it('creates an agent without touching the provisioning service', async () => {
      agentRepo.create.resolves(makeAgent());

      const result = await build().execute(baseCommand({ runtime: AgentRuntimeEnum.BRIDGE }));

      expect(result.runtime).to.equal(AgentRuntimeEnum.BRIDGE);
      expect(provisioningService.ensureSharedEnvironment.called).to.equal(false);
      expect(provisioningService.createAgent.called).to.equal(false);
      expect(agentRepo.create.firstCall.args[0].managedRuntime).to.equal(undefined);
    });
  });

  describe('claude managed - feature flag disabled', () => {
    it('throws ForbiddenException', async () => {
      featureFlags.getFlag.resolves(false);

      try {
        await build().execute(
          baseCommand({
            runtime: AgentRuntimeEnum.CLAUDE_MANAGED,
            managedRuntime: { mode: 'create', system: 'You are helpful.' } as ManagedRuntimeSetupDto,
          })
        );
        throw new Error('expected to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenException);
      }
    });
  });

  describe('claude managed - mode create', () => {
    it('saves the api key, ensures shared env, creates an Anthropic agent, and persists managedRuntime', async () => {
      agentRepo.create.resolves(
        makeAgent({
          runtime: AgentRuntimeEnum.CLAUDE_MANAGED,
          managedRuntime: { provider: 'anthropic', agentId: 'agent_anthropic_1', environmentId: 'env_anthropic_1' },
        })
      );

      const result = await build().execute(
        baseCommand({
          runtime: AgentRuntimeEnum.CLAUDE_MANAGED,
          managedRuntime: {
            mode: 'create',
            apiKey: 'sk-ant-new',
            system: 'You are a sommelier.',
            tools: [{ name: 'web_fetch', enabled: false }],
          } as ManagedRuntimeSetupDto,
        })
      );

      expect(credentialsService.upsertApiKey.calledOnce).to.equal(true);
      expect(provisioningService.ensureSharedEnvironment.calledOnce).to.equal(true);
      expect(provisioningService.createAgent.calledOnce).to.equal(true);
      const createArg = provisioningService.createAgent.firstCall.args[0];
      expect(createArg.system).to.equal('You are a sommelier.');
      expect(createArg.tools).to.deep.equal([{ name: 'web_fetch', enabled: false }]);
      const persistedManagedRuntime = agentRepo.create.firstCall.args[0].managedRuntime;
      expect(persistedManagedRuntime.provider).to.equal('anthropic');
      expect(persistedManagedRuntime.agentId).to.equal('agent_anthropic_1');
      expect(persistedManagedRuntime.environmentId).to.equal('env_anthropic_1');
      expect(persistedManagedRuntime.mcpServers).to.equal(undefined);
      expect(result.runtime).to.equal(AgentRuntimeEnum.CLAUDE_MANAGED);
    });

    it('uses an already-stored api key when none is provided in the request', async () => {
      agentRepo.create.resolves(
        makeAgent({
          runtime: AgentRuntimeEnum.CLAUDE_MANAGED,
          managedRuntime: { provider: 'anthropic', agentId: 'agent_anthropic_1', environmentId: 'env_anthropic_1' },
        })
      );

      await build().execute(
        baseCommand({
          runtime: AgentRuntimeEnum.CLAUDE_MANAGED,
          managedRuntime: {
            mode: 'create',
            system: 'sys',
          } as ManagedRuntimeSetupDto,
        })
      );

      expect(credentialsService.upsertApiKey.called).to.equal(false);
      expect(credentialsService.getApiKey.called).to.equal(true);
      expect(provisioningService.createAgent.calledOnce).to.equal(true);
    });

    it('throws BadRequestException when no api key is available anywhere', async () => {
      credentialsService.getApiKey.rejects(new Error('not configured'));

      try {
        await build().execute(
          baseCommand({
            runtime: AgentRuntimeEnum.CLAUDE_MANAGED,
            managedRuntime: { mode: 'create', system: 'sys' } as ManagedRuntimeSetupDto,
          })
        );
        throw new Error('expected to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestException);
      }
    });

    it('throws BadRequestException when system is missing', async () => {
      try {
        await build().execute(
          baseCommand({
            runtime: AgentRuntimeEnum.CLAUDE_MANAGED,
            managedRuntime: { mode: 'create' } as ManagedRuntimeSetupDto,
          })
        );
        throw new Error('expected to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestException);
      }
    });

    it('archives the Anthropic agent when the Novu DB write fails after provisioning', async () => {
      agentRepo.create.rejects(new Error('mongo down'));

      try {
        await build().execute(
          baseCommand({
            runtime: AgentRuntimeEnum.CLAUDE_MANAGED,
            managedRuntime: { mode: 'create', system: 'sys' } as ManagedRuntimeSetupDto,
          })
        );
        throw new Error('expected to throw');
      } catch (err) {
        expect((err as Error).message).to.equal('mongo down');
      }

      expect(provisioningService.archiveAgent.calledOnce).to.equal(true);
      expect(provisioningService.archiveAgent.firstCall.args[1]).to.equal('agent_anthropic_1');
    });
  });

  describe('claude managed - mode existing', () => {
    it('persists the supplied IDs without calling Anthropic provisioning', async () => {
      agentRepo.create.resolves(
        makeAgent({
          runtime: AgentRuntimeEnum.CLAUDE_MANAGED,
          managedRuntime: { provider: 'anthropic', agentId: 'agent_111', environmentId: 'env_222' },
        })
      );

      await build().execute(
        baseCommand({
          runtime: AgentRuntimeEnum.CLAUDE_MANAGED,
          managedRuntime: {
            mode: 'existing',
            provider: 'anthropic',
            agentId: 'agent_111',
            environmentId: 'env_222',
          } as ManagedRuntimeSetupDto,
        })
      );

      expect(provisioningService.ensureSharedEnvironment.called).to.equal(false);
      expect(provisioningService.createAgent.called).to.equal(false);
      const persistedManagedRuntime = agentRepo.create.firstCall.args[0].managedRuntime;
      expect(persistedManagedRuntime.provider).to.equal('anthropic');
      expect(persistedManagedRuntime.agentId).to.equal('agent_111');
      expect(persistedManagedRuntime.environmentId).to.equal('env_222');
    });

    it('treats a payload missing `mode` but with legacy ids as `existing` (back-compat)', async () => {
      agentRepo.create.resolves(
        makeAgent({
          runtime: AgentRuntimeEnum.CLAUDE_MANAGED,
          managedRuntime: { provider: 'anthropic', agentId: 'agent_111', environmentId: 'env_222' },
        })
      );

      await build().execute(
        baseCommand({
          runtime: AgentRuntimeEnum.CLAUDE_MANAGED,
          managedRuntime: {
            provider: 'anthropic',
            agentId: 'agent_111',
            environmentId: 'env_222',
          } as unknown as ManagedRuntimeSetupDto,
        })
      );

      expect(provisioningService.createAgent.called).to.equal(false);
      expect(agentRepo.create.firstCall.args[0].managedRuntime.agentId).to.equal('agent_111');
    });

    it('rejects existing mode without IDs', async () => {
      try {
        await build().execute(
          baseCommand({
            runtime: AgentRuntimeEnum.CLAUDE_MANAGED,
            managedRuntime: { mode: 'existing' } as ManagedRuntimeSetupDto,
          })
        );
        throw new Error('expected to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestException);
      }
    });
  });
});

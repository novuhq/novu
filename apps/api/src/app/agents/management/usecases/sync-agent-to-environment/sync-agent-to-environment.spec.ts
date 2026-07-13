import { NotFoundException } from '@nestjs/common';
import type { AgentEntity, AgentIntegrationEntity, IntegrationEntity } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import { restore, stub } from 'sinon';
import { SyncAgentToEnvironmentCommand } from './sync-agent-to-environment.command';
import { SyncAgentToEnvironment } from './sync-agent-to-environment.usecase';

const SOURCE_ENV = 'source-env-id';
const TARGET_ENV = 'target-env-id';
const ORG_ID = 'org-id';
const USER_ID = 'user-id';

function baseCommand(overrides: Partial<SyncAgentToEnvironmentCommand> = {}): SyncAgentToEnvironmentCommand {
  return {
    agentIdentifier: 'my-agent',
    environmentId: SOURCE_ENV,
    targetEnvironmentId: TARGET_ENV,
    organizationId: ORG_ID,
    userId: USER_ID,
    ...overrides,
  } as SyncAgentToEnvironmentCommand;
}

function makeAgent(overrides: Partial<AgentEntity> = {}): AgentEntity {
  return {
    _id: 'agent-id',
    name: 'My Agent',
    identifier: 'my-agent',
    description: 'desc',
    behavior: undefined,
    active: true,
    _environmentId: SOURCE_ENV,
    _organizationId: ORG_ID,
    ...overrides,
  } as AgentEntity;
}

function makeIntegration(overrides: Partial<IntegrationEntity> = {}): IntegrationEntity {
  return {
    _id: 'integration-id',
    providerId: 'slack',
    channel: ChannelTypeEnum.CHAT,
    name: 'Slack',
    identifier: 'slack-id',
    credentials: {},
    active: true,
    primary: false,
    priority: 0,
    deleted: false,
    _environmentId: SOURCE_ENV,
    _organizationId: ORG_ID,
    ...overrides,
  } as IntegrationEntity;
}

function makeLink(overrides: Partial<AgentIntegrationEntity> = {}): AgentIntegrationEntity {
  return {
    _id: 'link-id',
    _agentId: 'agent-id',
    _integrationId: 'integration-id',
    _environmentId: SOURCE_ENV,
    _organizationId: ORG_ID,
    connectedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as AgentIntegrationEntity;
}

describe('SyncAgentToEnvironment usecase', () => {
  let agentRepo: {
    findOne: sinon.SinonStub;
    create: sinon.SinonStub;
    update: sinon.SinonStub;
  };
  let agentIntegrationRepo: {
    find: sinon.SinonStub;
    createOrReviveLink: sinon.SinonStub;
    delete: sinon.SinonStub;
  };
  let integrationRepo: {
    find: sinon.SinonStub;
    findOne: sinon.SinonStub;
    create: sinon.SinonStub;
    delete: sinon.SinonStub;
  };

  function buildUsecase() {
    return new SyncAgentToEnvironment(agentRepo as any, agentIntegrationRepo as any, integrationRepo as any);
  }

  beforeEach(() => {
    agentRepo = { findOne: stub(), create: stub(), update: stub().resolves() };
    agentIntegrationRepo = { find: stub(), createOrReviveLink: stub().resolves(), delete: stub().resolves() };
    integrationRepo = { find: stub(), findOne: stub(), create: stub(), delete: stub().resolves() };
  });

  afterEach(() => restore());

  describe('source agent not found', () => {
    it('throws NotFoundException', async () => {
      agentRepo.findOne.resolves(null);

      try {
        await buildUsecase().execute(baseCommand());
        throw new Error('Expected NotFoundException');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundException);
      }
    });
  });

  describe('fresh promotion — no target agent yet', () => {
    it('creates target agent as inactive with source metadata', async () => {
      const sourceAgent = makeAgent();
      agentRepo.findOne.onFirstCall().resolves(sourceAgent);
      agentRepo.findOne.onSecondCall().resolves(null);
      agentIntegrationRepo.find.resolves([]);
      integrationRepo.find.resolves([]);
      agentRepo.create.resolves(makeAgent({ _id: 'target-agent-id', active: false, _environmentId: TARGET_ENV }));

      await buildUsecase().execute(baseCommand());

      expect(agentRepo.create.calledOnce).to.equal(true);
      const createArg = agentRepo.create.firstCall.args[0];
      expect(createArg.identifier).to.equal('my-agent');
      expect(createArg.active).to.equal(false);
      expect(createArg._environmentId).to.equal(TARGET_ENV);
      expect(agentRepo.update.called).to.equal(false);
    });

    it('creates stub integrations and agent-integration links for each source integration', async () => {
      const sourceAgent = makeAgent();
      const sourceIntegration = makeIntegration();
      const sourceLink = makeLink();
      const targetAgent = makeAgent({ _id: 'target-agent-id', active: false, _environmentId: TARGET_ENV });
      const stubIntegration = makeIntegration({ _id: 'stub-id', _environmentId: TARGET_ENV });

      agentRepo.findOne.onFirstCall().resolves(sourceAgent);
      agentRepo.findOne.onSecondCall().resolves(null);
      agentIntegrationRepo.find.onFirstCall().resolves([sourceLink]);
      integrationRepo.find.onFirstCall().resolves([sourceIntegration]);
      agentRepo.create.resolves(targetAgent);
      agentIntegrationRepo.find.onSecondCall().resolves([]);
      integrationRepo.find.onSecondCall().resolves([]);
      integrationRepo.findOne.resolves(null);
      integrationRepo.create.resolves(stubIntegration);

      await buildUsecase().execute(baseCommand());

      expect(integrationRepo.create.calledOnce).to.equal(true);
      const stubArg = integrationRepo.create.firstCall.args[0];
      expect(stubArg.providerId).to.equal('slack');
      expect(stubArg.channel).to.equal(ChannelTypeEnum.CHAT);
      expect(stubArg._parentId).to.equal('integration-id');
      expect(stubArg._environmentId).to.equal(TARGET_ENV);
      expect(stubArg.active).to.equal(true);

      expect(agentIntegrationRepo.createOrReviveLink.calledOnce).to.equal(true);
      const linkArg = agentIntegrationRepo.createOrReviveLink.firstCall.args[0];
      expect(linkArg.agentId).to.equal('target-agent-id');
      expect(linkArg.integrationId).to.equal('stub-id');
      expect(linkArg.environmentId).to.equal(TARGET_ENV);
    });
  });

  describe('re-promotion — target agent already exists', () => {
    it('updates target agent metadata without changing active state', async () => {
      const sourceAgent = makeAgent({ name: 'Updated Name' });
      const targetAgent = makeAgent({ _id: 'target-id', active: true, _environmentId: TARGET_ENV });

      agentRepo.findOne.onFirstCall().resolves(sourceAgent);
      agentRepo.findOne.onSecondCall().resolves(targetAgent);
      agentIntegrationRepo.find.resolves([]);
      integrationRepo.find.resolves([]);

      await buildUsecase().execute(baseCommand());

      expect(agentRepo.create.called).to.equal(false);
      expect(agentRepo.update.calledOnce).to.equal(true);
      const updateQuery = agentRepo.update.firstCall.args[0];
      const updateBody = agentRepo.update.firstCall.args[1];
      expect(updateQuery._id).to.equal('target-id');
      expect(updateBody.$set.name).to.equal('Updated Name');
      expect(updateBody.$set.active).to.equal(undefined);
    });

    it('does not re-create integration stubs on repeated promotion', async () => {
      const sourceAgent = makeAgent();
      const targetAgent = makeAgent({ _id: 'target-id', _environmentId: TARGET_ENV });
      const sourceIntegration = makeIntegration({ _id: 'src-int-id' });
      const sourceLink = makeLink({ _integrationId: 'src-int-id' });
      const existingStub = makeIntegration({
        _id: 'existing-stub-id',
        _parentId: 'src-int-id',
        _environmentId: TARGET_ENV,
      });
      const existingTargetLink = makeLink({
        _id: 'target-link-id',
        _agentId: 'target-id',
        _integrationId: 'existing-stub-id',
        _environmentId: TARGET_ENV,
      });

      agentRepo.findOne.onFirstCall().resolves(sourceAgent);
      agentRepo.findOne.onSecondCall().resolves(targetAgent);
      agentIntegrationRepo.find.onFirstCall().resolves([sourceLink]);
      integrationRepo.find.onFirstCall().resolves([sourceIntegration]);
      agentIntegrationRepo.find.onSecondCall().resolves([existingTargetLink]);
      integrationRepo.find.onSecondCall().resolves([existingStub]);

      await buildUsecase().execute(baseCommand());

      expect(integrationRepo.create.called).to.equal(false);
      expect(agentIntegrationRepo.createOrReviveLink.called).to.equal(false);
    });
  });

  describe('integration removed from source', () => {
    it('unlinks integrations that are no longer connected to the source agent', async () => {
      const sourceAgent = makeAgent();
      const targetAgent = makeAgent({ _id: 'target-id', _environmentId: TARGET_ENV });
      const removedStub = makeIntegration({
        _id: 'old-stub-id',
        _parentId: 'removed-src-int-id',
        _environmentId: TARGET_ENV,
      });
      const orphanedLink = makeLink({
        _id: 'orphan-link-id',
        _agentId: 'target-id',
        _integrationId: 'old-stub-id',
        _environmentId: TARGET_ENV,
      });

      agentRepo.findOne.onFirstCall().resolves(sourceAgent);
      agentRepo.findOne.onSecondCall().resolves(targetAgent);
      agentIntegrationRepo.find.onFirstCall().resolves([]);
      agentIntegrationRepo.find.onSecondCall().resolves([orphanedLink]);
      integrationRepo.find.onFirstCall().resolves([removedStub]);
      agentIntegrationRepo.find.onThirdCall().resolves([]);

      await buildUsecase().execute(baseCommand());

      expect(agentIntegrationRepo.delete.calledOnce).to.equal(true);
      const deleteArg = agentIntegrationRepo.delete.firstCall.args[0];
      expect(deleteArg._id).to.equal('orphan-link-id');

      expect(integrationRepo.delete.calledOnce).to.equal(true);
      const integrationDeleteArg = integrationRepo.delete.firstCall.args[0];
      expect(integrationDeleteArg._id).to.equal('old-stub-id');
    });
  });

  describe('manually configured prod integration', () => {
    it('preserves manually configured prod integrations not originating from promotion', async () => {
      const sourceAgent = makeAgent();
      const targetAgent = makeAgent({ _id: 'target-id', _environmentId: TARGET_ENV });
      const manualIntegration = makeIntegration({ _id: 'manual-id', _environmentId: TARGET_ENV });
      const manualLink = makeLink({
        _id: 'manual-link-id',
        _agentId: 'target-id',
        _integrationId: 'manual-id',
        _environmentId: TARGET_ENV,
      });

      agentRepo.findOne.onFirstCall().resolves(sourceAgent);
      agentRepo.findOne.onSecondCall().resolves(targetAgent);
      agentIntegrationRepo.find.onFirstCall().resolves([]);
      integrationRepo.find.onFirstCall().resolves([]);
      agentIntegrationRepo.find.onSecondCall().resolves([manualLink]);
      integrationRepo.find.onSecondCall().resolves([manualIntegration]);

      await buildUsecase().execute(baseCommand());

      expect(agentIntegrationRepo.delete.called).to.equal(false);
    });
  });
});

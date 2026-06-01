import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as ApplicationGeneric from '@novu/application-generic';
import { FeatureFlagsService } from '@novu/application-generic';
import {
  AgentMcpServerRepository,
  AgentRepository,
  IntegrationRepository,
  McpConnectionRepository,
  SubscriberRepository,
} from '@novu/dal';
import {
  AgentRuntimeProviderIdEnum,
  buildClaudePlatformVaultUrl,
  buildConnectSubscriberId,
  McpConnectionAuthModeEnum,
  McpConnectionStatusEnum,
} from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import { EnsureProviderManagedVaultCommand } from './ensure-provider-managed-vault.command';
import { EnsureProviderManagedVault } from './ensure-provider-managed-vault.usecase';

const ENV_ID = 'env_789';
const ORG_ID = 'org_321';
const USER_ID = 'user_abc';
const AGENT_ID = 'agent_mongo_456';
const AGENT_IDENTIFIER = 'my-agent';
const ENABLEMENT_ID = 'ams_slack_1';
const SUBSCRIBER_MONGO_ID = 'sub_mongo_123';
const EXTERNAL_VAULT_ID = 'vlt_existing';

function makeLogger() {
  return {
    setContext: sinon.stub(),
    warn: sinon.stub(),
    error: sinon.stub(),
    info: sinon.stub(),
    debug: sinon.stub(),
  };
}

function makeCommand(overrides: Partial<EnsureProviderManagedVaultCommand> = {}) {
  return EnsureProviderManagedVaultCommand.create({
    userId: USER_ID,
    environmentId: ENV_ID,
    organizationId: ORG_ID,
    agentIdentifier: AGENT_IDENTIFIER,
    mcpId: 'slack',
    ...overrides,
  });
}

function makeManagedAgent(providerId = AgentRuntimeProviderIdEnum.Anthropic) {
  return {
    _id: AGENT_ID,
    runtime: 'managed',
    managedRuntime: {
      providerId,
      _integrationId: 'integration_1',
    },
  };
}

describe('EnsureProviderManagedVault', () => {
  let useCase: EnsureProviderManagedVault;
  let agentRepository: sinon.SinonStubbedInstance<AgentRepository>;
  let agentMcpServerRepository: sinon.SinonStubbedInstance<AgentMcpServerRepository>;
  let mcpConnectionRepository: sinon.SinonStubbedInstance<McpConnectionRepository>;
  let integrationRepository: sinon.SinonStubbedInstance<IntegrationRepository>;
  let subscriberRepository: sinon.SinonStubbedInstance<SubscriberRepository>;
  let createOrUpdateSubscriber: { execute: sinon.SinonStub };
  let enableAgentMcpServer: { execute: sinon.SinonStub };
  let mcpConnectionVaultService: { ensureConnectionVault: sinon.SinonStub };
  let featureFlagsService: sinon.SinonStubbedInstance<FeatureFlagsService>;
  let runtimeProvider: { capabilities: { tokenVault: boolean }; createVault?: sinon.SinonStub };

  beforeEach(() => {
    agentRepository = sinon.createStubInstance(AgentRepository);
    agentMcpServerRepository = sinon.createStubInstance(AgentMcpServerRepository);
    mcpConnectionRepository = sinon.createStubInstance(McpConnectionRepository);
    integrationRepository = sinon.createStubInstance(IntegrationRepository);
    subscriberRepository = sinon.createStubInstance(SubscriberRepository);
    createOrUpdateSubscriber = { execute: sinon.stub() };
    enableAgentMcpServer = { execute: sinon.stub().resolves({}) };
    mcpConnectionVaultService = { ensureConnectionVault: sinon.stub().resolves(EXTERNAL_VAULT_ID) };
    featureFlagsService = sinon.createStubInstance(FeatureFlagsService);
    featureFlagsService.getFlag.resolves(true);
    runtimeProvider = { capabilities: { tokenVault: true } };

    sinon.stub(ApplicationGeneric, 'resolveAgentRuntime').returns({
      credentials: {},
      provider: runtimeProvider as never,
    } as never);

    agentRepository.findOne.resolves(makeManagedAgent() as never);
    integrationRepository.findOne.resolves({ credentials: { apiKey: 'sk-test' } } as never);
    subscriberRepository.findBySubscriberId.withArgs(ENV_ID, buildConnectSubscriberId(USER_ID)).resolves({
      _id: SUBSCRIBER_MONGO_ID,
      subscriberId: buildConnectSubscriberId(USER_ID),
    } as never);
    agentMcpServerRepository.findByAgent.resolves([{ _id: ENABLEMENT_ID }] as never);
    agentMcpServerRepository.findByAgentAndMcpId.resolves({
      _id: ENABLEMENT_ID,
      mcpId: 'slack',
      defaultAuthMode: McpConnectionAuthModeEnum.ProviderManaged,
    } as never);
    mcpConnectionRepository.findSubscriberExternalVaultId.resolves(null);
    mcpConnectionRepository.findSubscriberConnection.resolves(null);
    mcpConnectionRepository.create.resolves({
      _id: 'conn_1',
      authMode: McpConnectionAuthModeEnum.ProviderManaged,
      status: McpConnectionStatusEnum.PendingOAuth,
    } as never);
    mcpConnectionRepository.update.resolves({ acknowledged: true } as never);

    useCase = new EnsureProviderManagedVault(
      agentRepository as never,
      agentMcpServerRepository as never,
      mcpConnectionRepository as never,
      integrationRepository as never,
      subscriberRepository as never,
      createOrUpdateSubscriber as never,
      enableAgentMcpServer as never,
      mcpConnectionVaultService as never,
      featureFlagsService as never,
      makeLogger() as never
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('rejects unknown catalog ids', async () => {
    try {
      await useCase.execute(makeCommand({ mcpId: 'not-in-catalog' }));
      expect.fail('Expected BadRequestException');
    } catch (err) {
      expect(err).to.be.instanceOf(BadRequestException);
    }
  });

  it('rejects MCPs that are not provider-managed', async () => {
    try {
      await useCase.execute(makeCommand({ mcpId: 'linear' }));
      expect.fail('Expected BadRequestException');
    } catch (err) {
      expect(err).to.be.instanceOf(BadRequestException);
    }
  });

  it('rejects when the provider-managed rollout flag is off before provisioning a subscriber', async () => {
    featureFlagsService.getFlag.resolves(false);

    try {
      await useCase.execute(makeCommand());
      expect.fail('Expected ForbiddenException');
    } catch (err) {
      expect(err).to.be.instanceOf(ForbiddenException);
    }

    expect(subscriberRepository.findBySubscriberId.called).to.equal(false);
    expect(createOrUpdateSubscriber.execute.called).to.equal(false);
    expect(enableAgentMcpServer.execute.called).to.equal(false);
  });

  it('rejects when the agent does not exist', async () => {
    agentRepository.findOne.resolves(null);

    try {
      await useCase.execute(makeCommand());
      expect.fail('Expected NotFoundException');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
    }
  });

  it('rejects non-managed-runtime agents', async () => {
    agentRepository.findOne.resolves({ _id: AGENT_ID, runtime: 'bridge' } as never);

    try {
      await useCase.execute(makeCommand());
      expect.fail('Expected UnprocessableEntityException');
    } catch (err) {
      expect(err).to.be.instanceOf(UnprocessableEntityException);
    }
  });

  it('rejects NovuAnthropic agents because they have no vault deep link', async () => {
    agentRepository.findOne.resolves(makeManagedAgent(AgentRuntimeProviderIdEnum.NovuAnthropic) as never);

    try {
      await useCase.execute(makeCommand());
      expect.fail('Expected UnprocessableEntityException');
    } catch (err) {
      expect(err).to.be.instanceOf(UnprocessableEntityException);
    }
  });

  it('returns the Claude vault deep link after provisioning', async () => {
    const result = await useCase.execute(makeCommand());

    expect(result.externalVaultId).to.equal(EXTERNAL_VAULT_ID);
    expect(result.vaultUrl).to.equal(buildClaudePlatformVaultUrl(EXTERNAL_VAULT_ID));
    expect(enableAgentMcpServer.execute.calledOnce).to.equal(true);
    expect(mcpConnectionVaultService.ensureConnectionVault.calledOnce).to.equal(true);
    expect(mcpConnectionRepository.update.calledOnce).to.equal(true);
  });

  it('reuses an existing subscriber vault id when a sibling MCP already owns one', async () => {
    mcpConnectionRepository.findSubscriberExternalVaultId.resolves(EXTERNAL_VAULT_ID);

    const result = await useCase.execute(makeCommand());

    expect(result.externalVaultId).to.equal(EXTERNAL_VAULT_ID);
    expect(mcpConnectionVaultService.ensureConnectionVault.called).to.equal(false);
    expect(mcpConnectionRepository.setConnectionExternalVaultIdIfMissing.calledOnce).to.equal(true);
  });

  it('treats ConflictException from enable as idempotent success', async () => {
    enableAgentMcpServer.execute.rejects(new ConflictException('already enabled'));

    const result = await useCase.execute(makeCommand());

    expect(result.externalVaultId).to.equal(EXTERNAL_VAULT_ID);
    expect(agentMcpServerRepository.findByAgentAndMcpId.calledOnce).to.equal(true);
  });

  it('prefers the connect: subscriber row over the legacy dashboard user id', async () => {
    await useCase.execute(makeCommand());

    expect(subscriberRepository.findBySubscriberId.firstCall.args).to.deep.equal([
      ENV_ID,
      buildConnectSubscriberId(USER_ID),
    ]);
    expect(createOrUpdateSubscriber.execute.called).to.equal(false);
  });

  it('reuses a vault id already stored on a concurrent-winner connection row', async () => {
    mcpConnectionRepository.findSubscriberConnection.onFirstCall().resolves(null);
    mcpConnectionRepository.create.rejects(new Error('duplicate key'));
    mcpConnectionRepository.findSubscriberConnection.onSecondCall().resolves({
      _id: 'conn_winner',
      auth: { externalVaultId: 'vlt_winner' },
    } as never);

    const result = await useCase.execute(makeCommand());

    expect(result.externalVaultId).to.equal('vlt_winner');
    expect(mcpConnectionVaultService.ensureConnectionVault.called).to.equal(false);
  });
});

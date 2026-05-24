import * as AgentRuntimeFactoryModule from '@novu/application-generic/build/main/agent-runtimes/agent-runtime.factory';
import { AnalyticsService, encryptCredentials } from '@novu/application-generic';
import { AgentRepository, ConversationRepository, IntegrationRepository } from '@novu/dal';
import { AgentRuntimeProviderIdEnum, IntegrationKindEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import { MigrateAgentRuntimeCommand } from './migrate-agent-runtime.command';
import { MigrateAgentRuntime } from './migrate-agent-runtime.usecase';

describe('MigrateAgentRuntime', () => {
  let useCase: MigrateAgentRuntime;
  let agentRepository: sinon.SinonStubbedInstance<AgentRepository>;
  let integrationRepository: sinon.SinonStubbedInstance<IntegrationRepository>;
  let conversationRepository: sinon.SinonStubbedInstance<ConversationRepository>;
  let analyticsService: sinon.SinonStubbedInstance<AnalyticsService>;
  let sourceProvider: ReturnType<typeof buildMockProvider>;
  let targetProvider: ReturnType<typeof buildMockProvider>;
  let previousApiKey: string | undefined;

  const demoIntegrationId = '507f1f77bcf86cd799439011';
  const targetIntegrationId = '507f1f77bcf86cd799439012';
  const agentId = '507f1f77bcf86cd799439013';

  function buildMockProvider(overrides: Partial<Record<string, sinon.SinonStub>> = {}) {
    return {
      getConfig: sinon.stub().resolves({
        model: 'claude-3-5-sonnet-20241022',
        systemPrompt: 'demo prompt',
        tools: [{ externalId: 'web_search' }],
        mcpServers: [{ name: 'Slack', url: 'https://mcp.slack.com/mcp' }],
        skills: [],
      }),
      createAgent: sinon.stub().resolves({ externalAgentId: 'ext-target-agent' }),
      ...overrides,
    };
  }

  beforeEach(() => {
    previousApiKey = process.env.NOVU_MANAGED_CLAUDE_API_KEY;
    process.env.NOVU_MANAGED_CLAUDE_API_KEY = 'sk-ant-demo';

    agentRepository = sinon.createStubInstance(AgentRepository);
    integrationRepository = sinon.createStubInstance(IntegrationRepository);
    conversationRepository = sinon.createStubInstance(ConversationRepository);
    analyticsService = sinon.createStubInstance(AnalyticsService);

    sourceProvider = buildMockProvider();
    targetProvider = buildMockProvider();

    sinon.stub(AgentRuntimeFactoryModule, 'getAgentRuntimeProvider').callsFake((providerId: string) => {
      if (providerId === AgentRuntimeProviderIdEnum.NovuAnthropic) {
        return sourceProvider as never;
      }

      return targetProvider as never;
    });

    agentRepository.findOne.resolves({
      _id: agentId,
      name: 'Demo Agent',
      runtime: 'managed',
      managedRuntime: {
        providerId: AgentRuntimeProviderIdEnum.NovuAnthropic,
        _integrationId: demoIntegrationId,
        externalAgentId: 'ext-demo-agent',
      },
    } as any);

    integrationRepository.findOne.onFirstCall().resolves({
      _id: demoIntegrationId,
      providerId: AgentRuntimeProviderIdEnum.NovuAnthropic,
      kind: IntegrationKindEnum.AGENT,
      credentials: encryptCredentials({ externalEnvironmentId: 'env-demo' }),
    } as any);

    integrationRepository.findOne.onSecondCall().resolves({
      _id: targetIntegrationId,
      providerId: AgentRuntimeProviderIdEnum.Anthropic,
      kind: IntegrationKindEnum.AGENT,
      active: true,
      credentials: encryptCredentials({
        apiKey: 'sk-user-key',
        externalEnvironmentId: 'env-user',
      }),
    } as any);

    agentRepository.count.resolves(0);
    conversationRepository.clearExternalSessionIdsForAgent.resolves();

    useCase = new MigrateAgentRuntime(
      agentRepository as any,
      integrationRepository as any,
      conversationRepository as any,
      analyticsService as any
    );
  });

  afterEach(() => {
    sinon.restore();
    process.env.NOVU_MANAGED_CLAUDE_API_KEY = previousApiKey;
  });

  it('migrates agent from demo integration to user Anthropic integration', async () => {
    const result = await useCase.execute(
      MigrateAgentRuntimeCommand.create({
        identifier: 'demo-agent',
        integrationId: targetIntegrationId,
        environmentId: 'env-id',
        organizationId: 'org-id',
        userId: 'user-id',
      })
    );

    expect(result.integrationId).to.equal(targetIntegrationId);
    expect(result.externalAgentId).to.equal('ext-target-agent');
    expect(sourceProvider.getConfig.calledOnce).to.equal(true);
    expect(targetProvider.createAgent.calledOnce).to.equal(true);
    expect(agentRepository.update.calledOnce).to.equal(true);
    expect(conversationRepository.clearExternalSessionIdsForAgent.calledOnce).to.equal(true);
    expect(analyticsService.track.calledOnce).to.equal(true);
    expect(analyticsService.track.firstCall.args[0]).to.equal('[Novu Managed Claude] - Upgraded to own key');
  });
});

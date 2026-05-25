import { AgentRepository, ConversationRepository, IntegrationRepository } from '@novu/dal';
import { AgentRuntimeProviderIdEnum, IntegrationKindEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { CalculateDemoClaudeQuotaCommand } from './calculate-demo-claude-quota.command';
import { CalculateDemoClaudeQuota } from './calculate-demo-claude-quota.usecase';

describe('CalculateDemoClaudeQuota', () => {
  let useCase: CalculateDemoClaudeQuota;
  let integrationRepository: sinon.SinonStubbedInstance<IntegrationRepository>;
  let agentRepository: sinon.SinonStubbedInstance<AgentRepository>;
  let conversationRepository: sinon.SinonStubbedInstance<ConversationRepository>;
  let previousApiKey: string | undefined;

  beforeEach(() => {
    previousApiKey = process.env.NOVU_MANAGED_CLAUDE_API_KEY;
    process.env.NOVU_MANAGED_CLAUDE_API_KEY = 'sk-ant-demo';

    integrationRepository = sinon.createStubInstance(IntegrationRepository);
    agentRepository = sinon.createStubInstance(AgentRepository);
    conversationRepository = sinon.createStubInstance(ConversationRepository);

    useCase = new CalculateDemoClaudeQuota(
      integrationRepository as any,
      agentRepository as any,
      conversationRepository as any
    );
  });

  afterEach(() => {
    if (previousApiKey === undefined) {
      delete process.env.NOVU_MANAGED_CLAUDE_API_KEY;
    } else {
      process.env.NOVU_MANAGED_CLAUDE_API_KEY = previousApiKey;
    }
  });

  it('returns undefined when demo credentials are not configured', async () => {
    delete process.env.NOVU_MANAGED_CLAUDE_API_KEY;

    const result = await useCase.execute(
      CalculateDemoClaudeQuotaCommand.create({
        environmentId: 'env-id',
        organizationId: 'org-id',
      })
    );

    expect(result).to.equal(undefined);
  });

  it('marks quota exhausted when monthly conversation count reaches the limit', async () => {
    integrationRepository.find.resolves([{ _id: 'demo-integration-id' } as any]);
    agentRepository.find.resolves([{ _id: 'agent-id' } as any]);
    conversationRepository.count.resolves(10);

    const result = await useCase.execute(
      CalculateDemoClaudeQuotaCommand.create({
        environmentId: 'env-id',
        organizationId: 'org-id',
      })
    );

    expect(result?.isExhausted).to.equal(true);
    expect(result?.reason).to.equal('conversations');
    expect(result?.conversations).to.deep.equal({
      count: 10,
      limit: CalculateDemoClaudeQuota.MAX_CONVERSATIONS,
    });
  });

  it('marks token quota exhausted for a conversation', async () => {
    integrationRepository.find.resolves([{ _id: 'demo-integration-id' } as any]);
    agentRepository.find.resolves([{ _id: 'agent-id' } as any]);
    conversationRepository.count.resolves(1);
    conversationRepository.findOne.resolves({
      tokenUsage: { totalTokens: 100_000 },
    } as any);

    const result = await useCase.execute(
      CalculateDemoClaudeQuotaCommand.create({
        environmentId: 'env-id',
        organizationId: 'org-id',
        conversationId: 'conversation-id',
      })
    );

    expect(result?.isExhausted).to.equal(true);
    expect(result?.reason).to.equal('tokens');
    expect(result?.tokens).to.deep.equal({
      count: 100_000,
      limit: CalculateDemoClaudeQuota.MAX_TOKENS_PER_CONVERSATION,
    });
  });

  it('detects demo integrations via provider id', async () => {
    integrationRepository.findOne.resolves({
      providerId: AgentRuntimeProviderIdEnum.NovuAnthropic,
      kind: IntegrationKindEnum.AGENT,
    } as any);

    const isDemo = await useCase.isAgentOnDemoIntegration('env-id', 'org-id', 'integration-id');

    expect(isDemo).to.equal(true);
  });
});

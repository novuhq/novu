import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { HandleNovuToolsCommand, NovuToolsActionEnum } from './handle-novu-tools.command';
import { HandleNovuTools } from './handle-novu-tools.usecase';

describe('HandleNovuTools', () => {
  it('persists a protocol connection request instead of delivering a card for agent chat', async () => {
    const channel = {
      platform: AgentPlatformEnum.AGENT_CHAT,
      _integrationId: 'integration-id',
      platformThreadId: 'agent_chat:conversation-id',
    };
    const generateMcpOAuthUrl = {
      executeForSetupCard: sinon.stub().resolves({
        authorizeUrl: 'https://example.com/authorize',
        authorizeUrlWithAutoApprove: 'https://example.com/authorize?autoApprove=true',
      }),
    };
    const agentConversationService = {
      getConversation: sinon.stub().resolves({ _id: 'conversation-id' }),
      getPrimaryChannel: sinon.stub().returns(channel),
      persistMcpConnectionRequest: sinon.stub().resolves({ _id: 'activity-id' }),
    };
    const handleAgentReply = { execute: sinon.stub().resolves(undefined) };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
    };
    const usecase = new HandleNovuTools(
      {} as never,
      {} as never,
      {} as never,
      generateMcpOAuthUrl as never,
      {} as never,
      agentConversationService as never,
      handleAgentReply as never,
      {} as never,
      logger as never
    );

    await usecase.execute(
      HandleNovuToolsCommand.create({
        userId: 'organization-id',
        environmentId: 'environment-id',
        organizationId: 'organization-id',
        toolUseId: 'tool-use-id',
        action: NovuToolsActionEnum.RequestConnect,
        mcpId: 'example-mcp',
        conversationId: 'conversation-id',
        agentId: 'agent-id',
        agentIdentifier: 'agent-identifier',
        integrationIdentifier: 'integration-identifier',
        subscriberId: 'subscriber-id',
        sessionId: 'session-id',
        platform: AgentPlatformEnum.AGENT_CHAT,
        platformThreadId: 'agent_chat:conversation-id',
      })
    );

    expect(
      agentConversationService.persistMcpConnectionRequest.calledOnceWithExactly({
        conversationId: 'conversation-id',
        environmentId: 'environment-id',
        organizationId: 'organization-id',
        agentIdentifier: 'agent-identifier',
        channel,
        actionId: 'tool-use-id',
        mcpId: 'example-mcp',
        displayName: 'example-mcp',
        authorizeUrl: 'https://example.com/authorize',
        authorizeUrlWithAutoApprove: 'https://example.com/authorize?autoApprove=true',
      })
    ).to.equal(true);
    expect(handleAgentReply.execute.called).to.equal(false);
  });
});

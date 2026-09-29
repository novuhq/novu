import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { HandleNovuToolsCommand, NovuToolsActionEnum } from './handle-novu-tools.command';
import { HandleNovuTools } from './handle-novu-tools.usecase';

describe('HandleNovuTools', () => {
  it('persists a protocol connection request instead of delivering a card for web chat', async () => {
    const channel = {
      platform: AgentPlatformEnum.WEB_CHAT,
      _integrationId: 'integration-id',
      platformThreadId: 'web_chat:conversation-id',
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
        platform: AgentPlatformEnum.WEB_CHAT,
        platformThreadId: 'web_chat:conversation-id',
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

  it('routes provider-managed MCPs to the vault setup card instead of Novu OAuth', async () => {
    const ensureProviderManagedVault = {
      executeForSetupCard: sinon.stub().resolves({
        vaultUrl: 'https://api.novu.co/v1/agents/mcp/provider-managed/redirect?state=signed',
        externalVaultId: 'vlt_1',
      }),
    };
    const generateMcpOAuthUrl = { executeForSetupCard: sinon.stub() };
    const mcpConnectRedirect = { issue: sinon.stub().resolvesArg(0) };
    const handleAgentReply = { execute: sinon.stub().resolves(undefined) };
    const logger = { setContext: sinon.stub(), warn: sinon.stub(), error: sinon.stub() };

    const usecase = new HandleNovuTools(
      {} as never,
      {} as never,
      {} as never,
      generateMcpOAuthUrl as never,
      ensureProviderManagedVault as never,
      mcpConnectRedirect as never,
      {} as never,
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
        // `slack` is a provider-managed catalog entry.
        mcpId: 'slack',
        conversationId: 'conversation-id',
        agentId: 'agent-id',
        agentIdentifier: 'agent-identifier',
        integrationIdentifier: 'integration-identifier',
        subscriberId: 'subscriber-id',
        sessionId: 'session-id',
        platform: AgentPlatformEnum.SLACK,
        platformThreadId: 'slack:thread-id',
      })
    );

    expect(ensureProviderManagedVault.executeForSetupCard.calledOnce).to.equal(true);
    expect(generateMcpOAuthUrl.executeForSetupCard.called).to.equal(false);

    const vaultArg = ensureProviderManagedVault.executeForSetupCard.firstCall.args[0];
    expect(vaultArg).to.include({
      mcpId: 'slack',
      toolUseId: 'tool-use-id',
      integrationIdentifier: 'integration-identifier',
      platform: AgentPlatformEnum.SLACK,
      platformThreadId: 'slack:thread-id',
    });
    expect(handleAgentReply.execute.calledOnce).to.equal(true);
  });

  it('posts an error tool result when connect dispatch throws so the session never stays parked', async () => {
    const ensureProviderManagedVault = {
      executeForSetupCard: sinon.stub().rejects(new Error('vault provisioning failed')),
    };
    const generateMcpOAuthUrl = { executeForSetupCard: sinon.stub() };
    const sendToolResult = sinon.stub().resolves(undefined);
    const managedAgentService = { sendToolResult };
    const logger = { setContext: sinon.stub(), warn: sinon.stub(), error: sinon.stub() };

    const usecase = new HandleNovuTools(
      {} as never,
      {} as never,
      {} as never,
      generateMcpOAuthUrl as never,
      ensureProviderManagedVault as never,
      {} as never,
      {} as never,
      {} as never,
      managedAgentService as never,
      logger as never
    );

    await usecase.execute(
      HandleNovuToolsCommand.create({
        userId: 'organization-id',
        environmentId: 'environment-id',
        organizationId: 'organization-id',
        toolUseId: 'tool-use-id',
        action: NovuToolsActionEnum.RequestConnect,
        mcpId: 'slack',
        conversationId: 'conversation-id',
        agentId: 'agent-id',
        agentIdentifier: 'agent-identifier',
        integrationIdentifier: 'integration-identifier',
        subscriberId: 'subscriber-id',
        sessionId: 'session-id',
        platform: AgentPlatformEnum.SLACK,
        platformThreadId: 'slack:thread-id',
      })
    );

    expect(sendToolResult.calledOnce).to.equal(true);
    const resultArg = sendToolResult.firstCall.args[0];
    expect(resultArg.toolUseId).to.equal('tool-use-id');
    expect(JSON.parse(resultArg.content).error).to.be.a('string');
  });
});

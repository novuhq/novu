import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { OutboundGateway } from './outbound.gateway';

describe('OutboundGateway sendDirectMessage', () => {
  const agentId = 'agent1';
  const integrationIdentifier = 'email-main';
  const recipientAddress = 'user@example.com';
  const emailThreadId = 'email:user@example.com:abc123';

  function makeGateway(
    options: {
      platform?: AgentPlatformEnum;
      integrationIdentifier?: string;
      threadId?: string;
      adapterOpenDM?: sinon.SinonStub | null;
      chatOpenDM?: sinon.SinonStub;
      withBotToken?: sinon.SinonStub;
      resolveSlackBotToken?: sinon.SinonStub;
      threadPost?: sinon.SinonStub;
    } = {}
  ) {
    const platform = options.platform ?? AgentPlatformEnum.EMAIL;
    const resolvedIntegrationIdentifier = options.integrationIdentifier ?? integrationIdentifier;
    const threadId = options.threadId ?? emailThreadId;
    const threadPost = options.threadPost ?? sinon.stub().resolves({ id: 'msg-1', threadId });
    const thread = { post: threadPost };
    const adapterOpenDM =
      options.adapterOpenDM === null
        ? undefined
        : (options.adapterOpenDM ?? sinon.stub().resolves(threadId));
    const chatOpenDM =
      options.chatOpenDM ?? sinon.stub().rejects(new Error('chat.openDM should not be called'));
    const withBotToken =
      options.withBotToken ??
      sinon.stub().callsFake(async (_token: string, fn: () => Promise<unknown>) => fn());
    const resolveSlackBotToken = options.resolveSlackBotToken ?? sinon.stub().resolves('xoxb-test-token');

    const agentConfigResolver = {
      resolve: sinon.stub().resolves({
        platform,
        removeNovuBranding: true,
        agentIdentifier: 'my-agent',
        environmentId: 'env-1',
        organizationId: 'org-1',
        integrationIdentifier: resolvedIntegrationIdentifier,
        integrationId: 'integration-1',
      }),
      resolveSlackBotToken,
    };
    const registry = {
      getOrCreate: sinon.stub().resolves({
        openDM: chatOpenDM,
        thread: sinon.stub().returns(thread),
        getAdapter: sinon.stub().returns({
          ...(adapterOpenDM ? { openDM: adapterOpenDM } : {}),
          withBotToken,
        }),
      }),
    };
    const fileMaterializer = {
      prepareContentForDelivery: sinon.stub().callsFake(async (content: unknown) => content),
    };
    const actionTokenService = {
      applyActionTokens: sinon.stub().callsFake(async (content: unknown) => content),
    };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
    };

    const gateway = new OutboundGateway(
      registry as any,
      {} as any,
      agentConfigResolver as any,
      fileMaterializer as any,
      actionTokenService as any,
      logger as any
    );

    return {
      gateway,
      adapterOpenDM,
      chatOpenDM,
      threadPost,
      withBotToken,
      resolveSlackBotToken,
    };
  }

  it('opens email DMs via the platform adapter instead of chat.openDM', async () => {
    const { gateway, adapterOpenDM, chatOpenDM, threadPost } = makeGateway();

    const result = await gateway.sendDirectMessage(agentId, integrationIdentifier, recipientAddress, {
      markdown: 'Connected! Reply to this email to try it out.',
    });

    expect(adapterOpenDM?.calledOnceWith(recipientAddress)).to.equal(true);
    expect(chatOpenDM.called).to.equal(false);
    expect(threadPost.calledOnce).to.equal(true);
    expect(result).to.deep.equal({ messageId: 'msg-1', platformThreadId: emailThreadId });
  });

  it('falls back to chat.openDM when the platform adapter does not implement openDM', async () => {
    const slackThread = { post: sinon.stub().resolves({ id: 'msg-2', threadId: 'slack:D123:msg-2' }) };
    const chatOpenDM = sinon.stub().resolves(slackThread);
    const withBotToken = sinon.stub().callsFake(async (_token: string, fn: () => Promise<unknown>) => fn());

    const { gateway } = makeGateway({
      platform: AgentPlatformEnum.SLACK,
      integrationIdentifier: 'slack-main',
      adapterOpenDM: null,
      chatOpenDM,
      withBotToken,
      resolveSlackBotToken: sinon.stub().resolves('xoxb-test-token'),
    });

    const result = await gateway.sendDirectMessage(agentId, 'slack-main', 'U123456', {
      markdown: 'Your Slack app is connected! Send me a message to try it out.',
    });

    expect(chatOpenDM.calledOnceWith('U123456')).to.equal(true);
    expect(withBotToken.calledOnce).to.equal(true);
    expect(withBotToken.firstCall.args[0]).to.equal('xoxb-test-token');
    expect(result).to.deep.equal({ messageId: 'msg-2', platformThreadId: 'slack:D123:msg-2' });
  });

  it('binds the Slack bot token before openDM in multi-workspace mode', async () => {
    const callOrder: string[] = [];
    const adapterOpenDM = sinon.stub().callsFake(async () => {
      callOrder.push('openDM');

      return 'slack:D123:';
    });
    const threadPost = sinon.stub().callsFake(async () => {
      callOrder.push('post');

      return { id: 'msg-3', threadId: 'slack:D123:' };
    });
    const withBotToken = sinon.stub().callsFake(async (_token: string, fn: () => Promise<unknown>) => {
      callOrder.push('withBotToken');

      return fn();
    });

    const { gateway } = makeGateway({
      platform: AgentPlatformEnum.SLACK,
      integrationIdentifier: 'slack-main',
      threadId: 'slack:D123:',
      adapterOpenDM,
      threadPost,
      withBotToken,
      resolveSlackBotToken: sinon.stub().resolves('xoxb-workspace-token'),
    });

    const result = await gateway.sendDirectMessage(agentId, 'slack-main', 'U123456', {
      markdown: 'Your Slack app is connected! Send me a message to try it out.',
    });

    expect(callOrder).to.deep.equal(['withBotToken', 'openDM', 'post']);
    expect(withBotToken.firstCall.args[0]).to.equal('xoxb-workspace-token');
    expect(result).to.deep.equal({ messageId: 'msg-3', platformThreadId: 'slack:D123:msg-3' });
  });
});

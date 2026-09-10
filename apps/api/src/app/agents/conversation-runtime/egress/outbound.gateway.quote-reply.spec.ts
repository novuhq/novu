import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { OutboundGateway } from './outbound.gateway';
import { OutboundDeliveryInfo } from './outbound-delivery-info.service';

describe('OutboundGateway quote-reply', () => {
  const agentId = 'agent1';
  const integrationIdentifier = 'whatsapp-main';
  const platformThreadId = 'whatsapp:15551234567';

  function makeGateway(
    options: { platform?: AgentPlatformEnum; threadPost?: sinon.SinonStub; threadReply?: sinon.SinonStub } = {}
  ) {
    const platform = options.platform ?? AgentPlatformEnum.WHATSAPP;
    const threadPost = options.threadPost ?? sinon.stub().resolves({ id: 'msg-post', threadId: platformThreadId });
    const threadReply = options.threadReply ?? sinon.stub().resolves({ id: 'msg-reply', threadId: platformThreadId });
    const thread = { post: threadPost, reply: threadReply };

    const agentConfigResolver = {
      resolve: sinon.stub().resolves({
        platform,
        removeNovuBranding: true,
        agentIdentifier: 'my-agent',
        environmentId: 'env-1',
        organizationId: 'org-1',
        integrationIdentifier,
        integrationId: 'integration-1',
      }),
    };
    const registry = {
      getOrCreate: sinon.stub().resolves({
        thread: sinon.stub().returns(thread),
        getAdapter: sinon.stub().returns({}),
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
      new OutboundDeliveryInfo(),
      logger as any
    );

    return { gateway, threadPost, threadReply };
  }

  it('calls thread.reply on WhatsApp when quoteReply.messageId is set', async () => {
    const { gateway, threadPost, threadReply } = makeGateway();

    const sent = await gateway.postToConversation(
      agentId,
      integrationIdentifier,
      AgentPlatformEnum.WHATSAPP,
      platformThreadId,
      { markdown: 'Quoted answer' },
      { quoteReply: { messageId: 'wamid.abc123' } }
    );

    expect(threadReply.calledOnce).to.equal(true);
    expect(threadReply.firstCall.args[0]).to.equal('wamid.abc123');
    expect(threadReply.firstCall.args[1]).to.include({ markdown: 'Quoted answer' });
    expect(threadPost.called).to.equal(false);
    expect(sent).to.deep.equal({ messageId: 'msg-reply', platformThreadId });
  });

  it('falls back to thread.post on WhatsApp when quoteReply is omitted', async () => {
    const { gateway, threadPost, threadReply } = makeGateway();

    await gateway.postToConversation(agentId, integrationIdentifier, AgentPlatformEnum.WHATSAPP, platformThreadId, {
      markdown: 'Loose message',
    });

    expect(threadPost.calledOnce).to.equal(true);
    expect(threadReply.called).to.equal(false);
  });

  it('keeps thread.post on non-WhatsApp platforms even when quoteReply is set', async () => {
    const { gateway, threadPost, threadReply } = makeGateway({ platform: AgentPlatformEnum.TELEGRAM });

    await gateway.postToConversation(
      agentId,
      'telegram-main',
      AgentPlatformEnum.TELEGRAM,
      'telegram:12345',
      { markdown: 'Quoted answer' },
      { quoteReply: { messageId: '42' } }
    );

    expect(threadPost.calledOnce).to.equal(true);
    expect(threadReply.called).to.equal(false);
  });
});

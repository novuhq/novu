import { expect } from 'chai';
import sinon from 'sinon';
import { type ConversationTarget, OutboundGateway, type OutboundPersistContext } from './outbound.gateway';

describe('OutboundGateway', () => {
  let chat: { postToConversation: sinon.SinonStub; editInConversation: sinon.SinonStub };
  let conversation: { persistAgentMessage: sinon.SinonStub; persistAgentEdit: sinon.SinonStub };

  const target: ConversationTarget = {
    agentId: 'agent-1',
    integrationIdentifier: 'slack-int',
    platform: 'slack',
    platformThreadId: 'thread-1',
  };

  const persist: OutboundPersistContext = {
    conversationId: 'conv-1',
    channel: { platform: 'slack', _integrationId: 'int-1', platformThreadId: 'thread-1' } as any,
    agentIdentifier: 'my-agent',
    agentName: 'My Agent',
    environmentId: 'env-1',
    organizationId: 'org-1',
  };

  function buildGateway() {
    return new OutboundGateway(chat as any, conversation as any);
  }

  beforeEach(() => {
    chat = {
      postToConversation: sinon.stub().resolves({ messageId: 'msg-123', platformThreadId: 'thread-1' }),
      editInConversation: sinon.stub().resolves({ messageId: 'msg-456', platformThreadId: 'thread-1' }),
    };
    conversation = {
      persistAgentMessage: sinon.stub().resolves({}),
      persistAgentEdit: sinon.stub().resolves({}),
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('deliver', () => {
    it('delivers once, persists once, and persists the delivered messageId', async () => {
      const result = await buildGateway().deliver(target, { markdown: 'Hello' }, persist);

      expect(chat.postToConversation.calledOnce).to.equal(true);
      expect(conversation.persistAgentMessage.calledOnce).to.equal(true);

      const persistArgs = conversation.persistAgentMessage.firstCall.args[0];
      expect(persistArgs.platformMessageId).to.equal('msg-123');
      expect(persistArgs.conversationId).to.equal('conv-1');
      expect(persistArgs.content).to.equal('Hello');

      expect(result).to.deep.equal({ messageId: 'msg-123', platformThreadId: 'thread-1' });
    });
  });

  describe('replyOnThread', () => {
    it('posts once and maps {id, threadId} -> {messageId, platformThreadId}', async () => {
      const post = sinon.stub().resolves({ id: 'm-1', threadId: 't-1' });
      const thread = { post } as any;

      const result = await buildGateway().replyOnThread(thread, { markdown: 'hi' });

      expect(post.calledOnce).to.equal(true);
      expect(result).to.deep.equal({ messageId: 'm-1', platformThreadId: 't-1' });
    });

    it('returns null when post rejects and failSoft is set', async () => {
      const post = sinon.stub().rejects(new Error('boom'));
      const thread = { post } as any;

      const result = await buildGateway().replyOnThread(thread, { markdown: 'hi' }, { failSoft: true });

      expect(result).to.equal(null);
    });
  });
});

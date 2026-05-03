import { expect } from 'chai';
import sinon from 'sinon';
import { AgentEventEnum } from '../dtos/agent-event.enum';
import { AgentInboundHandler } from './agent-inbound-handler.service';

describe('AgentInboundHandler', () => {
  const config = {
    environmentId: 'env1',
    organizationId: 'org1',
    platform: 'slack',
    integrationIdentifier: 'slack-main',
    integrationId: 'integration1',
    agentIdentifier: 'support-agent',
    acknowledgeOnReceived: false,
  };

  const conversation = {
    _id: 'conversation1',
    channels: [{ platformThreadId: 'thread1', platform: 'slack', _integrationId: 'integration1' }],
  };

  function makeLogger() {
    return {
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
      setContext: sinon.stub(),
    };
  }

  function makeHandler(overrides: { history?: any[]; storedAttachments?: any[] } = {}) {
    const logger = makeLogger();
    const subscriberResolver = {
      resolve: sinon.stub().resolves(null),
    };
    const conversationService = {
      findByPlatformThread: sinon.stub().resolves(conversation),
      getHistory: sinon.stub().resolves(overrides.history ?? []),
    };
    const bridgeExecutor = {
      execute: sinon.stub().resolves(undefined),
    };
    const subscriberRepository = {
      findBySubscriberId: sinon.stub(),
    };
    const analyticsService = {
      track: sinon.stub(),
    };
    const attachmentStorage = {
      storeInbound: sinon.stub().resolves(overrides.storedAttachments ?? []),
    };
    const handler = new AgentInboundHandler(
      logger as any,
      subscriberResolver as any,
      conversationService as any,
      bridgeExecutor as any,
      subscriberRepository as any,
      analyticsService as any,
      attachmentStorage as any
    );

    return { handler, attachmentStorage, bridgeExecutor, conversationService };
  }

  function makeHandleDeps() {
    const logger = makeLogger();
    const subscriberResolver = { resolve: sinon.stub().resolves(null) };
    const createOrGetConversation = sinon.stub().resolves(conversation);
    const persistInboundMessage = sinon.stub().resolves({});
    const updateChannelThread = sinon.stub().resolves(undefined);
    const setFirstPlatformMessageId = sinon.stub().resolves(undefined);
    const getPrimaryChannel = sinon.stub().returns({ firstPlatformMessageId: undefined });
    const getHistory = sinon.stub().resolves([]);
    const conversationService = {
      createOrGetConversation,
      persistInboundMessage,
      updateChannelThread,
      setFirstPlatformMessageId,
      getPrimaryChannel,
      getHistory,
    };
    const bridgeExecutor = { execute: sinon.stub().resolves(undefined) };
    const subscriberRepository = { findBySubscriberId: sinon.stub().resolves(null) };
    const analyticsService = { track: sinon.stub() };
    const attachmentStorage = {
      storeInbound: sinon.stub().resolves([
        {
          type: 'image',
          name: 'photo.png',
          mimeType: 'image/png',
          size: 10,
          storageKey: 'k',
        },
      ]),
    };
    const handler = new AgentInboundHandler(
      logger as any,
      subscriberResolver as any,
      conversationService as any,
      bridgeExecutor as any,
      subscriberRepository as any,
      analyticsService as any,
      attachmentStorage as any
    );

    return {
      handler,
      createOrGetConversation,
      persistInboundMessage,
      bridgeExecutor,
      attachmentStorage,
    };
  }

  function makeReactionEvent() {
    return {
      emoji: { name: 'thumbs_up', toJSON: () => 'thumbs_up', toString: () => 'thumbs_up' },
      added: true,
      messageId: 'source-msg',
      message: {
        id: 'source-msg',
        text: 'Message with attachment',
        author: {
          userId: 'user1',
          fullName: 'User One',
          userName: 'userone',
          isBot: false,
        },
        attachments: [
          {
            type: 'image',
            name: 'image.png',
            mimeType: 'image/png',
            size: 123,
          },
        ],
      },
      thread: {
        id: 'thread1',
        channelId: 'channel1',
        isDM: false,
      },
    };
  }

  describe('handleReaction', () => {
    it('should reuse stored source message attachments from history', async () => {
      const { handler, attachmentStorage, bridgeExecutor } = makeHandler({
        history: [
          {
            platformMessageId: 'source-msg',
            richContent: {
              attachments: [
                {
                  type: 'image',
                  name: 'image.png',
                  mimeType: 'image/png',
                  size: 123,
                  storageKey: 'org1/env1/agents/conversation1/source-msg/0-image.png',
                },
              ],
            },
          },
        ],
      });

      await handler.handleReaction('agent1', config as any, makeReactionEvent() as any);

      expect(attachmentStorage.storeInbound.called).to.equal(false);
      const params = bridgeExecutor.execute.firstCall.args[0];
      expect(params.event).to.equal(AgentEventEnum.ON_REACTION);
      expect(params.reaction.sourceMessageStoredAttachments).to.deep.equal([
        {
          type: 'image',
          name: 'image.png',
          mimeType: 'image/png',
          size: 123,
          storageKey: 'org1/env1/agents/conversation1/source-msg/0-image.png',
          url: undefined,
        },
      ]);
    });

    it('should store source message attachments when history has no stored metadata', async () => {
      const storedAttachments = [
        {
          type: 'image',
          name: 'image.png',
          mimeType: 'image/png',
          size: 123,
          storageKey: 'org1/env1/agents/conversation1/source-msg/0-image.png',
          url: 'https://signed/read',
        },
      ];
      const { handler, attachmentStorage, bridgeExecutor } = makeHandler({ storedAttachments });

      await handler.handleReaction('agent1', config as any, makeReactionEvent() as any);

      expect(attachmentStorage.storeInbound.calledOnce).to.equal(true);
      expect(attachmentStorage.storeInbound.firstCall.args[1].platformMessageId).to.equal('source-msg');
      const params = bridgeExecutor.execute.firstCall.args[0];
      expect(params.reaction.sourceMessageStoredAttachments).to.deep.equal(storedAttachments);
    });
  });

  describe('handle', () => {
    it('should tolerate attachment-only messages with undefined text', async () => {
      const { handler, createOrGetConversation, persistInboundMessage, bridgeExecutor } = makeHandleDeps();
      const thread = {
        id: 'thread1',
        channelId: 'C1',
        isDM: false,
        toJSON: () => ({ id: 'thread1' }),
      };
      const message = {
        id: 'm1',
        text: undefined,
        author: { userId: 'U1', fullName: 'User', userName: 'u', isBot: false },
        metadata: { dateSent: new Date() },
        attachments: [{ type: 'image', name: 'photo.png', size: 10 }],
      };

      await handler.handle('agent1', config as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(createOrGetConversation.calledOnce).to.equal(true);
      expect(createOrGetConversation.firstCall.args[0].firstMessageText).to.equal('[Attachment: photo.png]');
      expect(persistInboundMessage.calledOnce).to.equal(true);
      expect(persistInboundMessage.firstCall.args[0].content).to.equal('');

      const bridgeParams = bridgeExecutor.execute.firstCall.args[0];
      expect(bridgeParams.message.text).to.equal('');
    });
  });
});

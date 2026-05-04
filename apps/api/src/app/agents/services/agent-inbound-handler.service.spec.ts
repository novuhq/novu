import { expect } from 'chai';
import sinon from 'sinon';
import { AgentEventEnum } from '../dtos/agent-event.enum';
import { AgentInboundHandler } from './agent-inbound-handler.service';
import { NoBridgeUrlError } from './bridge-executor.service';

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

  function makeHandler(overrides: { history?: any[]; storedAttachments?: any[]; bridgeError?: Error } = {}) {
    const logger = makeLogger();
    const subscriberResolver = {
      resolve: sinon.stub().resolves(null),
    };
    const conversationService = {
      createOrGetConversation: sinon.stub().resolves(conversation),
      getPrimaryChannel: sinon.stub().callsFake((conv) => conv.channels[0]),
      persistInboundMessage: sinon.stub().resolves({ _id: 'activity1' }),
      persistAgentMessage: sinon.stub().resolves({ _id: 'agent-activity1' }),
      setFirstPlatformMessageId: sinon.stub().resolves(undefined),
      updateChannelThread: sinon.stub().resolves(undefined),
      findByPlatformThread: sinon.stub().resolves(conversation),
      getHistory: sinon.stub().resolves(overrides.history ?? []),
    };
    const bridgeExecutor = {
      execute: overrides.bridgeError ? sinon.stub().rejects(overrides.bridgeError) : sinon.stub().resolves(undefined),
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

  function makeSlackDmThread() {
    return {
      id: 'slack:D123:',
      channelId: 'slack:D123',
      isDM: true,
      toJSON: () => ({
        id: 'slack:D123:',
        channelId: 'slack:D123',
        isDM: true,
        currentMessage: {
          id: '1777837477.371619',
          threadId: 'slack:D123:',
        },
      }),
      startTyping: sinon.stub().resolves(undefined),
      post: sinon.stub().resolves({ id: '1777837479.427739', threadId: 'slack:D123:1777837477.371619' }),
    };
  }

  function makeSlackDmMessage() {
    return {
      id: '1777837477.371619',
      threadId: 'slack:D123:',
      text: 'hello',
      author: {
        userId: 'user1',
        fullName: 'User One',
        userName: 'userone',
        isBot: false,
      },
      raw: {
        type: 'message',
        channel_type: 'im',
        ts: '1777837477.371619',
      },
      attachments: [],
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

  describe('handle', () => {
    it('should persist Slack DMs with a message-rooted platform thread id when the SDK thread id is empty', async () => {
      const { handler, bridgeExecutor, conversationService } = makeHandler();
      const thread = makeSlackDmThread();
      const message = makeSlackDmMessage();
      const expectedThreadId = 'slack:D123:1777837477.371619';

      await handler.handle('agent1', config as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(conversationService.createOrGetConversation.firstCall.args[0].platformThreadId).to.equal(expectedThreadId);
      expect(conversationService.persistInboundMessage.firstCall.args[0].platformThreadId).to.equal(expectedThreadId);
      expect(conversationService.setFirstPlatformMessageId.firstCall.args[3]).to.equal(expectedThreadId);
      expect(conversationService.updateChannelThread.firstCall.args[3]).to.equal(expectedThreadId);
      expect(conversationService.updateChannelThread.firstCall.args[4].id).to.equal(expectedThreadId);
      expect(conversationService.updateChannelThread.firstCall.args[4].currentMessage.threadId).to.equal(
        expectedThreadId
      );
      expect(bridgeExecutor.execute.firstCall.args[0].platformContext.threadId).to.equal(expectedThreadId);
    });

    it('should post no-bridge Slack DM auto-replies with the message-rooted platform thread id', async () => {
      const { handler } = makeHandler({ bridgeError: new NoBridgeUrlError('support-agent') });
      const thread = makeSlackDmThread();
      const message = makeSlackDmMessage();
      const expectedThreadId = 'slack:D123:1777837477.371619';

      thread.post.callsFake(async () => {
        expect(thread.id).to.equal(expectedThreadId);

        return { id: '1777837479.427739', threadId: thread.id };
      });

      await handler.handle('agent1', config as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(thread.post.calledOnce).to.equal(true);
    });
  });

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
});

import { expect } from 'chai';
import sinon from 'sinon';
import { ManagedRuntime } from '../../managed-runtime/managed.runtime';
import { AgentEventEnum } from '../../shared/enums/agent-event.enum';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { UNRESOLVED_SUBSCRIBER_ACCESS_REPLY } from '../../shared/util/agent-inbound-replies';
import { BridgeRuntime } from '../runtime/bridge.runtime';
import { NoBridgeUrlError } from '../runtime/bridge-executor.service';
import { AgentInboundHandler } from './inbound-turn.handler';

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

  function makeHandler(
    overrides: {
      history?: any[];
      storedAttachments?: any[];
      bridgeError?: Error;
      linkTelegramExecute?: sinon.SinonStub;
      startCodeConsume?: sinon.SinonStub;
      findTelegramEndpointByIdentity?: sinon.SinonStub;
      agentFindOne?: sinon.SinonStub;
      subscriberFindById?: sinon.SinonStub;
      subscriberResolve?: sinon.SinonStub;
    } = {}
  ) {
    const logger = makeLogger();
    const subscriberResolver = {
      resolveOnly: overrides.subscriberResolve ?? sinon.stub().resolves(null),
      resolveOrProvision:
        overrides.subscriberResolve ?? sinon.stub().resolves(`sub_${Math.random().toString(36).slice(2, 14)}`),
    };
    const conversationService = {
      createOrGetConversation: sinon.stub().resolves(conversation),
      getPrimaryChannel: sinon.stub().callsFake((conv) => conv.channels[0]),
      persistInboundMessage: sinon.stub().resolves({ _id: 'activity1' }),
      persistAgentMessage: sinon.stub().resolves({ _id: 'agent-activity1' }),
      setFirstPlatformMessageId: sinon.stub().resolves(undefined),
      findByPlatformThread: sinon.stub().resolves(conversation),
      getHistory: sinon.stub().resolves(overrides.history ?? []),
      findSourceActivity: sinon
        .stub()
        .callsFake(
          async (_environmentId: string, _conversationId: string, platformMessageId: string) =>
            (overrides.history ?? []).find((activity: any) => activity?.platformMessageId === platformMessageId) ?? null
        ),
      countAgentMessages: sinon.stub().resolves(0),
    };
    const bridgeExecutor = {
      execute: overrides.bridgeError ? sinon.stub().rejects(overrides.bridgeError) : sinon.stub().resolves(undefined),
    };
    const subscriberRepository = {
      findBySubscriberId: overrides.subscriberFindById ?? sinon.stub(),
    };
    const managedAgentService = {
      dispatch: sinon.stub().resolves({ status: 'active' }),
    };
    const confirmToolApproval = {
      execute: sinon.stub().resolves(undefined),
    };
    const inboundDispatcher = {
      registerInboundCallbacks: sinon.stub(),
    };
    const agentRepository = {
      findOne: overrides.agentFindOne ?? sinon.stub().resolves(null),
    };
    const environmentRepository = {
      findOne: sinon.stub().resolves(null),
    };
    const outboundGateway = {
      replyOnThread: sinon.stub().callsFake(async (thread: { post: sinon.SinonStub }, msg: { markdown?: string }) => {
        const result = await thread.post(msg.markdown ?? msg);

        return { messageId: result.id, platformThreadId: result.threadId };
      }),
    };
    const inboundAck = {
      showWorkingSignal: sinon.stub().resolves(undefined),
      showQueuedSignal: sinon.stub().resolves(undefined),
    };
    const bridgeRuntime = new BridgeRuntime(
      bridgeExecutor as any,
      outboundGateway as any,
      conversationService as any,
      environmentRepository as any,
      logger as any
    );
    const managedRuntime = new ManagedRuntime(
      managedAgentService as any,
      confirmToolApproval as any,
      outboundGateway as any,
      conversationService as any,
      inboundAck as any,
      logger as any
    );
    const runtimeResolver = {
      resolve: (agent: { runtime?: string; managedRuntime?: unknown } | null) =>
        agent?.runtime === 'managed' && agent.managedRuntime ? managedRuntime : bridgeRuntime,
    };
    const analyticsService = {
      track: sinon.stub(),
    };
    const attachmentStorage = {
      storeInbound: sinon.stub().resolves(overrides.storedAttachments ?? []),
    };
    const linkTelegramChatToSubscriber = {
      execute:
        overrides.linkTelegramExecute ??
        sinon.stub().resolves({ created: true, subscriberId: 'sub-1', agentIdentifier: 'support-agent' }),
    };
    const startCodeService = {
      consumeIfMatches: overrides.startCodeConsume ?? sinon.stub().resolves({ status: 'missing' }),
    };
    const channelEndpointRepository = {
      findByPlatformIdentity: overrides.findTelegramEndpointByIdentity ?? sinon.stub().resolves(null),
    };
    const connectClaimTokenService = {
      issue: sinon.stub().resolves({ token: 'claim-token', expiresAt: new Date().toISOString() }),
      issueOrGetForEnvironment: sinon.stub().resolves({ token: 'claim-token', expiresAt: new Date().toISOString() }),
      isSignupCtaPosted: sinon.stub().resolves(false),
      tryMarkSignupCtaPosted: sinon.stub().resolves(true),
    };
    const keylessAbuseGuard = {
      isKeylessAgentAiEnabled: sinon.stub().resolves(true),
      assertKeylessAiEnabled: sinon.stub().resolves(),
      assertManagedAgentCap: sinon.stub().resolves(),
    };
    const planLimitGate = {
      maybeBlock: sinon.stub().resolves(false),
      maybeBlockConversation: sinon.stub().resolves(false),
    };
    const conversationActivation = {
      registerEngagement: sinon.stub().resolves(false),
    };
    const handler = new AgentInboundHandler(
      logger as any,
      subscriberResolver as any,
      conversationService as any,
      runtimeResolver as any,
      inboundDispatcher as any,
      outboundGateway as any,
      agentRepository as any,
      subscriberRepository as any,
      analyticsService as any,
      attachmentStorage as any,
      startCodeService as any,
      channelEndpointRepository as any,
      linkTelegramChatToSubscriber as any,
      connectClaimTokenService as any,
      keylessAbuseGuard as any,
      planLimitGate as any,
      inboundAck as any,
      conversationActivation as any
    );

    return {
      handler,
      attachmentStorage,
      bridgeExecutor,
      conversationService,
      linkTelegramChatToSubscriber,
      subscriberResolver,
      startCodeService,
      channelEndpointRepository,
      managedAgentService,
      agentRepository,
      subscriberRepository,
      outboundGateway,
      inboundAck,
    };
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

  function makeEmailDmThread() {
    return {
      id: 'email:thread1:',
      channelId: 'email:thread1',
      isDM: true,
      toJSON: () => ({ id: 'email:thread1:', channelId: 'email:thread1', isDM: true }),
      startTyping: sinon.stub().resolves(undefined),
      post: sinon.stub().resolves({ id: 'email-reply-1', threadId: 'email:thread1:' }),
    };
  }

  function makeEmailDmMessage(senderEmail: string) {
    return {
      id: 'email-msg-1',
      threadId: 'email:thread1:',
      text: 'hello',
      author: {
        userId: senderEmail,
        fullName: 'Unknown Sender',
        userName: senderEmail,
        isBot: false,
      },
      raw: {},
      attachments: [],
    };
  }

  function makeManagedAgentStub() {
    return {
      _id: 'agent1',
      runtime: 'managed',
      managedRuntime: { providerId: 'anthropic', _integrationId: 'int1', externalAgentId: 'ext1' },
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

    it('should store and forward inbound WhatsApp attachments', async () => {
      const storedAttachments = [
        {
          type: 'image',
          name: 'photo.jpg',
          mimeType: 'image/jpeg',
          size: 1234,
          storageKey: 'org1/env1/agents/conversation1/whatsapp-msg/0-photo.jpg',
          url: 'https://signed/read',
        },
      ];
      const { handler, attachmentStorage, bridgeExecutor, conversationService } = makeHandler({ storedAttachments });
      const whatsappConfig = {
        ...config,
        platform: 'whatsapp',
        integrationIdentifier: 'whatsapp-main',
      };
      const thread = {
        id: 'whatsapp:15551234567',
        channelId: 'whatsapp:15551234567',
        isDM: true,
        toJSON: () => ({ id: 'whatsapp:15551234567' }),
        startTyping: sinon.stub().resolves(undefined),
      };
      const message = {
        id: 'whatsapp-msg',
        text: 'photo',
        author: {
          userId: '15557654321',
          fullName: 'User One',
          userName: 'userone',
          isBot: false,
        },
        attachments: [
          {
            type: 'image',
            name: 'photo.jpg',
            mimeType: 'image/jpeg',
            size: 1234,
          },
        ],
      };

      await handler.handle('agent1', whatsappConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(attachmentStorage.storeInbound.calledOnceWith(message.attachments)).to.equal(true);
      expect(attachmentStorage.storeInbound.firstCall.args[1].platform).to.equal('whatsapp');
      expect(conversationService.persistInboundMessage.firstCall.args[0].richContent).to.deep.equal({
        attachments: [
          {
            type: 'image',
            name: 'photo.jpg',
            mimeType: 'image/jpeg',
            size: 1234,
            storageKey: 'org1/env1/agents/conversation1/whatsapp-msg/0-photo.jpg',
          },
        ],
      });
      expect(bridgeExecutor.execute.firstCall.args[0].storedAttachments).to.deep.equal(storedAttachments);
    });

    it('should reply with no-access message for managed agents when subscriber is unresolved', async () => {
      const { handler, managedAgentService, outboundGateway } = makeHandler({
        subscriberResolve: sinon.stub().resolves(null),
        subscriberFindById: sinon.stub().resolves(null),
        agentFindOne: sinon.stub().resolves(makeManagedAgentStub()),
      });
      const thread = makeSlackDmThread();
      const message = makeSlackDmMessage();

      await handler.handle('agent1', config as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(managedAgentService.dispatch.called).to.equal(false);
      expect(outboundGateway.replyOnThread.calledOnce).to.equal(true);
      expect(outboundGateway.replyOnThread.firstCall.args[1]).to.deep.equal({
        markdown: UNRESOLVED_SUBSCRIBER_ACCESS_REPLY,
      });
    });

    it('should reply with email-specific no-access message when sender email is unknown', async () => {
      const emailConfig = {
        ...config,
        platform: AgentPlatformEnum.EMAIL,
        integrationIdentifier: 'email-main',
      };
      const senderEmail = 'unknown@example.com';
      const { handler, managedAgentService, outboundGateway } = makeHandler({
        subscriberResolve: sinon.stub().resolves(null),
        subscriberFindById: sinon.stub().resolves(null),
        agentFindOne: sinon.stub().resolves(makeManagedAgentStub()),
      });
      const thread = makeEmailDmThread();
      const message = makeEmailDmMessage(senderEmail);

      await handler.handle('agent1', emailConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(managedAgentService.dispatch.called).to.equal(false);
      expect(outboundGateway.replyOnThread.calledOnce).to.equal(true);
      expect(outboundGateway.replyOnThread.firstCall.args[1].markdown).to.include(senderEmail);
      expect(outboundGateway.replyOnThread.firstCall.args[1].markdown).to.include('Novu account');
    });

    it('should dispatch keyless managed agent even when subscriber is unresolved (email)', async () => {
      const emailConfig = {
        ...config,
        platform: AgentPlatformEnum.EMAIL,
        integrationIdentifier: 'email-main',
        isKeyless: true,
        isManaged: true,
      };
      const senderEmail = 'tester@example.com';
      const { handler, managedAgentService, outboundGateway } = makeHandler({
        subscriberResolve: sinon.stub().resolves(null),
        subscriberFindById: sinon.stub().resolves(null),
        agentFindOne: sinon.stub().resolves(makeManagedAgentStub()),
      });
      const thread = makeEmailDmThread();
      const message = makeEmailDmMessage(senderEmail);

      await handler.handle('agent1', emailConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(outboundGateway.replyOnThread.called).to.equal(false);
      expect(managedAgentService.dispatch.calledOnce).to.equal(true);
    });

    it('should still gate keyless managed agents on non-email platforms when subscriber is unresolved', async () => {
      const keylessSlackConfig = {
        ...config,
        platform: AgentPlatformEnum.SLACK,
        isKeyless: true,
        isManaged: true,
      };
      const { handler, managedAgentService, outboundGateway } = makeHandler({
        subscriberResolve: sinon.stub().resolves(null),
        subscriberFindById: sinon.stub().resolves(null),
        agentFindOne: sinon.stub().resolves(makeManagedAgentStub()),
      });
      const thread = makeSlackDmThread();
      const message = makeSlackDmMessage();

      await handler.handle(
        'agent1',
        keylessSlackConfig as any,
        thread as any,
        message as any,
        AgentEventEnum.ON_MESSAGE
      );

      expect(managedAgentService.dispatch.called).to.equal(false);
      expect(outboundGateway.replyOnThread.calledOnce).to.equal(true);
      expect(outboundGateway.replyOnThread.firstCall.args[1]).to.deep.equal({
        markdown: UNRESOLVED_SUBSCRIBER_ACCESS_REPLY,
      });
    });
  });

  describe('Telegram /start subscriber-link handling', () => {
    const telegramConfig = {
      environmentId: 'env1',
      organizationId: 'org1',
      platform: AgentPlatformEnum.TELEGRAM,
      integrationIdentifier: 'telegram-main',
      integrationId: 'integration1',
      agentIdentifier: 'support-agent',
      acknowledgeOnReceived: false,
    };

    const matchingStartPayload = {
      _environmentId: 'env1',
      _organizationId: 'org1',
      agentIdentifier: 'support-agent',
      _integrationId: 'integration1',
      subscriberId: 'ext-sub-1',
    };

    function makeTelegramThread() {
      const post = sinon.stub().resolves({ id: 'reply-1', threadId: 'telegram:42' });

      return {
        id: 'telegram:42',
        channelId: '42',
        isDM: true,
        toJSON: () => ({ id: 'telegram:42', channelId: '42', isDM: true }),
        startTyping: sinon.stub().resolves(undefined),
        post,
      };
    }

    function makeStartMessage(text: string) {
      return {
        id: 'msg-1',
        threadId: 'telegram:42',
        text,
        author: { userId: '42', fullName: 'TG User', userName: 'tguser', isBot: false },
        raw: { message: { chat: { id: 42 } } },
        attachments: [],
      };
    }

    it('atomically consumes start code and links subscriber on matching scope, skipping bridge', async () => {
      const linkTelegramExecute = sinon
        .stub()
        .resolves({ created: true, subscriberId: 'ext-sub-1', agentIdentifier: 'support-agent' });
      const startCodeConsume = sinon.stub().resolves({ status: 'consumed', payload: matchingStartPayload });
      const { handler, bridgeExecutor, linkTelegramChatToSubscriber, conversationService, startCodeService } =
        makeHandler({
          linkTelegramExecute,
          startCodeConsume,
        });
      const thread = makeTelegramThread();
      const message = makeStartMessage('/start AbCdEfGhIjKlMnOpQrStUvWxYz012345');

      await handler.handle('agent1', telegramConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(startCodeService.consumeIfMatches.calledOnce).to.equal(true);
      const scope = startCodeService.consumeIfMatches.firstCall.args[1];
      expect(scope).to.deep.equal({
        environmentId: 'env1',
        organizationId: 'org1',
        integrationId: 'integration1',
        agentIdentifier: 'support-agent',
      });
      expect(linkTelegramChatToSubscriber.execute.calledOnce).to.equal(true);
      const cmd = linkTelegramChatToSubscriber.execute.firstCall.args[0];
      expect(cmd.environmentId).to.equal('env1');
      expect(cmd.subscriberId).to.equal('ext-sub-1');
      expect(cmd.chatId).to.equal('42');
      expect(thread.post.calledOnce).to.equal(true);
      expect(bridgeExecutor.execute.called).to.equal(false);
      expect(conversationService.createOrGetConversation.called).to.equal(false);
    });

    it('replies with the duplicate message when the chat was already linked', async () => {
      const linkTelegramExecute = sinon
        .stub()
        .resolves({ created: false, subscriberId: 'sub-1', agentIdentifier: 'support-agent' });
      const { handler, bridgeExecutor } = makeHandler({
        linkTelegramExecute,
        startCodeConsume: sinon.stub().resolves({ status: 'consumed', payload: matchingStartPayload }),
      });
      const thread = makeTelegramThread();
      const message = makeStartMessage('/start validcode');

      await handler.handle('agent1', telegramConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(thread.post.calledOnce).to.equal(true);
      expect(thread.post.firstCall.args[0]).to.match(/already connected/i);
      expect(bridgeExecutor.execute.called).to.equal(false);
    });

    it('replies with wrong-bot message when start code targets a different integration', async () => {
      const { handler, bridgeExecutor, linkTelegramChatToSubscriber } = makeHandler({
        startCodeConsume: sinon.stub().resolves({
          status: 'mismatch',
          payload: { ...matchingStartPayload, _integrationId: 'other-integration' },
        }),
      });
      const thread = makeTelegramThread();
      const message = makeStartMessage('/start validcode');

      await handler.handle('agent1', telegramConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(linkTelegramChatToSubscriber.execute.called).to.equal(false);
      expect(thread.post.firstCall.args[0]).to.match(/issued for this bot/i);
      expect(bridgeExecutor.execute.called).to.equal(false);
    });

    it('replies with expired message when code is missing and chat has no endpoint', async () => {
      const { handler, bridgeExecutor } = makeHandler({
        findTelegramEndpointByIdentity: sinon.stub().resolves(null),
      });
      const thread = makeTelegramThread();
      const message = makeStartMessage('/start unknowncode');

      await handler.handle('agent1', telegramConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(thread.post.firstCall.args[0]).to.match(/expired/i);
      expect(bridgeExecutor.execute.called).to.equal(false);
    });

    it('replies already connected when code is consumed but chat endpoint still exists', async () => {
      const { handler, bridgeExecutor } = makeHandler({
        startCodeConsume: sinon.stub().resolves({ status: 'missing' }),
        findTelegramEndpointByIdentity: sinon.stub().resolves({ subscriberId: 'sub-1' }),
      });
      const thread = makeTelegramThread();
      const message = makeStartMessage('/start reused');

      await handler.handle('agent1', telegramConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(thread.post.firstCall.args[0]).to.match(/already connected/i);
      expect(bridgeExecutor.execute.called).to.equal(false);
    });

    it('falls through to normal inbound processing for plain Telegram messages (no /start)', async () => {
      const { handler, bridgeExecutor, linkTelegramChatToSubscriber, conversationService } = makeHandler();
      const thread = makeTelegramThread();
      const message = makeStartMessage('hi there');

      await handler.handle('agent1', telegramConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(linkTelegramChatToSubscriber.execute.called).to.equal(false);
      expect(conversationService.createOrGetConversation.calledOnce).to.equal(true);
      expect(bridgeExecutor.execute.calledOnce).to.equal(true);
    });

    it('falls through to normal inbound processing for /start with no payload (bare command)', async () => {
      const { handler, linkTelegramChatToSubscriber, conversationService } = makeHandler();
      const thread = makeTelegramThread();
      const message = makeStartMessage('/start');

      await handler.handle('agent1', telegramConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(linkTelegramChatToSubscriber.execute.called).to.equal(false);
      expect(conversationService.createOrGetConversation.calledOnce).to.equal(true);
    });
  });

  function makeActionThread() {
    return {
      id: 'thread1',
      channelId: 'channel1',
      isDM: false,
    };
  }

  describe('handleAction', () => {
    it('should skip bridge dispatch for link-button actions', async () => {
      const { handler, bridgeExecutor } = makeHandler();
      const thread = makeActionThread();
      const action = { id: 'link-https://access.stripe.com/mcp/oauth2/authorize', value: undefined };

      await handler.handleAction('agent1', config as any, thread as any, action as any, 'user1');

      expect(bridgeExecutor.execute.called).to.equal(false);
    });

    it('should skip bridge dispatch for managed agents on non-link actions', async () => {
      const { handler, bridgeExecutor } = makeHandler({
        agentFindOne: sinon.stub().resolves({
          _id: 'agent1',
          runtime: 'managed',
          managedRuntime: { providerId: 'anthropic', _integrationId: 'int1', externalAgentId: 'ext1' },
        }),
      });
      const thread = makeActionThread();
      const action = { id: 'custom-action', value: 'yes' };

      await handler.handleAction('agent1', config as any, thread as any, action as any, 'user1');

      expect(bridgeExecutor.execute.called).to.equal(false);
    });

    it('should forward self-hosted agent actions to the bridge', async () => {
      const { handler, bridgeExecutor } = makeHandler();
      const thread = makeActionThread();
      const action = { id: 'ack', value: undefined };

      await handler.handleAction('agent1', config as any, thread as any, action as any, 'user1');

      expect(bridgeExecutor.execute.calledOnce).to.equal(true);
      expect(bridgeExecutor.execute.firstCall.args[0].event).to.equal(AgentEventEnum.ON_ACTION);
      expect(bridgeExecutor.execute.firstCall.args[0].action).to.deep.equal(action);
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

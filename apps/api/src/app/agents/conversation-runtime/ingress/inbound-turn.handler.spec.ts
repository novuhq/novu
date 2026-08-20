import { HITL_APPROVE_WORKFLOW_ID, HITL_ASK_WORKFLOW_ID } from '@novu/framework';
import { AgentSubscriberAccessEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ManagedRuntime } from '../../managed-runtime/managed.runtime';
import { AgentEventEnum } from '../../shared/enums/agent-event.enum';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import {
  UNRESOLVED_SUBSCRIBER_ACCESS_REPLY,
  UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY,
} from '../../shared/util/agent-inbound-replies';
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
    agentId: 'agent1',
    agentIdentifier: 'support-agent',
    acknowledgeOnReceived: false,
    // Default happy-path bridge tests use open access so unresolved senders still dispatch.
    subscriberAccess: AgentSubscriberAccessEnum.OPEN,
  };

  const conversation = {
    _id: 'conversation1',
    channels: [{ platformThreadId: 'thread1', platform: 'slack', _integrationId: 'integration1' }],
    participants: [{ type: 'subscriber', id: 'sub1' }],
  };

  afterEach(() => {
    delete (conversation as { _notificationId?: string })._notificationId;
    delete (conversation.channels[0] as { firstPlatformMessageId?: string }).firstPlatformMessageId;
  });

  function makeLogger() {
    return {
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
      setContext: sinon.stub(),
    };
  }

  function makeResolvedSubscriberOverrides(subscriberId = 'sub1', internalSubscriberId = 'subscriber-mongo-1') {
    return {
      subscriberResolve: sinon.stub().resolves(subscriberId),
      subscriberResolveOrProvision: sinon.stub().resolves({ outcome: 'resolved', subscriberId }),
      subscriberFindById: sinon.stub().resolves({ _id: internalSubscriberId, subscriberId }),
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
      subscriberResolveOrProvision?: sinon.SinonStub;
    } = {}
  ) {
    const logger = makeLogger();
    // Legacy overrides stub the resolver with `subscriberId | null` (or a rejection);
    // adapt them to the discriminated `SubscriberResolution` contract.
    const legacySubscriberResolve = overrides.subscriberResolve;
    const toResolution = async (...args: unknown[]) => {
      const subscriberId = await legacySubscriberResolve?.(...args);

      return subscriberId ? { outcome: 'resolved', subscriberId } : { outcome: 'not_found' };
    };
    const subscriberResolver = {
      resolveSubscriber: legacySubscriberResolve
        ? sinon.stub().callsFake(toResolution)
        : sinon.stub().resolves({ outcome: 'not_found' }),
      resolveOrProvision:
        overrides.subscriberResolveOrProvision ??
        (legacySubscriberResolve
          ? sinon.stub().callsFake(toResolution)
          : sinon.stub().resolves({
              outcome: 'resolved',
              subscriberId: `sub_${Math.random().toString(36).slice(2, 14)}`,
            })),
    };
    const conversationService = {
      createOrGetConversation: sinon.stub().resolves(conversation),
      getPrimaryChannel: sinon.stub().callsFake((conv) => conv.channels[0]),
      persistInboundMessage: sinon.stub().resolves({ _id: 'activity1' }),
      persistAgentMessage: sinon.stub().resolves({ activity: { _id: 'agent-activity1' }, created: true }),
      persistWorkflowOriginHydration: sinon.stub().resolves(undefined),
      setFirstPlatformMessageId: sinon.stub().resolves(undefined),
      findByPlatformThread: sinon.stub().resolves(conversation),
      getHistory: sinon.stub().resolves(overrides.history ?? []),
      persistToolApprovalDecision: sinon.stub().resolves({ _id: 'decision-1' }),
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
    const agentIntegrationRepository = {
      updateOne: sinon.stub().resolves({ matched: 1, modified: 0 }),
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
    const expireSupersededApprovals = {
      expireOnNewMessage: sinon.stub().resolves(undefined),
    };
    const bridgeRuntime = new BridgeRuntime(
      bridgeExecutor as any,
      outboundGateway as any,
      conversationService as any,
      environmentRepository as any,
      expireSupersededApprovals as any,
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
        sinon.stub().resolves({
          created: true,
          subscriberId: 'sub-1',
          linkScope: { mode: 'agent', agentIdentifier: 'support-agent' },
        }),
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
    const connectionContextResolver = {
      resolve: sinon.stub().resolves({ context: null }),
    };
    const replyApprovalInterceptor = {
      tryHandleAsApprovalReply: sinon.stub().resolves(false),
      tryHandleAsApprovalReaction: sinon.stub().resolves(false),
    };
    const workflowOriginService = {
      resolve: sinon.stub().resolves(null),
      hydrate: sinon.stub().resolves(null),
    };
    const resumeWait = { execute: sinon.stub().resolves({ resumed: true }) };
    const handler = new AgentInboundHandler(
      logger as any,
      subscriberResolver as any,
      conversationService as any,
      runtimeResolver as any,
      inboundDispatcher as any,
      outboundGateway as any,
      agentRepository as any,
      agentIntegrationRepository as any,
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
      connectionContextResolver as any,
      replyApprovalInterceptor as any,
      workflowOriginService as any,
      resumeWait as any
    );

    return {
      handler,
      logger,
      replyApprovalInterceptor,
      attachmentStorage,
      bridgeExecutor,
      conversationService,
      workflowOriginService,
      resumeWait,
      linkTelegramChatToSubscriber,
      subscriberResolver,
      startCodeService,
      channelEndpointRepository,
      managedAgentService,
      agentRepository,
      agentIntegrationRepository,
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

  function makeEmailDmMessage(senderEmail: string, auth: { dkim?: string; spf?: string } = {}) {
    // Default to a DKIM/SPF-verified sender so existing cases model a legitimate
    // (non-spoofed) email; pass `{ dkim: 'failed' }` / `{ spf: 'failed' }` to
    // simulate a spoofed `From`.
    const { dkim = 'pass', spf = 'pass' } = auth;

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
      raw: { dkim, spf },
      attachments: [],
    };
  }

  function makeWhatsAppDmThread() {
    return {
      id: 'whatsapp:15551234567',
      channelId: 'whatsapp:15551234567',
      isDM: true,
      toJSON: () => ({ id: 'whatsapp:15551234567', channelId: 'whatsapp:15551234567', isDM: true }),
      startTyping: sinon.stub().resolves(undefined),
      post: sinon.stub().resolves({ id: 'whatsapp-reply-1', threadId: 'whatsapp:15551234567' }),
    };
  }

  function makeWhatsAppDmMessage(senderPhone: string) {
    return {
      id: 'whatsapp-msg-1',
      threadId: 'whatsapp:15551234567',
      text: 'hello',
      author: {
        userId: senderPhone,
        fullName: 'WhatsApp Sender',
        userName: senderPhone,
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
    it('should resume a parked ask Wait job from an inbound reply and skip agent dispatch', async () => {
      const { handler, workflowOriginService, resumeWait, bridgeExecutor } = makeHandler(
        makeResolvedSubscriberOverrides()
      );
      const origin = {
        _id: 'msg1',
        _notificationId: 'notif1',
        transactionId: 'txn-ask-1',
        templateIdentifier: HITL_ASK_WORKFLOW_ID,
      };
      workflowOriginService.resolve.resolves({ origin, notificationId: 'notif1' });
      const message = { ...makeSlackDmMessage(), text: '  staging  ' };

      await handler.handle(
        'agent1',
        config as any,
        makeSlackDmThread() as any,
        message as any,
        AgentEventEnum.ON_MESSAGE
      );

      expect(resumeWait.execute.calledOnce).to.equal(true);
      expect(resumeWait.execute.firstCall.args[0]).to.include({
        transactionId: 'txn-ask-1',
        organizationId: config.organizationId,
        environmentId: config.environmentId,
      });
      expect(resumeWait.execute.firstCall.args[0].data).to.deep.include({
        verdict: 'answer',
        value: 'staging',
        respondedBy: 'sub1',
      });
      expect(bridgeExecutor.execute.called).to.equal(false);
    });

    it('should not resume a Wait job from an inbound reply when the origin is not ask', async () => {
      const { handler, workflowOriginService, resumeWait, bridgeExecutor } = makeHandler(
        makeResolvedSubscriberOverrides()
      );
      workflowOriginService.resolve.resolves({
        origin: {
          _id: 'msg1',
          transactionId: 'txn-approve-1',
          templateIdentifier: HITL_APPROVE_WORKFLOW_ID,
        },
        notificationId: 'notif1',
      });

      await handler.handle(
        'agent1',
        config as any,
        makeSlackDmThread() as any,
        makeSlackDmMessage() as any,
        AgentEventEnum.ON_MESSAGE
      );

      expect(resumeWait.execute.called).to.equal(false);
      expect(bridgeExecutor.execute.calledOnce).to.equal(true);
    });

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

    it('should resolve and hydrate workflow origin through WorkflowOriginService on first reply', async () => {
      const { handler, conversationService, workflowOriginService } = makeHandler(makeResolvedSubscriberOverrides());
      const origin = {
        _id: 'msg1',
        _notificationId: 'notif1',
        identifier: 'D123:1777837477.371619',
      };

      conversationService.findByPlatformThread.resolves(null);
      workflowOriginService.resolve.resolves({ origin, notificationId: 'notif1' });

      const thread = makeSlackDmThread();
      const message = {
        ...makeSlackDmMessage(),
        id: '1777837480.1',
        raw: { thread_ts: '1777837477.371619' },
      };

      await handler.handle('agent1', config as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(workflowOriginService.resolve.calledOnce).to.equal(true);
      expect(workflowOriginService.resolve.firstCall.args[0]).to.include({
        agentId: 'agent1',
        platformThreadId: 'slack:D123:1777837477.371619',
        subscriberId: 'sub1',
        existingConversation: null,
      });
      expect(conversationService.createOrGetConversation.firstCall.args[0].notificationId).to.equal('notif1');
      expect(workflowOriginService.hydrate.calledOnce).to.equal(true);
      expect(workflowOriginService.hydrate.firstCall.args[0].origin).to.equal(origin);
    });

    it('should forward the hydrated origin to a managed dispatch on an existing Telegram conversation', async () => {
      // A live managed session only receives the new turn, so a mid-conversation
      // hydration write is invisible unless it rides along on the dispatch.
      const telegramConfig = {
        ...config,
        platform: AgentPlatformEnum.TELEGRAM,
        integrationIdentifier: 'telegram-main',
        isManaged: true,
        subscriberAccess: AgentSubscriberAccessEnum.OPEN,
      };
      const { handler, conversationService, workflowOriginService, managedAgentService } = makeHandler({
        ...makeResolvedSubscriberOverrides('sub-tg', 'sub-mongo'),
        agentFindOne: sinon.stub().resolves(makeManagedAgentStub()),
      });

      conversationService.findByPlatformThread.resolves({
        _id: 'conv1',
        externalSessionId: 'ses_live',
        channels: [{ platform: AgentPlatformEnum.TELEGRAM, _integrationId: 'int1', platformThreadId: 'telegram:42' }],
        participants: [],
      });
      workflowOriginService.resolve.resolves({ origin: { _id: 'msg1', _notificationId: 'notif1', identifier: '42' } });
      workflowOriginService.hydrate.resolves('Your order shipped');

      const thread = {
        id: 'telegram:42',
        channelId: '42',
        isDM: true,
        toJSON: () => ({ id: 'telegram:42', channelId: '42', isDM: true }),
        startTyping: sinon.stub().resolves(undefined),
        post: sinon.stub().resolves({ id: 'reply-1', threadId: 'telegram:42' }),
      };
      const message = {
        id: 'msg-2',
        threadId: 'telegram:42',
        text: 'where is it?',
        author: { userId: '42', fullName: 'TG User', userName: 'tguser', isBot: false },
        raw: {},
        attachments: [],
      };

      await handler.handle('agent1', telegramConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(managedAgentService.dispatch.calledOnce).to.equal(true);
      expect(managedAgentService.dispatch.firstCall.args[0].workflowOriginContent).to.equal('Your order shipped');
    });

    it('should leave workflowOriginContent unset when nothing was hydrated', async () => {
      const telegramConfig = {
        ...config,
        platform: AgentPlatformEnum.TELEGRAM,
        integrationIdentifier: 'telegram-main',
        isManaged: true,
        subscriberAccess: AgentSubscriberAccessEnum.OPEN,
      };
      const { handler, conversationService, workflowOriginService, managedAgentService } = makeHandler({
        ...makeResolvedSubscriberOverrides('sub-tg', 'sub-mongo'),
        agentFindOne: sinon.stub().resolves(makeManagedAgentStub()),
      });

      conversationService.findByPlatformThread.resolves(null);
      workflowOriginService.resolve.resolves(null);

      const thread = {
        id: 'telegram:42',
        channelId: '42',
        isDM: true,
        toJSON: () => ({ id: 'telegram:42', channelId: '42', isDM: true }),
        startTyping: sinon.stub().resolves(undefined),
        post: sinon.stub().resolves({ id: 'reply-1', threadId: 'telegram:42' }),
      };
      const message = {
        id: 'msg-2',
        threadId: 'telegram:42',
        text: 'hello',
        author: { userId: '42', fullName: 'TG User', userName: 'tguser', isBot: false },
        raw: {},
        attachments: [],
      };

      await handler.handle('agent1', telegramConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(managedAgentService.dispatch.calledOnce).to.equal(true);
      expect(managedAgentService.dispatch.firstCall.args[0].workflowOriginContent).to.equal(undefined);
    });

    it('should not hydrate when WorkflowOriginService.resolve returns null', async () => {
      const { handler, conversationService, workflowOriginService } = makeHandler(makeResolvedSubscriberOverrides());

      conversationService.findByPlatformThread.resolves(null);
      workflowOriginService.resolve.resolves(null);

      await handler.handle(
        'agent1',
        config as any,
        makeSlackDmThread() as any,
        makeSlackDmMessage() as any,
        AgentEventEnum.ON_MESSAGE
      );

      expect(workflowOriginService.resolve.calledOnce).to.equal(true);
      expect(workflowOriginService.hydrate.called).to.equal(false);
      expect(conversationService.createOrGetConversation.firstCall.args[0].notificationId).to.equal(undefined);
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
      const restrictedConfig = {
        ...config,
        isManaged: true,
        subscriberAccess: AgentSubscriberAccessEnum.RESTRICTED,
      };
      const { handler, managedAgentService, outboundGateway } = makeHandler({
        subscriberResolve: sinon.stub().resolves(null),
        subscriberFindById: sinon.stub().resolves(null),
        agentFindOne: sinon.stub().resolves(makeManagedAgentStub()),
      });
      const thread = makeSlackDmThread();
      const message = makeSlackDmMessage();

      await handler.handle('agent1', restrictedConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(managedAgentService.dispatch.called).to.equal(false);
      expect(outboundGateway.replyOnThread.calledOnce).to.equal(true);
      expect(outboundGateway.replyOnThread.firstCall.args[1]).to.deep.equal({
        markdown: UNRESOLVED_SUBSCRIBER_ACCESS_REPLY,
      });
    });

    it('should still reply for custom-code restricted agents when subscriber resolution errors', async () => {
      const restrictedConfig = {
        ...config,
        isManaged: false,
        subscriberAccess: AgentSubscriberAccessEnum.RESTRICTED,
      };
      const { handler, bridgeExecutor, outboundGateway, inboundAck } = makeHandler({
        subscriberResolve: sinon.stub().rejects(new Error('mongo timeout')),
        subscriberFindById: sinon.stub().resolves(null),
        agentFindOne: sinon.stub().resolves({ _id: 'agent1', runtime: 'bridge' }),
      });
      const thread = makeSlackDmThread();
      const message = makeSlackDmMessage();

      await handler.handle('agent1', restrictedConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      // Transient failures are not the unlinked-sender case — keep the plain reply and never dispatch.
      expect(bridgeExecutor.execute.called).to.equal(false);
      expect(inboundAck.showWorkingSignal.called).to.equal(false);
      expect(outboundGateway.replyOnThread.calledOnce).to.equal(true);
      expect(outboundGateway.replyOnThread.firstCall.args[1]).to.deep.equal({
        markdown: UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY,
      });
    });

    it('should dispatch custom-code open agents with a null subscriber when the sender is unknown', async () => {
      const openConfig = {
        ...config,
        isManaged: false,
        subscriberAccess: AgentSubscriberAccessEnum.OPEN,
      };
      const resolveOrProvision = sinon.stub().resolves({ outcome: 'resolved', subscriberId: 'should-not-provision' });
      const { handler, bridgeExecutor, outboundGateway, subscriberResolver, inboundAck } = makeHandler({
        subscriberResolve: sinon.stub().resolves(null),
        subscriberResolveOrProvision: resolveOrProvision,
        subscriberFindById: sinon.stub().resolves(null),
        agentFindOne: sinon.stub().resolves({ _id: 'agent1', runtime: 'bridge' }),
      });
      const thread = makeSlackDmThread();
      const message = makeSlackDmMessage();

      await handler.handle('agent1', openConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(resolveOrProvision.called).to.equal(false);
      expect(subscriberResolver.resolveSubscriber.calledOnce).to.equal(true);
      expect(outboundGateway.replyOnThread.called).to.equal(false);
      expect(inboundAck.showWorkingSignal.calledOnce).to.equal(true);
      expect(bridgeExecutor.execute.calledOnce).to.equal(true);
      expect(bridgeExecutor.execute.firstCall.args[0].subscriber).to.equal(null);
    });

    it('should reply with email-specific no-access message when sender email is unknown', async () => {
      const emailConfig = {
        ...config,
        platform: AgentPlatformEnum.EMAIL,
        integrationIdentifier: 'email-main',
        isManaged: true,
        subscriberAccess: AgentSubscriberAccessEnum.RESTRICTED,
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
      expect(outboundGateway.replyOnThread.firstCall.args[1].markdown).to.include('known user');
    });

    it('should reply with transient copy and log a structured warn when subscriber resolution errors (email)', async () => {
      const emailConfig = {
        ...config,
        platform: AgentPlatformEnum.EMAIL,
        integrationIdentifier: 'email-main',
      };
      const senderEmail = 'known@example.com';
      const { handler, logger, managedAgentService, outboundGateway } = makeHandler({
        subscriberResolve: sinon.stub().rejects(new Error('mongo timeout')),
        subscriberFindById: sinon.stub().resolves(null),
        agentFindOne: sinon.stub().resolves(makeManagedAgentStub()),
      });
      const thread = makeEmailDmThread();
      const message = makeEmailDmMessage(senderEmail);

      await handler.handle('agent1', emailConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(managedAgentService.dispatch.called).to.equal(false);
      expect(outboundGateway.replyOnThread.calledOnce).to.equal(true);
      // A broken lookup must not blame the sender's address.
      expect(outboundGateway.replyOnThread.firstCall.args[1].markdown).to.equal(UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY);
      expect(outboundGateway.replyOnThread.firstCall.args[1].markdown).to.not.include(senderEmail);

      const gateWarn = logger.warn
        .getCalls()
        .find((call) => typeof call.args[0] === 'object' && call.args[0]?.resolutionOutcome);
      if (!gateWarn) {
        expect.fail('expected a structured unresolved-subscriber warn');
      }
      expect(gateWarn.args[0]).to.include({
        environmentId: 'env1',
        organizationId: 'org1',
        platform: AgentPlatformEnum.EMAIL,
        senderPlatformUserId: senderEmail,
        resolutionOutcome: 'error',
      });
    });

    it('should reclassify a resolved id whose subscriber record cannot be loaded as a transient error', async () => {
      const emailConfig = {
        ...config,
        platform: AgentPlatformEnum.EMAIL,
        integrationIdentifier: 'email-main',
      };
      const { handler, managedAgentService, outboundGateway } = makeHandler({
        subscriberResolve: sinon.stub().resolves('ghost-subscriber'),
        subscriberFindById: sinon.stub().resolves(null),
        agentFindOne: sinon.stub().resolves(makeManagedAgentStub()),
      });
      const thread = makeEmailDmThread();
      const message = makeEmailDmMessage('known@example.com');

      await handler.handle('agent1', emailConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(managedAgentService.dispatch.called).to.equal(false);
      // Internal inconsistency, not a sender problem — must not blame the address.
      expect(outboundGateway.replyOnThread.calledOnce).to.equal(true);
      expect(outboundGateway.replyOnThread.firstCall.args[1].markdown).to.equal(UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY);
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
        subscriberAccess: AgentSubscriberAccessEnum.RESTRICTED,
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

    it('should route an open-access email agent through resolveOrProvision and dispatch', async () => {
      const emailConfig = {
        ...config,
        platform: AgentPlatformEnum.EMAIL,
        integrationIdentifier: 'email-main',
        isManaged: true,
        subscriberAccess: AgentSubscriberAccessEnum.OPEN,
      };
      const senderEmail = 'newcomer@example.com';
      const resolveOrProvision = sinon.stub().resolves({ outcome: 'resolved', subscriberId: 'sub-provisioned' });
      const { handler, managedAgentService, outboundGateway } = makeHandler({
        subscriberResolveOrProvision: resolveOrProvision,
        subscriberFindById: sinon.stub().resolves({ _id: 'sub-mongo', subscriberId: 'sub-provisioned' }),
        agentFindOne: sinon.stub().resolves(makeManagedAgentStub()),
      });
      const thread = makeEmailDmThread();
      const message = makeEmailDmMessage(senderEmail);

      await handler.handle('agent1', emailConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(resolveOrProvision.calledOnce).to.equal(true);
      expect(resolveOrProvision.firstCall.args[0]).to.include({
        platform: AgentPlatformEnum.EMAIL,
        platformUserId: senderEmail,
      });
      expect(outboundGateway.replyOnThread.called).to.equal(false);
      expect(managedAgentService.dispatch.calledOnce).to.equal(true);
    });

    it('should not auto-provision for a restricted email agent and keep the no-access gate', async () => {
      const emailConfig = {
        ...config,
        platform: AgentPlatformEnum.EMAIL,
        integrationIdentifier: 'email-main',
        isManaged: true,
        subscriberAccess: AgentSubscriberAccessEnum.RESTRICTED,
      };
      const senderEmail = 'stranger@example.com';
      const resolveOrProvision = sinon.stub().resolves({ outcome: 'resolved', subscriberId: 'sub-provisioned' });
      const { handler, managedAgentService, outboundGateway } = makeHandler({
        subscriberResolve: sinon.stub().resolves(null),
        subscriberResolveOrProvision: resolveOrProvision,
        subscriberFindById: sinon.stub().resolves(null),
        agentFindOne: sinon.stub().resolves(makeManagedAgentStub()),
      });
      const thread = makeEmailDmThread();
      const message = makeEmailDmMessage(senderEmail);

      await handler.handle('agent1', emailConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(resolveOrProvision.called).to.equal(false);
      expect(managedAgentService.dispatch.called).to.equal(false);
      expect(outboundGateway.replyOnThread.calledOnce).to.equal(true);
      expect(outboundGateway.replyOnThread.firstCall.args[1].markdown).to.include(senderEmail);
    });

    it('should not auto-provision for a keyless open-access email agent (demo path owns provisioning)', async () => {
      const emailConfig = {
        ...config,
        platform: AgentPlatformEnum.EMAIL,
        integrationIdentifier: 'email-main',
        isKeyless: true,
        isManaged: true,
        subscriberAccess: AgentSubscriberAccessEnum.OPEN,
      };
      const resolveOrProvision = sinon.stub().resolves({ outcome: 'resolved', subscriberId: 'sub-provisioned' });
      const { handler, managedAgentService } = makeHandler({
        subscriberResolve: sinon.stub().resolves(null),
        subscriberResolveOrProvision: resolveOrProvision,
        subscriberFindById: sinon.stub().resolves(null),
        agentFindOne: sinon.stub().resolves(makeManagedAgentStub()),
      });
      const thread = makeEmailDmThread();
      const message = makeEmailDmMessage('demo@example.com');

      await handler.handle('agent1', emailConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(resolveOrProvision.called).to.equal(false);
      // Keyless demo agents bypass the subscriber gate and still dispatch.
      expect(managedAgentService.dispatch.calledOnce).to.equal(true);
    });

    it('should not resolve or provision an identity for a spoofed (unverified) open-access email sender', async () => {
      const emailConfig = {
        ...config,
        platform: AgentPlatformEnum.EMAIL,
        integrationIdentifier: 'email-main',
        isManaged: true,
        subscriberAccess: AgentSubscriberAccessEnum.OPEN,
      };
      // On unpatched code the open-access path provisions/looks up the forged
      // address, handing the attacker a subscriber identity.
      const resolveOrProvision = sinon.stub().resolves({ outcome: 'resolved', subscriberId: 'sub-provisioned' });
      const resolveOnly = sinon.stub().resolves('victim-subscriber');
      const { handler, subscriberResolver, managedAgentService, outboundGateway } = makeHandler({
        subscriberResolve: resolveOnly,
        subscriberResolveOrProvision: resolveOrProvision,
        subscriberFindById: sinon.stub().resolves({ _id: 'victim-mongo', subscriberId: 'victim-subscriber' }),
        agentFindOne: sinon.stub().resolves(makeManagedAgentStub()),
      });
      const thread = makeEmailDmThread();
      // Attacker spoofs a real subscriber's address; DKIM/SPF failed upstream.
      const message = makeEmailDmMessage('victim@example.com', { dkim: 'failed', spf: 'failed' });

      await handler.handle('agent1', emailConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(subscriberResolver.resolveOrProvision.called).to.equal(false);
      expect(subscriberResolver.resolveSubscriber.called).to.equal(false);
      // No identity resolved → handler gate blocks dispatch with verification copy.
      expect(managedAgentService.dispatch.called).to.equal(false);
      expect(outboundGateway.replyOnThread.calledOnce).to.equal(true);
      expect(outboundGateway.replyOnThread.firstCall.args[1].markdown).to.include('DKIM/SPF');
      expect(outboundGateway.replyOnThread.firstCall.args[1].markdown).to.include('victim@example.com');
      expect(outboundGateway.replyOnThread.firstCall.args[1].markdown).to.not.include('known user');
    });

    it('should not map a spoofed (unverified) email onto an existing subscriber for a restricted agent', async () => {
      const emailConfig = {
        ...config,
        platform: AgentPlatformEnum.EMAIL,
        integrationIdentifier: 'email-main',
        isManaged: true,
        subscriberAccess: AgentSubscriberAccessEnum.RESTRICTED,
      };
      // On unpatched code this lookup returns the victim's subscriberId from the
      // forged `From`, letting the attacker act as the victim. A single failing
      // verdict (SPF passes, DKIM fails) must still be treated as unverified.
      const resolveOnly = sinon.stub().resolves('victim-subscriber');
      const { handler, subscriberResolver, subscriberRepository, managedAgentService, outboundGateway } = makeHandler({
        subscriberResolve: resolveOnly,
        subscriberFindById: sinon.stub().resolves({ _id: 'victim-mongo', subscriberId: 'victim-subscriber' }),
        agentFindOne: sinon.stub().resolves(makeManagedAgentStub()),
      });
      const thread = makeEmailDmThread();
      const message = makeEmailDmMessage('victim@example.com', { dkim: 'failed', spf: 'pass' });

      await handler.handle('agent1', emailConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(subscriberResolver.resolveSubscriber.called).to.equal(false);
      expect(subscriberRepository.findBySubscriberId.called).to.equal(false);
      expect(managedAgentService.dispatch.called).to.equal(false);
      expect(outboundGateway.replyOnThread.calledOnce).to.equal(true);
      expect(outboundGateway.replyOnThread.firstCall.args[1].markdown).to.include('DKIM/SPF');
      expect(outboundGateway.replyOnThread.firstCall.args[1].markdown).to.not.include('known user');
    });

    it('should resolve identity for a DKIM/SPF-verified restricted email sender', async () => {
      const emailConfig = {
        ...config,
        platform: AgentPlatformEnum.EMAIL,
        integrationIdentifier: 'email-main',
        isManaged: true,
        subscriberAccess: AgentSubscriberAccessEnum.RESTRICTED,
      };
      const resolveOnly = sinon.stub().resolves('known-subscriber');
      const { handler, subscriberResolver, managedAgentService, outboundGateway } = makeHandler({
        subscriberResolve: resolveOnly,
        subscriberFindById: sinon.stub().resolves({ _id: 'known-mongo', subscriberId: 'known-subscriber' }),
        agentFindOne: sinon.stub().resolves(makeManagedAgentStub()),
      });
      const thread = makeEmailDmThread();
      // Defaults to a verified (dkim/spf pass) sender.
      const message = makeEmailDmMessage('member@example.com');

      await handler.handle('agent1', emailConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(subscriberResolver.resolveSubscriber.calledOnce).to.equal(true);
      expect(managedAgentService.dispatch.calledOnce).to.equal(true);
      expect(outboundGateway.replyOnThread.called).to.equal(false);
    });

    it('should route an open-access WhatsApp agent through resolveOrProvision and dispatch', async () => {
      const whatsappConfig = {
        ...config,
        platform: AgentPlatformEnum.WHATSAPP,
        integrationIdentifier: 'whatsapp-main',
        isManaged: true,
        subscriberAccess: AgentSubscriberAccessEnum.OPEN,
      };
      const senderPhone = '+15551234567';
      const resolveOrProvision = sinon.stub().resolves({ outcome: 'resolved', subscriberId: 'sub-provisioned' });
      const { handler, managedAgentService, outboundGateway } = makeHandler({
        subscriberResolveOrProvision: resolveOrProvision,
        subscriberFindById: sinon.stub().resolves({ _id: 'sub-mongo', subscriberId: 'sub-provisioned' }),
        agentFindOne: sinon.stub().resolves(makeManagedAgentStub()),
      });
      const thread = makeWhatsAppDmThread();
      const message = makeWhatsAppDmMessage(senderPhone);

      await handler.handle('agent1', whatsappConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(resolveOrProvision.calledOnce).to.equal(true);
      expect(resolveOrProvision.firstCall.args[0]).to.include({
        platform: AgentPlatformEnum.WHATSAPP,
        platformUserId: senderPhone,
      });
      expect(outboundGateway.replyOnThread.called).to.equal(false);
      expect(managedAgentService.dispatch.calledOnce).to.equal(true);
    });

    it('should not auto-provision for a restricted WhatsApp agent and keep the no-access gate', async () => {
      const whatsappConfig = {
        ...config,
        platform: AgentPlatformEnum.WHATSAPP,
        integrationIdentifier: 'whatsapp-main',
        isManaged: true,
        subscriberAccess: AgentSubscriberAccessEnum.RESTRICTED,
      };
      const senderPhone = '+15559876543';
      const resolveOrProvision = sinon.stub().resolves({ outcome: 'resolved', subscriberId: 'sub-provisioned' });
      const { handler, managedAgentService, outboundGateway } = makeHandler({
        subscriberResolve: sinon.stub().resolves(null),
        subscriberResolveOrProvision: resolveOrProvision,
        subscriberFindById: sinon.stub().resolves(null),
        agentFindOne: sinon.stub().resolves(makeManagedAgentStub()),
      });
      const thread = makeWhatsAppDmThread();
      const message = makeWhatsAppDmMessage(senderPhone);

      await handler.handle('agent1', whatsappConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(resolveOrProvision.called).to.equal(false);
      expect(managedAgentService.dispatch.called).to.equal(false);
      expect(outboundGateway.replyOnThread.calledOnce).to.equal(true);
      expect(outboundGateway.replyOnThread.firstCall.args[1]).to.deep.equal({
        markdown: UNRESOLVED_SUBSCRIBER_ACCESS_REPLY,
      });
    });

    it('should not call resolveOrProvision for a restricted Slack agent', async () => {
      const slackConfig = {
        ...config,
        platform: AgentPlatformEnum.SLACK,
        isManaged: true,
        subscriberAccess: AgentSubscriberAccessEnum.RESTRICTED,
      };
      const resolveOrProvision = sinon.stub().resolves({ outcome: 'resolved', subscriberId: 'sub-provisioned' });
      const { handler, managedAgentService, outboundGateway } = makeHandler({
        subscriberResolve: sinon.stub().resolves(null),
        subscriberResolveOrProvision: resolveOrProvision,
        subscriberFindById: sinon.stub().resolves(null),
        agentFindOne: sinon.stub().resolves(makeManagedAgentStub()),
      });
      const thread = makeSlackDmThread();
      const message = makeSlackDmMessage();

      await handler.handle('agent1', slackConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(resolveOrProvision.called).to.equal(false);
      expect(managedAgentService.dispatch.called).to.equal(false);
      expect(outboundGateway.replyOnThread.calledOnce).to.equal(true);
    });

    it('should call resolveOrProvision for an open Telegram DM (chatId equals author userId)', async () => {
      const telegramConfig = {
        ...config,
        platform: AgentPlatformEnum.TELEGRAM,
        integrationIdentifier: 'telegram-main',
        isManaged: true,
        subscriberAccess: AgentSubscriberAccessEnum.OPEN,
      };
      const resolveOrProvision = sinon.stub().resolves({ outcome: 'resolved', subscriberId: 'sub-tg' });
      const { handler, managedAgentService, outboundGateway } = makeHandler({
        subscriberResolveOrProvision: resolveOrProvision,
        subscriberFindById: sinon.stub().resolves({ _id: 'sub-mongo', subscriberId: 'sub-tg' }),
        agentFindOne: sinon.stub().resolves(makeManagedAgentStub()),
      });
      const thread = {
        id: 'telegram:42',
        channelId: '42',
        isDM: true,
        toJSON: () => ({ id: 'telegram:42', channelId: '42', isDM: true }),
        startTyping: sinon.stub().resolves(undefined),
        post: sinon.stub().resolves({ id: 'reply-1', threadId: 'telegram:42' }),
      };
      const message = {
        id: 'msg-1',
        threadId: 'telegram:42',
        text: 'hello',
        author: { userId: '42', fullName: 'TG User', userName: 'tguser', isBot: false },
        raw: {},
        attachments: [],
      };

      await handler.handle('agent1', telegramConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(resolveOrProvision.calledOnce).to.equal(true);
      expect(resolveOrProvision.firstCall.args[0]).to.include({
        platform: AgentPlatformEnum.TELEGRAM,
        platformUserId: '42',
      });
      expect(outboundGateway.replyOnThread.called).to.equal(false);
      expect(managedAgentService.dispatch.calledOnce).to.equal(true);
    });

    it('should not call resolveOrProvision for an open Telegram group chat', async () => {
      const telegramConfig = {
        ...config,
        platform: AgentPlatformEnum.TELEGRAM,
        integrationIdentifier: 'telegram-main',
        isManaged: true,
        subscriberAccess: AgentSubscriberAccessEnum.OPEN,
      };
      const resolveOrProvision = sinon.stub().resolves({ outcome: 'resolved', subscriberId: 'sub-tg' });
      const { handler, managedAgentService, outboundGateway } = makeHandler({
        subscriberResolve: sinon.stub().resolves(null),
        subscriberResolveOrProvision: resolveOrProvision,
        subscriberFindById: sinon.stub().resolves(null),
        agentFindOne: sinon.stub().resolves(makeManagedAgentStub()),
      });
      // Group: chat.id (-100…) ≠ from.id (user).
      const thread = {
        id: 'telegram:-100123',
        channelId: '-100123',
        isDM: false,
        toJSON: () => ({ id: 'telegram:-100123', channelId: '-100123', isDM: false }),
        startTyping: sinon.stub().resolves(undefined),
        post: sinon.stub().resolves({ id: 'reply-1', threadId: 'telegram:-100123' }),
      };
      const message = {
        id: 'msg-1',
        threadId: 'telegram:-100123',
        text: 'hello group',
        author: { userId: '42', fullName: 'TG User', userName: 'tguser', isBot: false },
        raw: {},
        attachments: [],
      };

      await handler.handle('agent1', telegramConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(resolveOrProvision.called).to.equal(false);
      expect(managedAgentService.dispatch.called).to.equal(false);
      // Managed open leftovers (Telegram group) skip silently — no denial spam.
      expect(outboundGateway.replyOnThread.called).to.equal(false);
    });

    it('should dispatch custom-code open Telegram group turns with null subscriber and no denial reply', async () => {
      const telegramConfig = {
        ...config,
        platform: AgentPlatformEnum.TELEGRAM,
        integrationIdentifier: 'telegram-main',
        isManaged: false,
        subscriberAccess: AgentSubscriberAccessEnum.OPEN,
      };
      const { handler, bridgeExecutor, outboundGateway } = makeHandler({
        subscriberResolve: sinon.stub().resolves(null),
        subscriberFindById: sinon.stub().resolves(null),
        agentFindOne: sinon.stub().resolves({ _id: 'agent1', runtime: 'bridge' }),
      });
      const thread = {
        id: 'telegram:-100123',
        channelId: '-100123',
        isDM: false,
        toJSON: () => ({ id: 'telegram:-100123', channelId: '-100123', isDM: false }),
        startTyping: sinon.stub().resolves(undefined),
        post: sinon.stub().resolves({ id: 'reply-1', threadId: 'telegram:-100123' }),
      };
      const message = {
        id: 'msg-1',
        threadId: 'telegram:-100123',
        text: 'hello group',
        author: { userId: '42', fullName: 'TG User', userName: 'tguser', isBot: false },
        raw: {},
        attachments: [],
      };

      await handler.handle('agent1', telegramConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(outboundGateway.replyOnThread.called).to.equal(false);
      expect(bridgeExecutor.execute.calledOnce).to.equal(true);
      expect(bridgeExecutor.execute.firstCall.args[0].subscriber).to.equal(null);
    });

    it('should route an open-access Sendblue agent through resolveOrProvision and dispatch', async () => {
      const sendblueConfig = {
        ...config,
        platform: AgentPlatformEnum.SENDBLUE,
        integrationIdentifier: 'sendblue-main',
        isManaged: true,
        subscriberAccess: AgentSubscriberAccessEnum.OPEN,
      };
      const senderPhone = '+15551234567';
      const resolveOrProvision = sinon.stub().resolves({ outcome: 'resolved', subscriberId: 'sub-sendblue' });
      const { handler, managedAgentService, outboundGateway } = makeHandler({
        subscriberResolveOrProvision: resolveOrProvision,
        subscriberFindById: sinon.stub().resolves({ _id: 'sub-mongo', subscriberId: 'sub-sendblue' }),
        agentFindOne: sinon.stub().resolves(makeManagedAgentStub()),
      });
      const thread = {
        id: 'sendblue:+15557654321:+15551234567',
        channelId: 'sendblue:+15557654321:+15551234567',
        isDM: true,
        toJSON: () => ({
          id: 'sendblue:+15557654321:+15551234567',
          channelId: 'sendblue:+15557654321:+15551234567',
          isDM: true,
        }),
        startTyping: sinon.stub().resolves(undefined),
        post: sinon.stub().resolves({ id: 'sb-reply-1', threadId: 'sendblue:+15557654321:+15551234567' }),
      };
      const message = {
        id: 'sb-msg-1',
        threadId: 'sendblue:+15557654321:+15551234567',
        text: 'hello',
        author: {
          userId: senderPhone,
          fullName: 'SMS Sender',
          userName: senderPhone,
          isBot: false,
        },
        raw: {},
        attachments: [],
      };

      await handler.handle('agent1', sendblueConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(resolveOrProvision.calledOnce).to.equal(true);
      expect(resolveOrProvision.firstCall.args[0]).to.include({
        platform: AgentPlatformEnum.SENDBLUE,
        platformUserId: senderPhone,
      });
      expect(outboundGateway.replyOnThread.called).to.equal(false);
      expect(managedAgentService.dispatch.calledOnce).to.equal(true);
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
      // Plain (non-/start) messages need open access to reach the bridge without a linked subscriber.
      subscriberAccess: AgentSubscriberAccessEnum.OPEN,
    };

    const matchingStartPayload = {
      _environmentId: 'env1',
      _organizationId: 'org1',
      linkScope: { mode: 'agent' as const, agentIdentifier: 'support-agent' },
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
      const linkTelegramExecute = sinon.stub().resolves({
        created: true,
        subscriberId: 'ext-sub-1',
        linkScope: { mode: 'agent', agentIdentifier: 'support-agent' },
      });
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
        linkScope: { mode: 'agent', agentIdentifier: 'support-agent' },
      });
      expect(linkTelegramChatToSubscriber.execute.calledOnce).to.equal(true);
      const cmd = linkTelegramChatToSubscriber.execute.firstCall.args[0];
      expect(cmd.environmentId).to.equal('env1');
      expect(cmd.subscriberId).to.equal('ext-sub-1');
      expect(cmd.chatId).to.equal('42');
      expect(cmd.linkScope).to.deep.equal({ mode: 'agent', agentIdentifier: 'support-agent' });
      expect(thread.post.calledOnce).to.equal(true);
      expect(bridgeExecutor.execute.called).to.equal(false);
      expect(conversationService.createOrGetConversation.called).to.equal(false);
    });

    it('replies with the duplicate message when the chat was already linked', async () => {
      const linkTelegramExecute = sinon.stub().resolves({
        created: false,
        subscriberId: 'sub-1',
        linkScope: { mode: 'agent', agentIdentifier: 'support-agent' },
      });
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

    it('does not mark the integration connected on /start alone for the dashboard test identity', async () => {
      const connectPayload = { ...matchingStartPayload, subscriberId: 'user-123' };
      const { handler, agentIntegrationRepository } = makeHandler({
        linkTelegramExecute: sinon.stub().resolves({
          created: true,
          subscriberId: 'user-123',
          linkScope: { mode: 'agent', agentIdentifier: 'support-agent' },
        }),
        startCodeConsume: sinon.stub().resolves({ status: 'consumed', payload: connectPayload }),
      });
      const thread = makeTelegramThread();
      const message = makeStartMessage('/start dashcode');

      await handler.handle('agent1', telegramConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(agentIntegrationRepository.updateOne.called).to.equal(false);
    });

    it('marks the integration connected when the dashboard test identity sends a follow-up message after linking', async () => {
      const { handler, agentIntegrationRepository } = makeHandler();
      const thread = makeTelegramThread();
      const message = makeStartMessage('hello from onboarding test');

      await handler.handle('agent1', telegramConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(agentIntegrationRepository.updateOne.calledOnce).to.equal(true);
      const [filter, update] = agentIntegrationRepository.updateOne.firstCall.args;
      expect(filter).to.deep.equal({
        _environmentId: 'env1',
        _organizationId: 'org1',
        _agentId: 'agent1',
        _integrationId: 'integration1',
        $or: [{ connectedAt: null }, { connectedAt: { $exists: false } }, { connectedAt: { $lte: new Date(0) } }],
      });
      expect(update.$set.connectedAt).to.be.instanceOf(Date);
    });

    it('does not mark the integration connected (Layer 2) when a genuine end user links via /start', async () => {
      const { handler, agentIntegrationRepository } = makeHandler({
        linkTelegramExecute: sinon.stub().resolves({
          created: true,
          subscriberId: 'ext-sub-1',
          linkScope: { mode: 'agent', agentIdentifier: 'support-agent' },
        }),
        startCodeConsume: sinon.stub().resolves({ status: 'consumed', payload: matchingStartPayload }),
      });
      const thread = makeTelegramThread();
      const message = makeStartMessage('/start enduser');

      await handler.handle('agent1', telegramConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(agentIntegrationRepository.updateOne.called).to.equal(false);
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

    it('does not mark connectedAt when a stale code re-tap finds an existing dashboard endpoint', async () => {
      const { handler, agentIntegrationRepository } = makeHandler({
        startCodeConsume: sinon.stub().resolves({ status: 'missing' }),
        findTelegramEndpointByIdentity: sinon.stub().resolves({ subscriberId: 'user-123' }),
      });
      const thread = makeTelegramThread();
      const message = makeStartMessage('/start reused');

      await handler.handle('agent1', telegramConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(agentIntegrationRepository.updateOne.called).to.equal(false);
    });

    it('does not self-heal connectedAt when the existing endpoint belongs to a genuine end user', async () => {
      const { handler, agentIntegrationRepository } = makeHandler({
        startCodeConsume: sinon.stub().resolves({ status: 'missing' }),
        findTelegramEndpointByIdentity: sinon.stub().resolves({ subscriberId: 'ext-sub-1' }),
      });
      const thread = makeTelegramThread();
      const message = makeStartMessage('/start reused');

      await handler.handle('agent1', telegramConfig as any, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

      expect(agentIntegrationRepository.updateOne.called).to.equal(false);
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

    it('should hydrate workflow origin when an action is the first interaction on the thread', async () => {
      const { handler, conversationService, workflowOriginService, bridgeExecutor } = makeHandler(
        makeResolvedSubscriberOverrides()
      );
      const origin = {
        _id: 'msg1',
        _notificationId: 'notif1',
        templateIdentifier: 'order-alerts',
        identifier: 'thread1:1777837477.371619',
      };

      conversationService.findByPlatformThread.resolves(null);
      workflowOriginService.resolve.resolves({ origin, notificationId: 'notif1' });

      await handler.handleAction(
        'agent1',
        config as any,
        makeActionThread() as any,
        { id: 'ack', value: undefined } as any,
        'user1'
      );

      expect(workflowOriginService.hydrate.calledOnce).to.equal(true);
      expect(workflowOriginService.hydrate.firstCall.args[0].origin).to.equal(origin);
      // The origin must reach history before the runtime reads the conversation.
      expect(workflowOriginService.hydrate.calledBefore(bridgeExecutor.execute)).to.equal(true);
    });

    it('should resume a parked Wait job when an approve/choose workflow-origin card button is clicked', async () => {
      const { handler, conversationService, workflowOriginService, resumeWait } = makeHandler(
        makeResolvedSubscriberOverrides()
      );
      const origin = {
        _id: 'msg1',
        _notificationId: 'notif1',
        transactionId: 'txn-approve-1',
        templateIdentifier: HITL_APPROVE_WORKFLOW_ID,
        identifier: 'thread1:1777837477.371619',
      };

      conversationService.findByPlatformThread.resolves(null);
      workflowOriginService.resolve.resolves({ origin, notificationId: 'notif1' });

      await handler.handleAction(
        'agent1',
        config as any,
        makeActionThread() as any,
        { id: 'approve', value: undefined } as any,
        'user1'
      );

      expect(resumeWait.execute.calledOnce).to.equal(true);
      expect(resumeWait.execute.firstCall.args[0]).to.include({
        transactionId: 'txn-approve-1',
        organizationId: config.organizationId,
        environmentId: config.environmentId,
      });
      expect(resumeWait.execute.firstCall.args[0].data).to.deep.include({ verdict: 'approve' });
      expect(resumeWait.execute.firstCall.args[0].to).to.deep.equal({ subscriberId: 'sub1' });
    });

    it('should not resume a Wait job for a tool-approval action', async () => {
      const { handler, conversationService, workflowOriginService, resumeWait } = makeHandler(
        makeResolvedSubscriberOverrides()
      );
      const origin = {
        _id: 'msg1',
        _notificationId: 'notif1',
        transactionId: 'txn-approve-1',
        templateIdentifier: HITL_APPROVE_WORKFLOW_ID,
      };

      conversationService.findByPlatformThread.resolves(null);
      workflowOriginService.resolve.resolves({ origin, notificationId: 'notif1' });

      await handler.handleAction(
        'agent1',
        config as any,
        makeActionThread() as any,
        { id: 'tool-approval:approve:tc', value: undefined } as any,
        'user1'
      );

      expect(resumeWait.execute.called).to.equal(false);
    });

    it('should not resume a Wait job for a non-HITL workflow origin action', async () => {
      const { handler, conversationService, workflowOriginService, resumeWait } = makeHandler(
        makeResolvedSubscriberOverrides()
      );
      const origin = {
        _id: 'msg1',
        _notificationId: 'notif1',
        transactionId: 'txn-order-1',
        templateIdentifier: 'order-alerts',
      };

      conversationService.findByPlatformThread.resolves(null);
      workflowOriginService.resolve.resolves({ origin, notificationId: 'notif1' });

      await handler.handleAction(
        'agent1',
        config as any,
        makeActionThread() as any,
        { id: 'ack', value: undefined } as any,
        'user1'
      );

      expect(resumeWait.execute.called).to.equal(false);
    });

    it('should not resume a Wait job for an ask workflow origin action', async () => {
      const { handler, conversationService, workflowOriginService, resumeWait } = makeHandler(
        makeResolvedSubscriberOverrides()
      );
      const origin = {
        _id: 'msg1',
        _notificationId: 'notif1',
        transactionId: 'txn-ask-1',
        templateIdentifier: HITL_ASK_WORKFLOW_ID,
      };

      conversationService.findByPlatformThread.resolves(null);
      workflowOriginService.resolve.resolves({ origin, notificationId: 'notif1' });

      await handler.handleAction(
        'agent1',
        config as any,
        makeActionThread() as any,
        { id: 'ack', value: undefined } as any,
        'user1'
      );

      expect(resumeWait.execute.called).to.equal(false);
    });

    it('should use the clicked Slack message timestamp when resolving an action-only thread', async () => {
      const { handler, conversationService, workflowOriginService, bridgeExecutor } = makeHandler(
        makeResolvedSubscriberOverrides()
      );
      const platformThreadId = 'slack:D123:1777837477.371619';
      const origin = {
        _id: 'msg1',
        _notificationId: 'notif1',
        identifier: 'D123:1777837477.371619',
      };

      conversationService.findByPlatformThread.resolves(null);
      workflowOriginService.resolve.resolves({ origin, notificationId: 'notif1' });

      await handler.handleAction(
        'agent1',
        config as any,
        makeSlackDmThread() as any,
        { id: 'ack', sourceMessageId: '1777837477.371619' } as any,
        'user1'
      );

      expect(conversationService.findByPlatformThread.firstCall.args[4]).to.equal(platformThreadId);
      expect(workflowOriginService.resolve.firstCall.args[0].platformThreadId).to.equal(platformThreadId);
      expect(conversationService.createOrGetConversation.firstCall.args[0].platformThreadId).to.equal(platformThreadId);
      expect(workflowOriginService.hydrate.firstCall.args[0].platformThreadId).to.equal(platformThreadId);
      expect(bridgeExecutor.execute.firstCall.args[0].platformContext.threadId).to.equal(platformThreadId);
    });

    it('should not hydrate workflow origin for link-button actions when resolve returns null', async () => {
      const { handler, workflowOriginService } = makeHandler();

      await handler.handleAction(
        'agent1',
        config as any,
        makeActionThread() as any,
        { id: 'link-https://novu.co/pricing', value: undefined } as any,
        'user1'
      );

      expect(workflowOriginService.hydrate.called).to.equal(false);
    });

    it('should still hydrate workflow origin when a link-button click is the first-ever interaction on a seeded thread', async () => {
      const { handler, conversationService, workflowOriginService } = makeHandler(makeResolvedSubscriberOverrides());

      // Regression: create + hydrate must be atomic. A link-button click swallowed
      // right after conversation creation must not skip the one-shot hydration —
      // otherwise `_notificationId` gets stamped with no origin content ever written,
      // permanently blocking every later retry.
      conversationService.findByPlatformThread.resolves(null);
      workflowOriginService.resolve.resolves({
        origin: { _id: 'msg1', _notificationId: 'notif1' },
        notificationId: 'notif1',
      });

      await handler.handleAction(
        'agent1',
        config as any,
        makeActionThread() as any,
        { id: 'link-https://novu.co/pricing', value: undefined } as any,
        'user1'
      );

      expect(conversationService.createOrGetConversation.firstCall.args[0].notificationId).to.equal('notif1');
      expect(workflowOriginService.hydrate.calledOnce).to.equal(true);
    });

    it('should still dispatch the action when workflow origin resolve returns null', async () => {
      const { handler, conversationService, workflowOriginService, bridgeExecutor } = makeHandler(
        makeResolvedSubscriberOverrides()
      );

      conversationService.findByPlatformThread.resolves(null);
      workflowOriginService.resolve.resolves(null);

      await handler.handleAction(
        'agent1',
        config as any,
        makeActionThread() as any,
        { id: 'ack', value: undefined } as any,
        'user1'
      );

      expect(workflowOriginService.hydrate.called).to.equal(false);
      expect(bridgeExecutor.execute.calledOnce).to.equal(true);
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

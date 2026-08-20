import { ChannelTypeEnum, ENDPOINT_TYPES } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { WORKFLOW_ORIGIN_LOOKBACK_MS } from './workflow-origin.helpers';
import { WorkflowOriginService } from './workflow-origin.service';

describe('WorkflowOriginService', () => {
  const conversation = {
    _id: 'conversation1',
    channels: [{ platformThreadId: 'thread1', platform: 'slack', _integrationId: 'integration1' }],
    participants: [{ type: 'subscriber', id: 'sub1' }],
  };

  afterEach(() => {
    delete (conversation as { _notificationId?: string })._notificationId;
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

  function makeService(
    overrides: {
      findBySubscriberId?: sinon.SinonStub;
      findOne?: sinon.SinonStub;
      find?: sinon.SinonStub;
      notificationFindOne?: sinon.SinonStub;
      persistWorkflowOriginHydration?: sinon.SinonStub;
      isWorkflowOriginHydrated?: sinon.SinonStub;
    } = {}
  ) {
    const logger = makeLogger();
    const conversationService = {
      getPrimaryChannel: sinon.stub().callsFake((conv) => conv.channels[0]),
      persistWorkflowOriginHydration: overrides.persistWorkflowOriginHydration ?? sinon.stub().resolves(undefined),
      isWorkflowOriginHydrated: overrides.isWorkflowOriginHydrated ?? sinon.stub().resolves(false),
      setNotificationId: sinon.stub().resolves(undefined),
    };
    const subscriberRepository = {
      findBySubscriberId: overrides.findBySubscriberId ?? sinon.stub().resolves({ _id: 'subscriber-mongo-1' }),
    };
    const notificationRepository = {
      findOne: overrides.notificationFindOne ?? sinon.stub().resolves(null),
    };
    const messageRepository = {
      findOne: overrides.findOne ?? sinon.stub().resolves(null),
      find: overrides.find ?? sinon.stub().resolves([]),
    };

    const service = new WorkflowOriginService(
      logger as any,
      conversationService as any,
      subscriberRepository as any,
      notificationRepository as any,
      messageRepository as any
    );

    return { service, logger, conversationService, subscriberRepository, notificationRepository, messageRepository };
  }

  describe('Slack', () => {
    const config = {
      environmentId: 'env1',
      organizationId: 'org1',
      platform: AgentPlatformEnum.SLACK,
      agentIdentifier: 'support-agent',
      providerId: 'slack',
    };

    it('resolves the origin by platform-thread lookup key on a new conversation', async () => {
      const origin = {
        _id: 'msg1',
        _notificationId: 'notif1',
        identifier: 'D123:1777837477.371619',
        content: 'Order ORD-1 shipped',
        templateIdentifier: 'order-alerts',
      };
      const { service, messageRepository } = makeService({
        findOne: sinon.stub().resolves(origin),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: config as any,
        platformThreadId: 'slack:D123:1777837477.371619',
        subscriberId: 'sub1',
        message: { id: 'reply', text: 'hi', author: { userId: 'u1' }, raw: {} } as any,
        existingConversation: null,
      });

      expect(messageRepository.findOne.firstCall.args[0]).to.deep.equal({
        _environmentId: 'env1',
        _agentId: 'agent1',
        _subscriberId: 'subscriber-mongo-1',
        identifier: 'D123:1777837477.371619',
      });
      expect(result).to.deep.equal({ origin, notificationId: 'notif1' });
    });

    it('skips lookup on an existing Slack conversation', async () => {
      const { service, messageRepository } = makeService();

      const result = await service.resolve({
        agentId: 'agent1',
        config: config as any,
        platformThreadId: 'slack:D123:1777837477.371619',
        subscriberId: 'sub1',
        message: { id: 'reply', text: 'hi', author: { userId: 'u1' }, raw: {} } as any,
        existingConversation: conversation as any,
      });

      expect(result).to.equal(null);
      expect(messageRepository.findOne.called).to.equal(false);
    });

    it('scopes the origin lookup to the resolved subscriber', async () => {
      const { service, messageRepository } = makeService({
        findBySubscriberId: sinon.stub().resolves({ _id: 'attacker-mongo' }),
        findOne: sinon.stub().resolves(null),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: config as any,
        platformThreadId: 'slack:D123:1777837477.371619',
        subscriberId: 'attacker-subscriber',
        message: { id: 'reply', text: 'hi', author: { userId: 'u1' }, raw: {} } as any,
        existingConversation: null,
      });

      expect(messageRepository.findOne.firstCall.args[0]._subscriberId).to.equal('attacker-mongo');
      expect(result).to.equal(null);
    });

    it('hydrates platform message id from the Slack identifier suffix', async () => {
      const { service, conversationService, notificationRepository } = makeService({
        notificationFindOne: sinon.stub().resolves({ payload: { orderId: 'ORD-1' } }),
      });

      await service.hydrate({
        agentId: 'agent1',
        config: config as any,
        conversation: conversation as any,
        platformThreadId: 'slack:D123:1777837477.371619',
        origin: {
          _id: 'msg1',
          _notificationId: 'notif1',
          _templateId: 'template-1',
          _jobId: 'job1',
          transactionId: 'txn1',
          templateIdentifier: 'order-alerts',
          stepId: 'chat-1',
          content: 'Order ORD-1 shipped',
          identifier: 'D123:1777837477.371619',
          createdAt: '2026-01-01T00:00:00.000Z',
        } as any,
      });

      expect(notificationRepository.findOne.calledOnce).to.equal(true);
      expect(conversationService.persistWorkflowOriginHydration.calledOnce).to.equal(true);
      const hydrateArgs = conversationService.persistWorkflowOriginHydration.firstCall.args[0];
      expect(hydrateArgs.platformMessageId).to.equal('1777837477.371619');
      expect(hydrateArgs.signalData.workflowIdentifier).to.equal('order-alerts');
      expect(hydrateArgs.signalData.payload).to.deep.equal({ orderId: 'ORD-1' });
      expect(conversationService.setNotificationId.calledOnce).to.equal(true);
      expect(
        conversationService.setNotificationId.calledBefore(conversationService.persistWorkflowOriginHydration)
      ).to.equal(true);
    });

    it('keeps the origin re-derivable when the hydration marker write fails', async () => {
      const { service, conversationService } = makeService({
        notificationFindOne: sinon.stub().resolves({ payload: { orderId: 'ORD-1' } }),
        persistWorkflowOriginHydration: sinon.stub().rejects(new Error('mongo timeout')),
      });
      const target = { ...conversation } as any;

      const snapshot = await service.hydrate({
        agentId: 'agent1',
        config: config as any,
        conversation: target,
        platformThreadId: 'slack:D123:1777837477.371619',
        origin: {
          _id: 'msg1',
          _notificationId: 'notif1',
          templateIdentifier: 'order-alerts',
          content: 'Order ORD-1 shipped',
          identifier: 'D123:1777837477.371619',
        } as any,
      });

      expect(snapshot).to.equal(null);
      expect(conversationService.setNotificationId.calledOnce).to.equal(true);
      expect(target._notificationId).to.equal('notif1');
    });
  });

  describe('resolveForTurn', () => {
    const config = {
      environmentId: 'env1',
      organizationId: 'org1',
      platform: AgentPlatformEnum.SLACK,
      agentIdentifier: 'support-agent',
      providerId: 'slack',
    };
    const conversation = {
      _id: 'conv1',
      channels: [{ platform: AgentPlatformEnum.SLACK, _integrationId: 'int1', platformThreadId: 'slack:D123:' }],
      participants: [{ type: 'subscriber', id: 'sub1' }],
    };

    afterEach(() => {
      delete (conversation as { _notificationId?: string })._notificationId;
    });

    it('hydrates when a resolution is present and returns a hydrated snapshot', async () => {
      const { service, conversationService } = makeService({
        notificationFindOne: sinon.stub().resolves({ payload: { orderId: 'ORD-1' } }),
      });
      const origin = {
        _id: 'msg1',
        _notificationId: 'notif1',
        _templateId: 'template-1',
        templateIdentifier: 'order-alerts',
        content: 'Order ORD-1 shipped',
        identifier: 'D123:1777837477.371619',
        channel: 'chat',
        createdAt: '2026-01-01T00:00:00.000Z',
      };

      const snapshot = await service.resolveForTurn({
        agentId: 'agent1',
        config: config as any,
        conversation: conversation as any,
        platformThreadId: 'slack:D123:1777837477.371619',
        subscriberId: 'sub1',
        resolution: { origin: origin as any, notificationId: 'notif1' },
      });

      expect(conversationService.persistWorkflowOriginHydration.calledOnce).to.equal(true);
      expect(snapshot?.source).to.equal('hydrated');
      expect(snapshot?.data.body).to.equal('Order ORD-1 shipped');
      expect(snapshot?.data.workflowIdentifier).to.equal('order-alerts');
    });

    it('re-derives from conversation._notificationId on later turns', async () => {
      const origin = {
        _id: 'msg1',
        _notificationId: 'notif1',
        templateIdentifier: 'order-alerts',
        content: 'Your order shipped',
        identifier: 'D123:1777837477.371619',
        channel: 'chat',
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      const { service, conversationService, messageRepository } = makeService({
        find: sinon.stub().resolves([origin]),
        notificationFindOne: sinon.stub().resolves({ payload: { orderId: 'ORD-9' } }),
      });

      const snapshot = await service.resolveForTurn({
        agentId: 'agent1',
        config: config as any,
        conversation: { ...conversation, _notificationId: 'notif1' } as any,
        platformThreadId: 'slack:D123:1777837477.371619',
        subscriberId: 'sub1',
        resolution: null,
      });

      expect(conversationService.persistWorkflowOriginHydration.called).to.equal(false);
      expect(messageRepository.find.calledOnce).to.equal(true);
      expect(messageRepository.find.firstCall.args[0]).to.deep.equal({
        _environmentId: 'env1',
        _agentId: 'agent1',
        _subscriberId: 'subscriber-mongo-1',
        _notificationId: 'notif1',
      });
      expect(snapshot?.source).to.equal('existing');
      expect(snapshot?.data.body).to.equal('Your order shipped');
      expect(snapshot?.data.payload).to.deep.equal({ orderId: 'ORD-9' });
    });

    it('does not re-derive the origin for another participant in the same thread', async () => {
      const { service, messageRepository } = makeService({
        findBySubscriberId: sinon.stub().resolves({ _id: 'other-participant-mongo' }),
        find: sinon.stub().resolves([]),
        notificationFindOne: sinon.stub().resolves({ payload: { orderId: 'ORD-9' } }),
      });

      const snapshot = await service.resolveForTurn({
        agentId: 'agent1',
        config: config as any,
        conversation: { ...conversation, _notificationId: 'notif1' } as any,
        platformThreadId: 'slack:D123:1777837477.371619',
        subscriberId: 'other-participant',
        resolution: null,
      });

      expect(messageRepository.find.firstCall.args[0]._subscriberId).to.equal('other-participant-mongo');
      expect(snapshot).to.equal(null);
    });

    it('skips the re-derive when the turn has no resolved subscriber', async () => {
      const { service, messageRepository, subscriberRepository } = makeService({
        find: sinon.stub().resolves([{ _id: 'msg1', identifier: 'D123:1777837477.371619' }]),
      });

      const snapshot = await service.resolveForTurn({
        agentId: 'agent1',
        config: config as any,
        conversation: { ...conversation, _notificationId: 'notif1' } as any,
        platformThreadId: 'slack:D123:1777837477.371619',
        subscriberId: null,
        resolution: null,
      });

      expect(snapshot).to.equal(null);
      expect(subscriberRepository.findBySubscriberId.called).to.equal(false);
      expect(messageRepository.find.called).to.equal(false);
    });

    it('skips the re-derive on a conversation that was never opened from a workflow send', async () => {
      const { service, messageRepository } = makeService();

      const snapshot = await service.resolveForTurn({
        agentId: 'agent1',
        config: config as any,
        conversation: conversation as any,
        platformThreadId: 'slack:D123:1777837477.371619',
        subscriberId: 'sub1',
        resolution: null,
      });

      expect(snapshot).to.equal(null);
      expect(messageRepository.find.called).to.equal(false);
    });
  });

  describe('email', () => {
    const config = {
      environmentId: 'env1',
      organizationId: 'org1',
      platform: AgentPlatformEnum.EMAIL,
      agentIdentifier: 'support-agent',
      providerId: 'novu-email',
    };
    const ORIGIN_MESSAGE_ID = '65f1a2b3c4d5e6f7a8b9c0d1';

    it('resolves the origin from originToken on a new conversation', async () => {
      const origin = {
        _id: ORIGIN_MESSAGE_ID,
        _notificationId: 'notif1',
        content: 'Order ORD-1 shipped',
        templateIdentifier: 'order-alerts',
      };
      const { service, messageRepository } = makeService({
        findOne: sinon.stub().resolves(origin),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: config as any,
        platformThreadId: 'email:thread1:',
        subscriberId: 'sub1',
        message: { id: 'reply', text: 'hi', author: { userId: 'u1' }, raw: { originToken: ORIGIN_MESSAGE_ID } } as any,
        existingConversation: null,
      });

      expect(messageRepository.findOne.firstCall.args[0]).to.deep.equal({
        _id: ORIGIN_MESSAGE_ID,
        _environmentId: 'env1',
        _agentId: 'agent1',
        _subscriberId: 'subscriber-mongo-1',
      });
      expect(result).to.deep.equal({ origin, notificationId: 'notif1' });
    });

    it('skips lookup on an existing email conversation', async () => {
      const { service, messageRepository } = makeService();

      const result = await service.resolve({
        agentId: 'agent1',
        config: config as any,
        platformThreadId: 'email:thread1:',
        subscriberId: 'sub1',
        message: { id: 'reply', text: 'hi', author: { userId: 'u1' }, raw: { originToken: ORIGIN_MESSAGE_ID } } as any,
        existingConversation: conversation as any,
      });

      expect(result).to.equal(null);
      expect(messageRepository.findOne.called).to.equal(false);
    });

    it('ignores References / In-Reply-To without an originToken', async () => {
      const { service, messageRepository } = makeService();

      const result = await service.resolve({
        agentId: 'agent1',
        config: config as any,
        platformThreadId: 'email:thread1:',
        subscriberId: 'sub1',
        message: {
          id: 'reply',
          text: 'hi',
          author: { userId: 'u1' },
          raw: { references: '<a@b.com>', inReplyTo: '<c@d.com>' },
        } as any,
        existingConversation: null,
      });

      expect(result).to.equal(null);
      expect(messageRepository.findOne.called).to.equal(false);
    });

    it('hydrates using Message._id as platformMessageId', async () => {
      const { service, conversationService } = makeService({
        notificationFindOne: sinon.stub().resolves({ payload: { orderId: 'ORD-1' } }),
      });

      await service.hydrate({
        agentId: 'agent1',
        config: config as any,
        conversation: conversation as any,
        platformThreadId: 'email:thread1:',
        origin: {
          _id: ORIGIN_MESSAGE_ID,
          _notificationId: 'notif1',
          templateIdentifier: 'order-alerts',
          content: 'Order ORD-1 shipped',
          identifier: 'provider-send-id',
        } as any,
      });

      expect(conversationService.persistWorkflowOriginHydration.firstCall.args[0].platformMessageId).to.equal(
        ORIGIN_MESSAGE_ID
      );
    });
  });

  describe('WhatsApp', () => {
    const whatsappConfig = {
      environmentId: 'env1',
      organizationId: 'org1',
      platform: AgentPlatformEnum.WHATSAPP,
      agentIdentifier: 'support-agent',
      providerId: 'whatsapp-business',
    };

    const whatsappOrigin = {
      _id: 'wa-msg1',
      _notificationId: 'wa-notif1',
      _jobId: 'wa-job1',
      transactionId: 'wa-txn1',
      templateIdentifier: 'order-alerts',
      stepId: 'chat-1',
      content: 'Your order shipped',
      identifier: 'wamid.HBgLMTU1NTEyMzQ1NjcVAgARGBI4QkY5',
      createdAt: new Date(Date.now() - 60_000).toISOString(),
      providerId: 'whatsapp-business',
    };

    it('hydrates the latest agent-attributed WhatsApp origin on a new conversation', async () => {
      const { service, messageRepository } = makeService({
        find: sinon.stub().resolves([whatsappOrigin]),
      });

      const before = Date.now();
      const result = await service.resolve({
        agentId: 'agent1',
        config: whatsappConfig as any,
        platformThreadId: 'whatsapp:15551234567',
        subscriberId: 'sub1',
        message: { id: 'inbound', text: 'hi', author: { userId: '15551234567' }, raw: {} } as any,
        existingConversation: null,
      });
      const after = Date.now();

      expect(messageRepository.find.calledOnce).to.equal(true);
      const [query, , options] = messageRepository.find.firstCall.args;
      expect(query).to.include({
        _environmentId: 'env1',
        _agentId: 'agent1',
        _subscriberId: 'subscriber-mongo-1',
        providerId: 'whatsapp-business',
      });
      expect(query.createdAt.$gt.getTime()).to.be.at.least(before - WORKFLOW_ORIGIN_LOOKBACK_MS - 5);
      expect(query.createdAt.$gt.getTime()).to.be.at.most(after - WORKFLOW_ORIGIN_LOOKBACK_MS + 5);
      expect(query._notificationId).to.deep.equal({ $exists: true, $ne: null });
      expect(options).to.deep.equal({ sort: { createdAt: -1 }, limit: 1 });
      expect(result).to.deep.equal({ origin: whatsappOrigin, notificationId: 'wa-notif1' });
    });

    it('catch-up hydrates an existing conversation when the origin is not hydrated yet', async () => {
      const existingConversation = {
        ...conversation,
        lastActivityAt: new Date(Date.now() - 3_600_000).toISOString(),
        participants: [{ type: 'subscriber', id: 'sub1' }],
      };
      const { service, messageRepository, conversationService } = makeService({
        find: sinon.stub().resolves([whatsappOrigin]),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: whatsappConfig as any,
        platformThreadId: 'whatsapp:15551234567',
        subscriberId: 'sub1',
        message: { id: 'inbound', text: 'hi', author: { userId: '15551234567' }, raw: {} } as any,
        existingConversation: existingConversation as any,
      });

      expect(messageRepository.find.calledOnce).to.equal(true);
      expect(conversationService.isWorkflowOriginHydrated.firstCall.args).to.deep.equal([
        'env1',
        'conversation1',
        whatsappOrigin.identifier,
      ]);
      expect(result).to.deep.equal({ origin: whatsappOrigin, notificationId: undefined });
    });

    it('skips an origin already hydrated into the conversation', async () => {
      const existingConversation = {
        ...conversation,
        lastActivityAt: new Date(Date.now() - 3_600_000).toISOString(),
        participants: [{ type: 'subscriber', id: 'sub1' }],
      };
      const { service } = makeService({
        find: sinon.stub().resolves([whatsappOrigin]),
        isWorkflowOriginHydrated: sinon.stub().resolves(true),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: whatsappConfig as any,
        platformThreadId: 'whatsapp:15551234567',
        subscriberId: 'sub1',
        message: { id: 'inbound', text: 'hi', author: { userId: '15551234567' }, raw: {} } as any,
        existingConversation: existingConversation as any,
      });

      expect(result).to.equal(null);
    });

    it('re-resolves an unhydrated origin older than lastActivityAt so a failed hydration is retried', async () => {
      const existingConversation = {
        ...conversation,
        // The failed turn still persisted its inbound message, so activity is newer than the origin.
        lastActivityAt: new Date().toISOString(),
        participants: [{ type: 'subscriber', id: 'sub1' }],
      };
      const { service } = makeService({
        find: sinon.stub().resolves([whatsappOrigin]),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: whatsappConfig as any,
        platformThreadId: 'whatsapp:15551234567',
        subscriberId: 'sub1',
        message: { id: 'inbound', text: 'again', author: { userId: '15551234567' }, raw: {} } as any,
        existingConversation: existingConversation as any,
      });

      expect(result?.origin).to.equal(whatsappOrigin);
    });

    it('prefers a quoted wamid over latest-by-subscriber and bypasses the catch-up window', async () => {
      const lastActivityAt = new Date().toISOString();
      const existingConversation = {
        ...conversation,
        lastActivityAt,
        participants: [{ type: 'subscriber', id: 'sub1' }],
      };
      const { service, messageRepository } = makeService({
        findOne: sinon.stub().resolves({
          ...whatsappOrigin,
          createdAt: new Date(Date.now() - 86_400_000).toISOString(),
        }),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: whatsappConfig as any,
        platformThreadId: 'whatsapp:15551234567',
        subscriberId: 'sub1',
        message: {
          id: 'inbound',
          text: 'hi',
          author: { userId: '15551234567' },
          raw: {
            message: {
              from: '15551234567',
              id: 'wamid.inbound',
              context: { id: whatsappOrigin.identifier, from: '15559876543' },
            },
          },
        } as any,
        existingConversation: existingConversation as any,
      });

      expect(messageRepository.findOne.calledOnce).to.equal(true);
      expect(messageRepository.findOne.firstCall.args[0]).to.deep.equal({
        _environmentId: 'env1',
        _agentId: 'agent1',
        _subscriberId: 'subscriber-mongo-1',
        providerId: 'whatsapp-business',
        channel: ChannelTypeEnum.CHAT,
        _notificationId: { $exists: true, $ne: null },
        identifier: whatsappOrigin.identifier,
      });
      expect(messageRepository.find.called).to.equal(false);
      expect(result?.origin.identifier).to.equal(whatsappOrigin.identifier);
      expect(result?.notificationId).to.equal(undefined);
    });

    it('resolves on action turns without a message using latest-by-subscriber', async () => {
      const { service, messageRepository } = makeService({
        find: sinon.stub().resolves([whatsappOrigin]),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: whatsappConfig as any,
        platformThreadId: 'whatsapp:15551234567',
        subscriberId: 'sub1',
        message: null,
        existingConversation: null,
      });

      expect(messageRepository.find.calledOnce).to.equal(true);
      expect(result?.notificationId).to.equal('wa-notif1');
    });

    it('hydrates using the raw WhatsApp identifier as platformMessageId', async () => {
      const { service, conversationService } = makeService({
        notificationFindOne: sinon.stub().resolves({ payload: { orderId: 'ORD-9' } }),
      });

      await service.hydrate({
        agentId: 'agent1',
        config: whatsappConfig as any,
        conversation: conversation as any,
        platformThreadId: 'whatsapp:15551234567',
        origin: whatsappOrigin as any,
      });

      expect(conversationService.persistWorkflowOriginHydration.firstCall.args[0].platformMessageId).to.equal(
        whatsappOrigin.identifier
      );
      expect(
        conversationService.persistWorkflowOriginHydration.firstCall.args[0].signalData.workflowIdentifier
      ).to.equal('order-alerts');
    });

    it('is fail-soft when lookup throws', async () => {
      const { service, logger } = makeService({
        find: sinon.stub().rejects(new Error('mongo timeout')),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: whatsappConfig as any,
        platformThreadId: 'whatsapp:15551234567',
        subscriberId: 'sub1',
        message: { id: 'inbound', text: 'hi', author: { userId: '15551234567' }, raw: {} } as any,
        existingConversation: null,
      });

      expect(result).to.equal(null);
      expect(logger.warn.calledOnce).to.equal(true);
    });
  });

  describe('Telegram', () => {
    const telegramConfig = {
      environmentId: 'env1',
      organizationId: 'org1',
      platform: AgentPlatformEnum.TELEGRAM,
      agentIdentifier: 'support-agent',
      providerId: 'telegram',
    };

    const telegramOrigin = {
      _id: 'tg-msg1',
      _notificationId: 'tg-notif1',
      _templateId: 'tg-template1',
      _jobId: 'tg-job1',
      transactionId: 'tg-txn1',
      templateIdentifier: 'order-alerts',
      stepId: 'chat-1',
      content: 'Your order shipped',
      identifier: '42',
      createdAt: new Date(Date.now() - 60_000).toISOString(),
      providerId: 'telegram',
      channelData: [{ type: 'telegram_chat', endpoint: { chatId: '777042' } }],
    };

    it('hydrates the latest agent-attributed Telegram origin on a new conversation', async () => {
      const { service, messageRepository } = makeService({
        find: sinon.stub().resolves([telegramOrigin]),
      });

      const before = Date.now();
      const result = await service.resolve({
        agentId: 'agent1',
        config: telegramConfig as any,
        platformThreadId: 'telegram:777042',
        subscriberId: 'sub1',
        message: { id: 'inbound', text: 'hi', author: { userId: '777042' }, raw: {} } as any,
        existingConversation: null,
      });
      const after = Date.now();

      expect(messageRepository.find.calledOnce).to.equal(true);
      const [query, , options] = messageRepository.find.firstCall.args;
      expect(query).to.include({
        _environmentId: 'env1',
        _agentId: 'agent1',
        _subscriberId: 'subscriber-mongo-1',
        providerId: 'telegram',
        'channelData.endpoint.chatId': '777042',
      });
      expect(query.channel).to.equal(ChannelTypeEnum.CHAT);
      expect(query.createdAt.$gt.getTime()).to.be.at.least(before - WORKFLOW_ORIGIN_LOOKBACK_MS - 5);
      expect(query.createdAt.$gt.getTime()).to.be.at.most(after - WORKFLOW_ORIGIN_LOOKBACK_MS + 5);
      expect(query._notificationId).to.deep.equal({ $exists: true, $ne: null });
      expect(options).to.deep.equal({ sort: { createdAt: -1 }, limit: 1 });
      expect(result).to.deep.equal({ origin: telegramOrigin, notificationId: 'tg-notif1' });
    });

    it('prefers a flat quoted reply_to_message.message_id over latest-by-subscriber', async () => {
      const existingConversation = {
        ...conversation,
        lastActivityAt: new Date().toISOString(),
        participants: [{ type: 'subscriber', id: 'sub1' }],
      };
      const { service, messageRepository } = makeService({
        findOne: sinon.stub().resolves({
          ...telegramOrigin,
          createdAt: new Date(Date.now() - 86_400_000).toISOString(),
        }),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: telegramConfig as any,
        platformThreadId: 'telegram:777042',
        subscriberId: 'sub1',
        message: {
          id: 'inbound',
          text: 'hi',
          author: { userId: '777042' },
          raw: {
            reply_to_message: { message_id: 42 },
          },
        } as any,
        existingConversation: existingConversation as any,
      });

      expect(messageRepository.findOne.calledOnce).to.equal(true);
      expect(messageRepository.findOne.firstCall.args[0]).to.deep.equal({
        _environmentId: 'env1',
        _agentId: 'agent1',
        _subscriberId: 'subscriber-mongo-1',
        providerId: 'telegram',
        channel: ChannelTypeEnum.CHAT,
        _notificationId: { $exists: true, $ne: null },
        'channelData.endpoint.chatId': '777042',
        identifier: '42',
      });
      expect(messageRepository.find.called).to.equal(false);
      expect(result?.origin.identifier).to.equal('42');
      expect(result?.notificationId).to.equal(undefined);
    });

    it('resolves a nested raw.message.reply_to_message.message_id', async () => {
      const { service, messageRepository } = makeService({
        findOne: sinon.stub().resolves(telegramOrigin),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: telegramConfig as any,
        platformThreadId: 'telegram:777042',
        subscriberId: 'sub1',
        message: {
          id: 'inbound',
          text: 'hi',
          author: { userId: '777042' },
          raw: {
            message: {
              reply_to_message: { message_id: 42 },
            },
          },
        } as any,
        existingConversation: null,
      });

      expect(messageRepository.findOne.calledOnce).to.equal(true);
      expect(messageRepository.findOne.firstCall.args[0].identifier).to.equal('42');
      expect(result?.origin).to.equal(telegramOrigin);
    });

    it('catch-up hydrates an existing conversation when the origin is not hydrated yet', async () => {
      const existingConversation = {
        ...conversation,
        lastActivityAt: new Date(Date.now() - 3_600_000).toISOString(),
        participants: [{ type: 'subscriber', id: 'sub1' }],
      };
      const { service, messageRepository, conversationService } = makeService({
        find: sinon.stub().resolves([telegramOrigin]),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: telegramConfig as any,
        platformThreadId: 'telegram:777042',
        subscriberId: 'sub1',
        message: { id: 'inbound', text: 'hi', author: { userId: '777042' }, raw: {} } as any,
        existingConversation: existingConversation as any,
      });

      expect(messageRepository.find.calledOnce).to.equal(true);
      expect(conversationService.isWorkflowOriginHydrated.firstCall.args).to.deep.equal([
        'env1',
        'conversation1',
        '777042:42',
      ]);
      expect(result).to.deep.equal({ origin: telegramOrigin, notificationId: undefined });
    });

    it('skips an origin already hydrated into the conversation', async () => {
      const existingConversation = {
        ...conversation,
        lastActivityAt: new Date(Date.now() - 3_600_000).toISOString(),
        participants: [{ type: 'subscriber', id: 'sub1' }],
      };
      const { service } = makeService({
        find: sinon.stub().resolves([telegramOrigin]),
        isWorkflowOriginHydrated: sinon.stub().resolves(true),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: telegramConfig as any,
        platformThreadId: 'telegram:777042',
        subscriberId: 'sub1',
        message: { id: 'inbound', text: 'hi', author: { userId: '777042' }, raw: {} } as any,
        existingConversation: existingConversation as any,
      });

      expect(result).to.equal(null);
    });

    it('re-resolves an unhydrated origin so a failed hydration is retried', async () => {
      const existingConversation = {
        ...conversation,
        lastActivityAt: new Date().toISOString(),
        participants: [{ type: 'subscriber', id: 'sub1' }],
      };
      const { service } = makeService({
        find: sinon.stub().resolves([telegramOrigin]),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: telegramConfig as any,
        platformThreadId: 'telegram:777042',
        subscriberId: 'sub1',
        message: { id: 'inbound', text: 'again', author: { userId: '777042' }, raw: {} } as any,
        existingConversation: existingConversation as any,
      });

      expect(result?.origin).to.equal(telegramOrigin);
    });

    it('resolves on action turns without a message using latest-by-subscriber', async () => {
      const { service, messageRepository } = makeService({
        find: sinon.stub().resolves([telegramOrigin]),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: telegramConfig as any,
        platformThreadId: 'telegram:777042',
        subscriberId: 'sub1',
        message: null,
        existingConversation: null,
      });

      expect(messageRepository.find.calledOnce).to.equal(true);
      expect(result?.notificationId).to.equal('tg-notif1');
    });

    it('scopes a forum-topic thread id to the chat id', async () => {
      const { service, messageRepository } = makeService({
        find: sinon.stub().resolves([telegramOrigin]),
      });

      await service.resolve({
        agentId: 'agent1',
        config: telegramConfig as any,
        platformThreadId: 'telegram:-100123:45',
        subscriberId: 'sub1',
        message: { id: 'inbound', text: 'hi', author: { userId: '777042' }, raw: {} } as any,
        existingConversation: null,
      });

      expect(messageRepository.find.firstCall.args[0]['channelData.endpoint.chatId']).to.equal('-100123');
    });

    it('fails closed when the thread id is unparseable', async () => {
      const { service, messageRepository } = makeService({
        find: sinon.stub().resolves([telegramOrigin]),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: telegramConfig as any,
        platformThreadId: 'not-telegram:777042',
        subscriberId: 'sub1',
        message: { id: 'inbound', text: 'hi', author: { userId: '777042' }, raw: {} } as any,
        existingConversation: null,
      });

      expect(result).to.equal(null);
      expect(messageRepository.find.called).to.equal(false);
      expect(messageRepository.findOne.called).to.equal(false);
    });

    it('hydrates using the composite chatId:message_id as platformMessageId', async () => {
      const { service, conversationService } = makeService({
        notificationFindOne: sinon.stub().resolves({ payload: { orderId: 'ORD-9' } }),
      });

      const originData = await service.hydrate({
        agentId: 'agent1',
        config: telegramConfig as any,
        conversation: conversation as any,
        platformThreadId: 'telegram:777042',
        origin: telegramOrigin as any,
      });

      expect(conversationService.persistWorkflowOriginHydration.firstCall.args[0].platformMessageId).to.equal(
        '777042:42'
      );
      expect(
        conversationService.persistWorkflowOriginHydration.firstCall.args[0].signalData.workflowIdentifier
      ).to.equal('order-alerts');
      expect(originData?.data.workflowIdentifier).to.equal('order-alerts');
      expect(originData?.data.payload).to.deep.equal({ orderId: 'ORD-9' });
      expect(originData?.source).to.equal('hydrated');
    });

    it('no-ops hydrate when the thread id is unparseable', async () => {
      const { service, conversationService } = makeService({
        notificationFindOne: sinon.stub().resolves({ payload: { orderId: 'ORD-9' } }),
      });

      const content = await service.hydrate({
        agentId: 'agent1',
        config: telegramConfig as any,
        conversation: conversation as any,
        platformThreadId: 'not-telegram:777042',
        origin: telegramOrigin as any,
      });

      expect(conversationService.persistWorkflowOriginHydration.called).to.equal(false);
      expect(content).to.equal(null);
    });

    it('is fail-soft when lookup throws', async () => {
      const { service, logger } = makeService({
        find: sinon.stub().rejects(new Error('mongo timeout')),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: telegramConfig as any,
        platformThreadId: 'telegram:777042',
        subscriberId: 'sub1',
        message: { id: 'inbound', text: 'hi', author: { userId: '777042' }, raw: {} } as any,
        existingConversation: null,
      });

      expect(result).to.equal(null);
      expect(logger.warn.calledOnce).to.equal(true);
    });
  });

  describe('Sendblue', () => {
    const USER_PHONE = '+19998887777';
    const sendblueDmThreadId = 'sendblue:+15122164639:+19998887777';
    const sendblueGroupThreadId = 'sendblue:+15122164639:g:group-1';

    const sendblueConfig = {
      environmentId: 'env1',
      organizationId: 'org1',
      platform: AgentPlatformEnum.SENDBLUE,
      agentIdentifier: 'support-agent',
      providerId: 'sendblue',
    };

    const sendblueOrigin = {
      _id: 'sb-msg1',
      _notificationId: 'sb-notif1',
      _jobId: 'sb-job1',
      transactionId: 'sb-txn1',
      templateIdentifier: 'order-alerts',
      stepId: 'chat-1',
      content: 'Your order shipped',
      identifier: 'sb-handle-abc123',
      createdAt: new Date(Date.now() - 60_000).toISOString(),
      providerId: 'sendblue',
    };

    it('hydrates the latest agent-attributed Sendblue origin on a new conversation', async () => {
      const { service, messageRepository } = makeService({
        find: sinon.stub().resolves([sendblueOrigin]),
      });

      const before = Date.now();
      const result = await service.resolve({
        agentId: 'agent1',
        config: sendblueConfig as any,
        platformThreadId: sendblueDmThreadId,
        subscriberId: 'sub1',
        message: { id: 'inbound', text: 'hi', author: { userId: USER_PHONE }, raw: {} } as any,
        existingConversation: null,
      });
      const after = Date.now();

      expect(messageRepository.find.calledOnce).to.equal(true);
      const [query, , options] = messageRepository.find.firstCall.args;
      expect(query).to.include({
        _environmentId: 'env1',
        _agentId: 'agent1',
        _subscriberId: 'subscriber-mongo-1',
        providerId: 'sendblue',
      });
      expect(query.createdAt.$gt.getTime()).to.be.at.least(before - WORKFLOW_ORIGIN_LOOKBACK_MS - 5);
      expect(query.createdAt.$gt.getTime()).to.be.at.most(after - WORKFLOW_ORIGIN_LOOKBACK_MS + 5);
      expect(query._notificationId).to.deep.equal({ $exists: true, $ne: null });
      expect(options).to.deep.equal({ sort: { createdAt: -1 }, limit: 1 });
      expect(result).to.deep.equal({ origin: sendblueOrigin, notificationId: 'sb-notif1' });
    });

    it('catch-up hydrates an existing conversation when the origin is not hydrated yet', async () => {
      const existingConversation = {
        ...conversation,
        lastActivityAt: new Date(Date.now() - 3_600_000).toISOString(),
        participants: [{ type: 'subscriber', id: 'sub1' }],
      };
      const { service, messageRepository, conversationService } = makeService({
        find: sinon.stub().resolves([sendblueOrigin]),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: sendblueConfig as any,
        platformThreadId: sendblueDmThreadId,
        subscriberId: 'sub1',
        message: { id: 'inbound', text: 'hi', author: { userId: USER_PHONE }, raw: {} } as any,
        existingConversation: existingConversation as any,
      });

      expect(messageRepository.find.calledOnce).to.equal(true);
      expect(conversationService.isWorkflowOriginHydrated.firstCall.args).to.deep.equal([
        'env1',
        'conversation1',
        sendblueOrigin.identifier,
      ]);
      expect(result).to.deep.equal({ origin: sendblueOrigin, notificationId: undefined });
    });

    it('skips an origin already hydrated into the conversation', async () => {
      const existingConversation = {
        ...conversation,
        lastActivityAt: new Date(Date.now() - 3_600_000).toISOString(),
        participants: [{ type: 'subscriber', id: 'sub1' }],
      };
      const { service } = makeService({
        find: sinon.stub().resolves([sendblueOrigin]),
        isWorkflowOriginHydrated: sinon.stub().resolves(true),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: sendblueConfig as any,
        platformThreadId: sendblueDmThreadId,
        subscriberId: 'sub1',
        message: { id: 'inbound', text: 'hi', author: { userId: USER_PHONE }, raw: {} } as any,
        existingConversation: existingConversation as any,
      });

      expect(result).to.equal(null);
    });

    it('skips group threads without looking up an origin', async () => {
      const { service, messageRepository } = makeService({
        find: sinon.stub().resolves([sendblueOrigin]),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: sendblueConfig as any,
        platformThreadId: sendblueGroupThreadId,
        subscriberId: 'sub1',
        message: { id: 'inbound', text: 'hi', author: { userId: USER_PHONE }, raw: {} } as any,
        existingConversation: null,
      });

      expect(messageRepository.find.called).to.equal(false);
      expect(messageRepository.findOne.called).to.equal(false);
      expect(result).to.equal(null);
    });

    it('hydrates using the bare message_handle as platformMessageId', async () => {
      const { service, conversationService } = makeService({
        notificationFindOne: sinon.stub().resolves({ payload: { orderId: 'ORD-9' } }),
      });

      await service.hydrate({
        agentId: 'agent1',
        config: sendblueConfig as any,
        conversation: conversation as any,
        platformThreadId: sendblueDmThreadId,
        origin: sendblueOrigin as any,
      });

      expect(conversationService.persistWorkflowOriginHydration.firstCall.args[0].platformMessageId).to.equal(
        sendblueOrigin.identifier
      );
      expect(
        conversationService.persistWorkflowOriginHydration.firstCall.args[0].signalData.workflowIdentifier
      ).to.equal('order-alerts');
    });

    it('ignores quote-reply context and uses latest-by-subscriber only', async () => {
      const { service, messageRepository } = makeService({
        find: sinon.stub().resolves([sendblueOrigin]),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: sendblueConfig as any,
        platformThreadId: sendblueDmThreadId,
        subscriberId: 'sub1',
        message: {
          id: 'inbound',
          text: 'hi',
          author: { userId: USER_PHONE },
          raw: {
            message: {
              context: { id: 'sb-handle-quoted' },
            },
          },
        } as any,
        existingConversation: null,
      });

      expect(messageRepository.findOne.called).to.equal(false);
      expect(messageRepository.find.calledOnce).to.equal(true);
      expect(result?.origin.identifier).to.equal(sendblueOrigin.identifier);
    });
  });

  describe('Teams', () => {
    const teamsDmThreadId = 'teams:YToxMjM:aHR0cHM6Ly9zbWJhLnRyYWZmaWNtYW5hZ2VyLm5ldC90ZWFtcw';
    const teamsConfig = {
      environmentId: 'env1',
      organizationId: 'org1',
      platform: AgentPlatformEnum.TEAMS,
      agentIdentifier: 'support-agent',
      providerId: 'msteams',
    };

    const teamsOrigin = {
      _id: 'teams-msg1',
      _notificationId: 'teams-notif1',
      _jobId: 'teams-job1',
      transactionId: 'teams-txn1',
      templateIdentifier: 'order-alerts',
      stepId: 'chat-1',
      content: 'Your order shipped',
      identifier: 'activity-abc123',
      createdAt: new Date(Date.now() - 60_000).toISOString(),
      providerId: 'msteams',
    };

    it('hydrates the latest ms_teams_user origin on a new DM conversation', async () => {
      const { service, messageRepository } = makeService({
        find: sinon.stub().resolves([teamsOrigin]),
      });

      const before = Date.now();
      const result = await service.resolve({
        agentId: 'agent1',
        config: teamsConfig as any,
        platformThreadId: teamsDmThreadId,
        subscriberId: 'sub1',
        message: { id: 'inbound', text: 'hi', author: { userId: '29:user1' }, raw: {} } as any,
        existingConversation: null,
        isDirectMessage: true,
      });
      const after = Date.now();

      expect(messageRepository.find.calledOnce).to.equal(true);
      const [query, , options] = messageRepository.find.firstCall.args;
      expect(query).to.include({
        _environmentId: 'env1',
        _agentId: 'agent1',
        _subscriberId: 'subscriber-mongo-1',
        providerId: 'msteams',
        channel: ChannelTypeEnum.CHAT,
        'channelData.type': ENDPOINT_TYPES.MS_TEAMS_USER,
      });
      expect(query._notificationId).to.deep.equal({ $exists: true, $ne: null });
      expect(query.createdAt.$gt.getTime()).to.be.at.least(before - WORKFLOW_ORIGIN_LOOKBACK_MS - 5);
      expect(query.createdAt.$gt.getTime()).to.be.at.most(after - WORKFLOW_ORIGIN_LOOKBACK_MS + 5);
      expect(options).to.deep.equal({ sort: { createdAt: -1 }, limit: 1 });
      expect(result).to.deep.equal({ origin: teamsOrigin, notificationId: 'teams-notif1' });
    });

    it('prefers a quotedReply entity messageId over latest-by-subscriber and bypasses the catch-up window', async () => {
      const lastActivityAt = new Date().toISOString();
      const existingConversation = {
        ...conversation,
        lastActivityAt,
        participants: [{ type: 'subscriber', id: 'sub1' }],
      };
      const { service, messageRepository } = makeService({
        findOne: sinon.stub().resolves({
          ...teamsOrigin,
          createdAt: new Date(Date.now() - 86_400_000).toISOString(),
        }),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: teamsConfig as any,
        platformThreadId: teamsDmThreadId,
        subscriberId: 'sub1',
        message: {
          id: 'inbound',
          text: 'hi',
          author: { userId: '29:user1' },
          raw: {
            entities: [
              { type: 'clientInfo' },
              { type: 'quotedReply', quotedReply: { messageId: teamsOrigin.identifier } },
            ],
          },
        } as any,
        existingConversation: existingConversation as any,
        isDirectMessage: true,
      });

      expect(messageRepository.findOne.calledOnce).to.equal(true);
      expect(messageRepository.findOne.firstCall.args[0]).to.deep.equal({
        _environmentId: 'env1',
        _agentId: 'agent1',
        _subscriberId: 'subscriber-mongo-1',
        providerId: 'msteams',
        channel: ChannelTypeEnum.CHAT,
        _notificationId: { $exists: true, $ne: null },
        'channelData.type': ENDPOINT_TYPES.MS_TEAMS_USER,
        identifier: teamsOrigin.identifier,
      });
      expect(messageRepository.find.called).to.equal(false);
      expect(result?.origin.identifier).to.equal(teamsOrigin.identifier);
      expect(result?.notificationId).to.equal(undefined);
    });

    it('falls back to replyToId when no quotedReply entity is present', async () => {
      const { service, messageRepository } = makeService({
        findOne: sinon.stub().resolves(teamsOrigin),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: teamsConfig as any,
        platformThreadId: teamsDmThreadId,
        subscriberId: 'sub1',
        message: {
          id: 'inbound',
          text: 'hi',
          author: { userId: '29:user1' },
          raw: { replyToId: teamsOrigin.identifier },
        } as any,
        existingConversation: null,
        isDirectMessage: true,
      });

      expect(messageRepository.findOne.calledOnce).to.equal(true);
      expect(messageRepository.findOne.firstCall.args[0].identifier).to.equal(teamsOrigin.identifier);
      expect(messageRepository.find.called).to.equal(false);
      expect(result?.origin.identifier).to.equal(teamsOrigin.identifier);
    });

    it('catch-up hydrates an existing DM conversation when the origin is not hydrated yet', async () => {
      const existingConversation = {
        ...conversation,
        lastActivityAt: new Date(Date.now() - 3_600_000).toISOString(),
        participants: [{ type: 'subscriber', id: 'sub1' }],
      };
      const { service, messageRepository, conversationService } = makeService({
        find: sinon.stub().resolves([teamsOrigin]),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: teamsConfig as any,
        platformThreadId: teamsDmThreadId,
        subscriberId: 'sub1',
        message: { id: 'inbound', text: 'hi', author: { userId: '29:user1' }, raw: {} } as any,
        existingConversation: existingConversation as any,
        isDirectMessage: true,
      });

      expect(messageRepository.find.calledOnce).to.equal(true);
      expect(conversationService.isWorkflowOriginHydrated.firstCall.args).to.deep.equal([
        'env1',
        'conversation1',
        teamsOrigin.identifier,
      ]);
      expect(result).to.deep.equal({ origin: teamsOrigin, notificationId: undefined });
    });

    it('skips an origin already hydrated into the conversation', async () => {
      const existingConversation = {
        ...conversation,
        lastActivityAt: new Date(Date.now() - 3_600_000).toISOString(),
        participants: [{ type: 'subscriber', id: 'sub1' }],
      };
      const { service } = makeService({
        find: sinon.stub().resolves([teamsOrigin]),
        isWorkflowOriginHydrated: sinon.stub().resolves(true),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: teamsConfig as any,
        platformThreadId: teamsDmThreadId,
        subscriberId: 'sub1',
        message: { id: 'inbound', text: 'hi', author: { userId: '29:user1' }, raw: {} } as any,
        existingConversation: existingConversation as any,
        isDirectMessage: true,
      });

      expect(result).to.equal(null);
    });

    it('fails closed for non-DM turns without looking up an origin', async () => {
      const { service, messageRepository } = makeService({
        find: sinon.stub().resolves([teamsOrigin]),
      });

      for (const isDirectMessage of [false, undefined] as const) {
        messageRepository.find.resetHistory();
        messageRepository.findOne.resetHistory();

        const result = await service.resolve({
          agentId: 'agent1',
          config: teamsConfig as any,
          platformThreadId: teamsDmThreadId,
          subscriberId: 'sub1',
          message: { id: 'inbound', text: 'hi', author: { userId: '29:user1' }, raw: {} } as any,
          existingConversation: null,
          ...(isDirectMessage === undefined ? {} : { isDirectMessage }),
        });

        expect(result).to.equal(null);
        expect(messageRepository.find.called).to.equal(false);
        expect(messageRepository.findOne.called).to.equal(false);
      }
    });

    it('resolves on action turns without a message using latest-by-subscriber', async () => {
      const { service, messageRepository } = makeService({
        find: sinon.stub().resolves([teamsOrigin]),
      });

      const result = await service.resolve({
        agentId: 'agent1',
        config: teamsConfig as any,
        platformThreadId: teamsDmThreadId,
        subscriberId: 'sub1',
        message: null,
        existingConversation: null,
        isDirectMessage: true,
      });

      expect(messageRepository.find.calledOnce).to.equal(true);
      expect(result?.notificationId).to.equal('teams-notif1');
    });

    it('scopes the origin lookup to the resolved subscriber', async () => {
      const { service, messageRepository } = makeService({
        findBySubscriberId: sinon.stub().resolves({ _id: 'attacker-mongo' }),
        find: sinon.stub().resolves([]),
      });

      await service.resolve({
        agentId: 'agent1',
        config: teamsConfig as any,
        platformThreadId: teamsDmThreadId,
        subscriberId: 'attacker-subscriber',
        message: { id: 'inbound', text: 'hi', author: { userId: '29:user1' }, raw: {} } as any,
        existingConversation: null,
        isDirectMessage: true,
      });

      expect(messageRepository.find.firstCall.args[0]._subscriberId).to.equal('attacker-mongo');
    });

    it('hydrates using the bare activity id as platformMessageId', async () => {
      const { service, conversationService } = makeService({
        notificationFindOne: sinon.stub().resolves({ payload: { orderId: 'ORD-9' } }),
      });

      await service.hydrate({
        agentId: 'agent1',
        config: teamsConfig as any,
        conversation: conversation as any,
        platformThreadId: teamsDmThreadId,
        origin: teamsOrigin as any,
      });

      expect(conversationService.persistWorkflowOriginHydration.firstCall.args[0].platformMessageId).to.equal(
        teamsOrigin.identifier
      );
      expect(
        conversationService.persistWorkflowOriginHydration.firstCall.args[0].signalData.workflowIdentifier
      ).to.equal('order-alerts');
    });
  });
});

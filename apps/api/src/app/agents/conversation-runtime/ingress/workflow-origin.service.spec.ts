import { ChannelTypeEnum } from '@novu/shared';
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
          _jobId: 'job1',
          transactionId: 'txn1',
          templateIdentifier: 'order-alerts',
          stepId: 'chat-1',
          content: 'Order ORD-1 shipped',
          identifier: 'D123:1777837477.371619',
        } as any,
      });

      expect(notificationRepository.findOne.calledOnce).to.equal(true);
      expect(conversationService.persistWorkflowOriginHydration.calledOnce).to.equal(true);
      const hydrateArgs = conversationService.persistWorkflowOriginHydration.firstCall.args[0];
      expect(hydrateArgs.platformMessageId).to.equal('1777837477.371619');
      expect(hydrateArgs.messageContent).to.equal(
        'Order ORD-1 shipped\n\nAdditional data for this message:\n{\n  "orderId": "ORD-1"\n}'
      );
      expect(hydrateArgs.signalData.workflowIdentifier).to.equal('order-alerts');
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

      await service.hydrate({
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
    });

    it('no-ops hydrate when the thread id is unparseable', async () => {
      const { service, conversationService } = makeService({
        notificationFindOne: sinon.stub().resolves({ payload: { orderId: 'ORD-9' } }),
      });

      await service.hydrate({
        agentId: 'agent1',
        config: telegramConfig as any,
        conversation: conversation as any,
        platformThreadId: 'not-telegram:777042',
        origin: telegramOrigin as any,
      });

      expect(conversationService.persistWorkflowOriginHydration.called).to.equal(false);
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
});

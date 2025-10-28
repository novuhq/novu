import { Novu } from '@novu/api';
import { QueryBuilder, Trace, TraceLogRepository } from '@novu/application-generic';
import {
  IntegrationEntity,
  IntegrationRepository,
  MessageEntity,
  MessageRepository,
  NotificationTemplateEntity,
  SubscriberRepository,
} from '@novu/dal';
import { ChannelTypeEnum, PushProviderIdEnum, StepTypeEnum } from '@novu/shared';
import { PushEventStatusEnum } from '@novu/stateless';
import { NotificationTemplateService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../../src/app/shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Process Inbound Webhook E2E #novu-v2', () => {
  let session: UserSession;
  let integrationRepository: IntegrationRepository;
  let messageRepository: MessageRepository;
  let subscriberRepository: SubscriberRepository;
  let traceLogRepository: TraceLogRepository;
  let integration: IntegrationEntity;
  let message: MessageEntity;
  let template: NotificationTemplateEntity;
  let novuClient: Novu;

  before(() => {
    (process.env as any).IS_TRACE_LOGS_ENABLED = 'true';
  });

  after(() => {
    delete (process.env as any).IS_TRACE_LOGS_ENABLED;
  });

  const mockWebhookBody = {
    eventId: 'A0E2DB50-21D8-4F99-93C9-2BC0A4D32228',
    eventType: 'clicked',
    app_version: '1.0.0',
    appState: 'active',
    content: {
      body: 'Test notification body',
      title: 'Test title',
    },
    device_id: '531E306C-A900-4164-AACF-91948F9B4CCE',
    expoPushToken: 'ExponentPushToken[Dy4R0HK8GkSD8NDlqMzM9w]',
    notificationId: 'A0E2DB50-21D8-4F99-93C9-2BC0A4D32228',
    platform: 'ios',
    timestamp: '2025-09-21T20:02:35.103Z',
  };

  const mockHeaders = {
    'content-type': 'application/json',
  };

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    integrationRepository = session.testServer?.getService(IntegrationRepository);
    messageRepository = session.testServer?.getService(MessageRepository);
    traceLogRepository = session.testServer?.getService(TraceLogRepository);
    subscriberRepository = session.testServer?.getService(SubscriberRepository);

    const notificationTemplateService = new NotificationTemplateService(
      session.user._id,
      session.organization._id,
      session.environment._id
    );

    template = await notificationTemplateService.createTemplate({
      steps: [
        {
          type: StepTypeEnum.PUSH,
          content: 'Test push notification: {{title}}',
          title: 'Push Title: {{title}}',
        },
      ],
    });

    novuClient = initNovuClassSdk(session);

    // Disable the default FCM integration to avoid multiple push providers
    await integrationRepository.update(
      {
        _environmentId: session.environment._id,
        providerId: PushProviderIdEnum.FCM,
      },
      { active: false }
    );

    integration = await integrationRepository.create({
      name: 'Test Expo Integration',
      identifier: 'expo-test',
      providerId: PushProviderIdEnum.EXPO,
      channel: ChannelTypeEnum.PUSH,
      credentials: {
        apiKey: 'test-access-token',
      },
      configurations: {
        inboundWebhookEnabled: true,
      },
      active: true,
      primary: true,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    await novuClient.subscribers.credentials.update(
      {
        providerId: PushProviderIdEnum.EXPO,
        credentials: {
          deviceTokens: ['ExponentPushToken[Dy4RN4K8GkSD8NDlqMzM9w]'],
        },
      },
      session.subscriberId
    );

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [
        {
          subscriberId: session.subscriberId,
        },
      ],
      payload: {
        title: 'Test notification body',
      },
    });

    await session.waitForJobCompletion(template._id);

    const subscriber = await subscriberRepository.findOne({
      _organizationId: session.organization._id,
      subscriberId: session.subscriberId,
    });

    if (!subscriber) {
      throw new Error('Subscriber not found');
    }

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      providerId: PushProviderIdEnum.EXPO,
    });

    expect(messages.length, 'triggered messages length should be 1').to.equal(1);
    message = messages[0];
  });

  describe('POST /v2/inbound-webhooks/delivery-providers/:environmentId/:integrationId', () => {
    it('should successfully process a push webhook with clicked event', async () => {
      const eventPayload = { ...mockWebhookBody, eventId: message?.identifier };
      const response = await novuClient.activity.track({
        environmentId: session.environment._id,
        integrationId: integration._id,
        requestBody: eventPayload,
      });

      expect(response).to.have.length(1);
      expect(response[0]).to.have.property('id', eventPayload.eventId);
      expect(response[0].event).to.have.property('status', PushEventStatusEnum.CLICKED);
      const parsedRow = JSON.parse((response[0].event as any).row);
      expect(parsedRow).to.deep.equal(eventPayload);

      const updatedMessage = await messageRepository.findOne({
        _id: message._id,
        _environmentId: session.environment._id,
      });

      expect(updatedMessage?.seen).to.be.true;
      expect(updatedMessage?.lastSeenDate).to.be.a('string');

      const traceQueryBuilder = new QueryBuilder<Trace>({
        environmentId: session.environment._id,
      });
      traceQueryBuilder.whereEquals('organization_id', session.organization._id);
      traceQueryBuilder.whereEquals('entity_type', 'step_run');
      traceQueryBuilder.whereEquals('entity_id', message._jobId || '');
      traceQueryBuilder.whereEquals('external_subscriber_id', session.subscriberId || '');
      traceQueryBuilder.whereEquals('event_type', 'message_clicked');

      const traceResult = await traceLogRepository.find({
        where: traceQueryBuilder.build(),
        select: '*',
        limit: 10,
      });

      expect(traceResult.data).to.have.length(1);
      expect(
        traceResult.data.some((trace) => trace.event_type === 'message_clicked'),
        'message_clicked trace should be present'
      ).to.be.true;
    });
  });
});

import { generateKeyPairSync } from 'node:crypto';
import { Novu } from '@novu/api';
import { DetailEnum, QueryBuilder, Trace, TraceLogRepository } from '@novu/application-generic';
import {
  ExecutionDetailsRepository,
  IntegrationEntity,
  IntegrationRepository,
  MessageEntity,
  MessageRepository,
  NotificationTemplateEntity,
  SubscriberRepository,
} from '@novu/dal';
import { ChannelTypeEnum, ExecutionDetailsSourceEnum, PushProviderIdEnum, StepTypeEnum } from '@novu/shared';
import { PushEventStatusEnum } from '@novu/stateless';
import { NotificationTemplateService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Types } from 'mongoose';
import { initNovuClassSdk } from '../../../src/app/shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Process Inbound Webhook E2E #novu-v2', () => {
  let session: UserSession;
  let integrationRepository: IntegrationRepository;
  let messageRepository: MessageRepository;
  let subscriberRepository: SubscriberRepository;
  let traceLogRepository: TraceLogRepository;
  let executionDetailsRepository: ExecutionDetailsRepository;
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
    executionDetailsRepository = session.testServer?.getService(ExecutionDetailsRepository);

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

      const executionDetails = await executionDetailsRepository.find({
        _environmentId: session.environment._id,
        _jobId: message._jobId,
        source: ExecutionDetailsSourceEnum.WEBHOOK,
      });

      const clickedDetail = executionDetails.find((detail) => detail.detail === DetailEnum.MESSAGE_CLICKED);
      expect(clickedDetail, 'webhook execution detail should be persisted in MongoDB').to.exist;
      expect(clickedDetail?.source).to.equal(ExecutionDetailsSourceEnum.WEBHOOK);
      expect(clickedDetail?.webhookStatus).to.equal(PushEventStatusEnum.CLICKED);
      // `raw` must be single-encoded so the Activity Feed renders it as an object, not an escaped string
      expect(JSON.parse(clickedDetail?.raw as string)).to.deep.equal(eventPayload);
    });

    it('should not write MongoDB execution details when IS_EXECUTION_DETAILS_CLICKHOUSE_ONLY_ENABLED is enabled', async () => {
      (process.env as any).IS_EXECUTION_DETAILS_CLICKHOUSE_ONLY_ENABLED = 'true';

      try {
        const eventPayload = { ...mockWebhookBody, eventId: message?.identifier };
        await novuClient.activity.track({
          environmentId: session.environment._id,
          integrationId: integration._id,
          requestBody: eventPayload,
        });

        const webhookExecutionDetails = await executionDetailsRepository.find({
          _environmentId: session.environment._id,
          _jobId: message._jobId,
          source: ExecutionDetailsSourceEnum.WEBHOOK,
        });

        expect(
          webhookExecutionDetails,
          'no webhook execution detail should be written when clickhouse-only is enabled'
        ).to.have.length(0);

        // We only skip the Mongo leg: the ClickHouse trace must still be written.
        const traceQueryBuilder = new QueryBuilder<Trace>({
          environmentId: session.environment._id,
        });
        traceQueryBuilder.whereEquals('organization_id', session.organization._id);
        traceQueryBuilder.whereEquals('entity_type', 'step_run');
        traceQueryBuilder.whereEquals('entity_id', message._jobId || '');
        traceQueryBuilder.whereEquals('event_type', 'message_clicked');

        const traceResult = await traceLogRepository.find({
          where: traceQueryBuilder.build(),
          select: '*',
          limit: 10,
        });

        expect(
          traceResult.data.some((trace) => trace.event_type === 'message_clicked'),
          'message_clicked trace should still be written when clickhouse-only is enabled'
        ).to.be.true;
      } finally {
        delete (process.env as any).IS_EXECUTION_DETAILS_CLICKHOUSE_ONLY_ENABLED;
      }
    });
  });
});

function buildFakeFcmServiceAccount(): string {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  return JSON.stringify({
    project_id: 'test-project',
    client_email: 'firebase-adminsdk@test-project.iam.gserviceaccount.com',
    private_key: privateKey,
  });
}

function buildFakeApnsKey(): string {
  const { privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  return privateKey;
}

describe('Process Inbound Webhook push providers E2E #novu-v2', () => {
  const fakeFcmServiceAccount = buildFakeFcmServiceAccount();
  const fakeApnsKey = buildFakeApnsKey();

  const providerCases: Array<{
    providerId: PushProviderIdEnum;
    credentials: Record<string, string>;
  }> = [
    {
      providerId: PushProviderIdEnum.FCM,
      credentials: {
        serviceAccount: fakeFcmServiceAccount,
      },
    },
    {
      providerId: PushProviderIdEnum.PushWebhook,
      credentials: {
        webhookUrl: 'https://example.com/push-webhook',
        secretKey: 'test-hmac-secret',
      },
    },
    {
      providerId: PushProviderIdEnum.APNS,
      credentials: {
        secretKey: fakeApnsKey,
        apiKey: 'TESTKEYID1',
        projectName: 'TESTTEAMID',
        applicationId: 'co.novu.test',
      },
    },
    {
      providerId: PushProviderIdEnum.EXPO,
      credentials: {
        apiKey: 'test-expo-access-token',
      },
    },
    {
      providerId: PushProviderIdEnum.OneSignal,
      credentials: {
        apiKey: 'test-onesignal-api-key',
        applicationId: 'test-onesignal-app-id',
      },
    },
    {
      providerId: PushProviderIdEnum.PusherBeams,
      credentials: {
        instanceId: 'test-pusher-beams-instance',
        secretKey: 'test-pusher-beams-secret',
      },
    },
    {
      providerId: PushProviderIdEnum.Pushpad,
      credentials: {
        apiKey: 'test-pushpad-auth-token',
        applicationId: '841',
      },
    },
  ];

  for (const providerCase of providerCases) {
    it(`should process a clicked push activity event for ${providerCase.providerId}`, async () => {
      const session = new UserSession();
      await session.initialize();

      const integrationRepository = session.testServer?.getService(IntegrationRepository);
      const messageRepository = session.testServer?.getService(MessageRepository);
      const subscriberRepository = session.testServer?.getService(SubscriberRepository);
      const executionDetailsRepository = session.testServer?.getService(ExecutionDetailsRepository);
      const novuClient = initNovuClassSdk(session);

      await integrationRepository.update(
        {
          _environmentId: session.environment._id,
          providerId: PushProviderIdEnum.FCM,
        },
        { active: false }
      );

      const integration = await integrationRepository.create({
        name: `Test ${providerCase.providerId} Integration`,
        identifier: `${providerCase.providerId}-inbound-test`,
        providerId: providerCase.providerId,
        channel: ChannelTypeEnum.PUSH,
        credentials: providerCase.credentials,
        configurations: {
          inboundWebhookEnabled: true,
        },
        active: true,
        primary: true,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
      });

      const subscriber = await subscriberRepository.findOne({
        _organizationId: session.organization._id,
        subscriberId: session.subscriberId,
      });

      if (!subscriber) {
        throw new Error('Subscriber not found');
      }

      const template = await session.createTemplate({
        steps: [
          {
            type: StepTypeEnum.PUSH,
            content: 'Seeded push notification',
            title: 'Seeded push title',
          },
        ],
      });

      const messageIdentifier = `push-activity-${providerCase.providerId}-${Date.now()}`;
      const message = await messageRepository.create({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        _subscriberId: subscriber._id,
        _notificationId: template._id,
        _jobId: new Types.ObjectId().toString(),
        channel: ChannelTypeEnum.PUSH,
        providerId: providerCase.providerId,
        identifier: messageIdentifier,
        transactionId: `transaction-${providerCase.providerId}`,
        content: 'Seeded push notification',
        seen: false,
      });

      const eventPayload = {
        eventId: messageIdentifier,
        eventType: 'clicked',
        platform: 'ios',
      };

      const response = await novuClient.activity.track({
        environmentId: session.environment._id,
        integrationId: integration._id,
        requestBody: eventPayload,
      });

      expect(response).to.have.length(1);
      expect(response[0]).to.have.property('id', messageIdentifier);
      expect(response[0].event).to.have.property('status', PushEventStatusEnum.CLICKED);

      const updatedMessage = await messageRepository.findOne({
        _id: message._id,
        _environmentId: session.environment._id,
      });

      expect(updatedMessage?.seen).to.be.true;
      expect(updatedMessage?.lastSeenDate).to.be.a('string');

      const executionDetails = await executionDetailsRepository.find({
        _environmentId: session.environment._id,
        _jobId: message._jobId,
        source: ExecutionDetailsSourceEnum.WEBHOOK,
      });

      const clickedDetail = executionDetails.find((detail) => detail.detail === DetailEnum.MESSAGE_CLICKED);
      expect(clickedDetail, 'webhook execution detail should be persisted in MongoDB').to.exist;
      expect(clickedDetail?.webhookStatus).to.equal(PushEventStatusEnum.CLICKED);
      expect(JSON.parse(clickedDetail?.raw as string)).to.deep.equal(eventPayload);
    });
  }

  it('should reject push activity events for AppIO even when the toggle is set through the API', async () => {
    const session = new UserSession();
    await session.initialize();

    const integration = await session.testServer?.getService(IntegrationRepository).create({
      name: 'Test AppIO Integration',
      identifier: 'appio-inbound-test',
      providerId: PushProviderIdEnum.AppIO,
      channel: ChannelTypeEnum.PUSH,
      credentials: { AppIOBaseUrl: 'https://api.io.italia.it/api/v1' },
      configurations: {
        inboundWebhookEnabled: true,
      },
      active: true,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    const response = await session.testAgent
      .post(`/v2/inbound-webhooks/delivery-providers/${session.environment._id}/${integration._id}`)
      .set('Authorization', `ApiKey ${session.apiKey}`)
      .set('content-type', 'application/json')
      .send({ eventId: 'appio-message-identifier', eventType: 'clicked' })
      .expect(404);

    expect(response.body.message).to.equal(`Provider ${PushProviderIdEnum.AppIO} does not support inbound webhooks`);
  });
});

describe('Process Inbound Webhook auth E2E #novu-v2', () => {
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

  it('should reject push webhook when API key belongs to a different environment', async () => {
    const targetSession = new UserSession();
    await targetSession.initialize();

    const otherSession = new UserSession();
    await otherSession.initialize();

    const targetIntegrationRepository = targetSession.testServer?.getService(IntegrationRepository);

    await targetIntegrationRepository.update(
      {
        _environmentId: targetSession.environment._id,
        providerId: PushProviderIdEnum.FCM,
      },
      { active: false }
    );

    const targetIntegration = await targetIntegrationRepository.create({
      name: 'Test Expo Integration',
      identifier: 'expo-test-auth',
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
      _environmentId: targetSession.environment._id,
      _organizationId: targetSession.organization._id,
    });

    await targetSession.testAgent
      .post(`/v2/inbound-webhooks/delivery-providers/${targetSession.environment._id}/${targetIntegration._id}`)
      .set('Authorization', `Bearer ${otherSession.apiKey}`)
      .set('content-type', 'application/json')
      .send(mockWebhookBody)
      .expect(401);
  });
});

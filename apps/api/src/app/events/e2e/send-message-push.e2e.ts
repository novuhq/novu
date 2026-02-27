/** cspell:disable */
import { Novu } from '@novu/api';
import { WorkflowCreationSourceEnum } from '@novu/api/models/components';
import { DetailEnum } from '@novu/application-generic';
import {
  ExecutionDetailsRepository,
  IntegrationRepository,
  JobRepository,
  JobStatusEnum,
  MessageRepository,
  NotificationTemplateEntity,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  ExecutionDetailsStatusEnum,
  InboxCountTypeEnum,
  PushProviderIdEnum,
  StepTypeEnum,
} from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Trigger event - Send Push Notification - /v1/events/trigger (POST) #novu-v2', () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;

  const executionDetailsRepository = new ExecutionDetailsRepository();
  const integrationRepository = new IntegrationRepository();
  const messageRepository = new MessageRepository();
  const jobRepository = new JobRepository();
  let novuClient: Novu;

  before(async () => {
    session = new UserSession();
    await session.initialize();

    template = await session.createTemplate({
      steps: [
        {
          active: true,
          type: StepTypeEnum.PUSH,
          title: 'Title',
          content: 'Welcome to {{organizationName}}' as string,
        },
      ],
    });
    novuClient = initNovuClassSdk(session);
  });

  describe('Multiple providers active', () => {
    before(async () => {
      await novuClient.integrations.create({
        providerId: PushProviderIdEnum.EXPO,
        channel: ChannelTypeEnum.PUSH,
        credentials: { apiKey: '123' },
        environmentId: session.environment._id,
        active: true,
        check: false,
      });
    });

    afterEach(async () => {
      await executionDetailsRepository.delete({ _environmentId: session.environment._id });
    });

    it('should skip push step and not create any message if subscriber has no configured channel', async () => {
      await triggerEvent(template);

      await session.waitForJobCompletion(template._id);

      const messages = await messageRepository.find({
        _environmentId: session.environment._id,
        _templateId: template._id,
        _subscriberId: session.subscriberId,
      });

      expect(messages.length).to.equal(0);

      const executionDetails = await executionDetailsRepository.find({
        _environmentId: session.environment._id,
      });

      const noActiveChannel = executionDetails.find((ex) => ex.detail === DetailEnum.SUBSCRIBER_NO_ACTIVE_CHANNEL);
      expect(noActiveChannel).to.be.ok;
      expect(noActiveChannel?.providerId).to.equal('fcm');
      expect(noActiveChannel?.status).to.equal(ExecutionDetailsStatusEnum.WARNING);

      const jobs = await jobRepository.find({
        _environmentId: session.environment._id,
        _templateId: template._id,
        subscriberId: session.subscriberId,
        type: StepTypeEnum.PUSH,
      });

      expect(jobs.length).to.be.greaterThan(0);
      expect(jobs[0].status).to.equal(JobStatusEnum.CANCELED);
    });

    it('should not create any message if subscriber has configured two providers without device tokens', async () => {
      await updateCredentials(session.subscriberId, PushProviderIdEnum.FCM, []);
      await updateCredentials(session.subscriberId, PushProviderIdEnum.EXPO, []);

      await triggerEvent(template);

      await session.waitForJobCompletion(template._id);

      const messages = await messageRepository.find({
        _environmentId: session.environment._id,
        _templateId: template._id,
        _subscriberId: session.subscriberId,
      });

      expect(messages.length).to.equal(0);
    });

    it('should not create any message if subscriber has configured one provider without device tokens and the other has invalid device token', async () => {
      await updateCredentials(session.subscriberId, PushProviderIdEnum.FCM, ['invalidDeviceToken']);
      await updateCredentials(session.subscriberId, PushProviderIdEnum.EXPO, []);

      await triggerEvent(template);

      await session.waitForJobCompletion(template._id);

      const messages = await messageRepository.find({
        _environmentId: session.environment._id,
        _templateId: template._id,
        _subscriberId: session.subscriberId,
      });

      expect(messages.length, 'expected messages to be 0').to.equal(0);
    });
  });

  it('should send push notification with unread count', async () => {
    const oldPushUnreadCountFlag = process.env.IS_PUSH_UNREAD_COUNT_ENABLED;
    (process.env as Record<string, string>).IS_PUSH_UNREAD_COUNT_ENABLED = 'true';

    const { result: subscriber } = await novuClient.subscribers.create({
      subscriberId: 'test-subscriber-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    });
    await novuClient.integrations.create({
      providerId: PushProviderIdEnum.FCM,
      channel: ChannelTypeEnum.PUSH,
      credentials: {
        serviceAccount:
          '{"type":"service_account","project_id":"react-native-expo-fcm","private_key_id":"asdfas","private_key":"-----BEGIN PRIVATE KEY-----\\nasdf\\n-----END PRIVATE KEY-----\\n","client_email":"firebase-adminsdk-fsa@react-native-expo-fcm.iam.gserviceaccount.com","client_id":"asdf","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fsa@react-native-expo-fcm.iam.gserviceaccount.com","universe_domain":"googleapis.com"}',
      },
      environmentId: session.environment._id,
      active: true,
      check: false,
    });
    await updateCredentials(subscriber.subscriberId, PushProviderIdEnum.FCM, ['invalidDeviceToken']);
    await integrationRepository.update(
      {
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.IN_APP,
      },
      { connected: true, primary: true }
    );
    await integrationRepository.update(
      {
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.PUSH,
        providerId: PushProviderIdEnum.FCM,
      },
      { configurations: { inboxCount: InboxCountTypeEnum.UNREAD } }
    );

    const inAppWorkflow = await novuClient.workflows.create({
      name: 'In App Workflow',
      description: 'In App Workflow',
      workflowId: 'in-app-workflow',
      active: true,
      source: WorkflowCreationSourceEnum.Dashboard,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          name: 'In App Step',
          controlValues: {
            subject: 'In App Subject',
            body: 'In App Body',
          },
        },
      ],
    });
    const inAppWorkflowId = inAppWorkflow.result.workflowId;

    const pushWorkflow = await novuClient.workflows.create({
      name: 'Push Workflow',
      description: 'Push Workflow',
      workflowId: 'push-workflow',
      active: true,
      source: WorkflowCreationSourceEnum.Dashboard,
      steps: [
        {
          type: StepTypeEnum.PUSH,
          name: 'Push Step',
          controlValues: {
            subject: 'Push Subject',
            body: 'Push Body',
          },
        },
      ],
    });
    const pushWorkflowId = pushWorkflow.result.workflowId;

    await novuClient.trigger({
      workflowId: inAppWorkflowId,
      to: [{ subscriberId: subscriber.subscriberId }],
      payload: {},
    });

    await novuClient.trigger({
      workflowId: inAppWorkflowId,
      to: [{ subscriberId: subscriber.subscriberId }],
      payload: {},
    });

    await session.waitForJobCompletion(inAppWorkflow.result.id);

    const inAppMessages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber.id,
      _templateId: inAppWorkflow.result.id,
      channel: ChannelTypeEnum.IN_APP,
    });

    expect(inAppMessages.length).to.equal(2);

    await novuClient.trigger({
      workflowId: pushWorkflowId,
      to: [{ subscriberId: subscriber.subscriberId }],
      payload: {},
    });

    await session.waitForJobCompletion(pushWorkflow.result.id);

    const pushMessages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber.id,
      _templateId: pushWorkflow.result.id,
      channel: ChannelTypeEnum.PUSH,
    });

    expect(pushMessages.length).to.equal(1);
    expect((pushMessages[0].overrides as any).android.notification.notificationCount).to.equal(2);
    expect((pushMessages[0].overrides as any).apns.payload.aps.badge).to.equal(2);

    (process.env as Record<string, string>).IS_PUSH_UNREAD_COUNT_ENABLED = oldPushUnreadCountFlag;
  });

  it('should send push notification using FCM topic override without device tokens', async () => {
    const { result: subscriber } = await novuClient.subscribers.create({
      subscriberId: 'test-subscriber-topic',
      email: 'test-topic@example.com',
      firstName: 'Test',
      lastName: 'Topic',
    });

    await novuClient.integrations.create({
      providerId: PushProviderIdEnum.FCM,
      channel: ChannelTypeEnum.PUSH,
      credentials: {
        serviceAccount:
          '{"type":"service_account","project_id":"react-native-expo-fcm","private_key_id":"asdfas","private_key":"-----BEGIN PRIVATE KEY-----\\nasdf\\n-----END PRIVATE KEY-----\\n","client_email":"firebase-adminsdk-fsa@react-native-expo-fcm.iam.gserviceaccount.com","client_id":"asdf","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fsa@react-native-expo-fcm.iam.gserviceaccount.com","universe_domain":"googleapis.com"}',
      },
      environmentId: session.environment._id,
      active: true,
      check: false,
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [{ subscriberId: subscriber.subscriberId }],
      payload: {},
      overrides: {
        providers: {
          fcm: {
            topic: 'topic-123',
          },
        },
      },
    });

    await session.waitForJobCompletion(template._id);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: subscriber.id,
    });

    expect(messages.length).to.equal(1);
    expect(messages[0].channel).to.equal(ChannelTypeEnum.PUSH);

    const executionDetails = await executionDetailsRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber.id,
    });

    const pushMissingTokensError = executionDetails.find(
      (ex) => ex.detail === DetailEnum.PUSH_MISSING_DEVICE_TOKENS && ex.providerId === PushProviderIdEnum.FCM
    );
    expect(pushMissingTokensError).to.not.be.ok;

    const messageCreated = executionDetails.find(
      (ex) => ex.detail === DetailEnum.MESSAGE_CREATED && ex.providerId === PushProviderIdEnum.FCM
    );
    expect(messageCreated).to.be.ok;
  });

  async function triggerEvent(template2) {
    await novuClient.trigger({
      workflowId: template2.triggers[0].identifier,
      to: [{ subscriberId: session.subscriberId }],
      payload: {},
    });
  }
  async function updateCredentials(subscriberId: string, providerId: PushProviderIdEnum, deviceTokens: string[]) {
    await novuClient.subscribers.credentials.update(
      {
        providerId,
        credentials: {
          deviceTokens,
          webhookUrl: 'https:www.someurl.com',
        },
      },
      subscriberId
    );
  }
});

import axios from 'axios';
import { expect } from 'chai';
import {
  ExecutionDetailsRepository,
  IntegrationRepository,
  MessageRepository,
  NotificationTemplateEntity,
} from '@novu/dal';
import { DetailEnum } from '@novu/application-generic';
import { ChannelTypeEnum, PushProviderIdEnum, StepTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';

const axiosInstance = axios.create();

const ORIGINAL_IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED;

describe('Trigger event - Send Push Notification - /v1/events/trigger (POST)', () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;

  const executionDetailsRepository = new ExecutionDetailsRepository();
  const integrationRepository = new IntegrationRepository();
  const messageRepository = new MessageRepository();

  before(async () => {
    process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = 'true';

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
  });

  after(() => {
    process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = ORIGINAL_IS_MULTI_PROVIDER_CONFIGURATION_ENABLED;
  });

  describe('Multiple providers active', () => {
    before(async () => {
      const payload = {
        providerId: PushProviderIdEnum.EXPO,
        channel: ChannelTypeEnum.PUSH,
        credentials: { apiKey: '123' },
        _environmentId: session.environment._id,
        active: true,
        check: false,
      };

      await session.testAgent.post('/v1/integrations').send(payload);

      const integrations = await integrationRepository.find({
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.PUSH,
        active: true,
      });

      expect(integrations.length).to.equal(2);
    });

    afterEach(async () => {
      await executionDetailsRepository.delete({ _environmentId: session.environment._id });
    });

    it('should not create any message if subscriber has no configured channel', async () => {
      await triggerEvent(session, template);

      await session.awaitRunningJobs(template._id);

      const messages = await messageRepository.find({
        _environmentId: session.environment._id,
        _templateId: template._id,
        _subscriberId: session.subscriberId,
      });

      expect(messages.length).to.equal(0);

      const executionDetails = await executionDetailsRepository.find({
        _environmentId: session.environment._id,
      });

      expect(executionDetails.length).to.equal(5);
      const noActiveChannel = executionDetails.find((ex) => ex.detail === DetailEnum.SUBSCRIBER_NO_ACTIVE_CHANNEL);
      expect(noActiveChannel).to.be.ok;
      expect(noActiveChannel?.providerId).to.equal('fcm');
      const genericError = executionDetails.find((ex) => ex.detail === DetailEnum.NOTIFICATION_ERROR);
      expect(genericError).to.be.ok;
    });

    it('should not create any message if subscriber has configured two providers without device tokens', async () => {
      await updateCredentials(session, session.subscriberId, PushProviderIdEnum.FCM, []);
      await updateCredentials(session, session.subscriberId, PushProviderIdEnum.EXPO, []);

      await triggerEvent(session, template);

      await session.awaitRunningJobs(template._id);

      const messages = await messageRepository.find({
        _environmentId: session.environment._id,
        _templateId: template._id,
        _subscriberId: session.subscriberId,
      });

      expect(messages.length).to.equal(0);

      const executionDetails = await executionDetailsRepository.find({
        _environmentId: session.environment._id,
      });

      expect(executionDetails.length).to.equal(6);
      const fcm = executionDetails.find(
        (ex) => ex.detail === DetailEnum.PUSH_MISSING_DEVICE_TOKENS && ex.providerId === PushProviderIdEnum.FCM
      );
      expect(fcm).to.be.ok;
      const expo = executionDetails.find(
        (ex) => ex.detail === DetailEnum.PUSH_MISSING_DEVICE_TOKENS && ex.providerId === PushProviderIdEnum.EXPO
      );
      expect(expo).to.be.ok;
      const genericError = executionDetails.find((ex) => ex.detail === DetailEnum.NOTIFICATION_ERROR);
      expect(genericError).to.be.ok;
    });

    it('should not create any message if subscriber has configured one provider without device tokens and the other has invalid device token', async () => {
      await updateCredentials(session, session.subscriberId, PushProviderIdEnum.FCM, ['invalidDeviceToken']);
      await updateCredentials(session, session.subscriberId, PushProviderIdEnum.EXPO, []);

      await triggerEvent(session, template);

      await session.awaitRunningJobs(template._id);

      const messages = await messageRepository.find({
        _environmentId: session.environment._id,
        _templateId: template._id,
        _subscriberId: session.subscriberId,
      });

      expect(messages.length).to.equal(0);

      const executionDetails = await executionDetailsRepository.find({
        _environmentId: session.environment._id,
      });

      expect(executionDetails.length).to.equal(8);
      const fcmMessageCreated = executionDetails.find(
        (ex) =>
          ex.detail === `${DetailEnum.MESSAGE_CREATED}: ${PushProviderIdEnum.FCM}` &&
          ex.providerId === PushProviderIdEnum.FCM
      );
      expect(fcmMessageCreated).to.be.ok;
      const fcmProviderError = executionDetails.find(
        (ex) => ex.detail === DetailEnum.PROVIDER_ERROR && ex.providerId === PushProviderIdEnum.FCM
      );
      expect(fcmProviderError).to.be.ok;

      const expo = executionDetails.find(
        (ex) => ex.detail === DetailEnum.PUSH_MISSING_DEVICE_TOKENS && ex.providerId === PushProviderIdEnum.EXPO
      );
      expect(expo).to.be.ok;
      const genericError = executionDetails.find((ex) => ex.detail === DetailEnum.NOTIFICATION_ERROR);
      expect(genericError).to.be.ok;
    });
  });
});

async function triggerEvent(session: UserSession, template: NotificationTemplateEntity) {
  await axiosInstance.post(
    `${session.serverUrl}/v1/events/trigger`,
    {
      name: template.triggers[0].identifier,
      to: [{ subscriberId: session.subscriberId }],
      payload: {},
    },
    {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    }
  );
}

async function updateCredentials(
  session: UserSession,
  subscriberId: string,
  providerId: PushProviderIdEnum,
  deviceTokens: string[]
) {
  await axiosInstance.put(
    `${session.serverUrl}/v1/subscribers/${subscriberId}/credentials`,
    {
      subscriberId,
      providerId,
      credentials: {
        deviceTokens,
      },
    },
    {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    }
  );
}

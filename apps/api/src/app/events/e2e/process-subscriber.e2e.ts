import { NotificationTemplateEntity, SubscriberEntity, MessageRepository } from '@novu/dal';
import { UserSession, SubscribersService } from '@novu/testing';
import { expect } from 'chai';
import axios from 'axios';
import { ChannelTypeEnum } from '@novu/shared';

const axiosInstance = axios.create();

describe('Trigger event - process subscriber /v1/events/trigger (POST)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const messageRepository = new MessageRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
  });

  it('should trigger only active steps', async function () {
    const newTemplate = await session.createTemplate({
      steps: [
        {
          active: true,
          type: ChannelTypeEnum.SMS,
          content: 'Welcome to {{organizationName}}' as string,
        },
        {
          active: true,
          type: ChannelTypeEnum.SMS,
          content: 'Welcome to {{organizationName}}' as string,
        },
        {
          active: false,
          type: ChannelTypeEnum.SMS,
          content: 'Welcome to {{organizationName}}' as string,
        },
      ],
    });

    await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        name: newTemplate.triggers[0].identifier,
        to: [{ subscriberId: subscriber.subscriberId, phone: '+972541111111' }],
        payload: {
          organizationName: 'Testing of Organization Name',
        },
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    await session.awaitRunningJobs();

    const message = await messageRepository._model.find({
      _environmentId: session.environment._id,
      _templateId: newTemplate._id,
      _subscriberId: subscriber._id,
      channel: ChannelTypeEnum.SMS,
    });

    expect(message.length).to.equal(2);
  });
});

import { NotificationTemplateEntity, SubscriberEntity, MessageRepository } from '@novu/dal';
import { UserSession, SubscribersService } from '@novu/testing';
import { expect } from 'chai';
import axios from 'axios';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { ISubscribersDefine } from '@novu/node';
import { SubscriberRepository } from '@novu/dal';

const axiosInstance = axios.create();

describe('Trigger event - process subscriber /v1/events/trigger (POST)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const subscriberRepository = new SubscriberRepository();
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
          type: StepTypeEnum.SMS,
          content: 'Welcome to {{organizationName}}' as string,
        },
        {
          active: true,
          type: StepTypeEnum.SMS,
          content: 'Welcome to {{organizationName}}' as string,
        },
        {
          active: false,
          type: StepTypeEnum.SMS,
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

    await session.awaitRunningJobs(newTemplate._id);

    const message = await messageRepository._model.find({
      _environmentId: session.environment._id,
      _templateId: newTemplate._id,
      _subscriberId: subscriber._id,
      channel: ChannelTypeEnum.SMS,
    });

    expect(message.length).to.equal(2);
  });

  it('should update a subscriber based on event', async function () {
    const payload: ISubscribersDefine = {
      subscriberId: subscriber.subscriberId,
      firstName: 'New Test Name',
      lastName: 'New Last of name',
      email: 'newtest@email.novu',
    };

    try {
      await axiosInstance.post(
        `${session.serverUrl}/v1/events/trigger`,
        {
          name: template.triggers[0].identifier,
          to: {
            ...payload,
          },
          payload: {},
        },
        {
          headers: {
            authorization: `ApiKey ${session.apiKey}`,
          },
        }
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }

    const createdSubscriber = await subscriberRepository.findBySubscriberId(
      session.environment._id,
      subscriber.subscriberId
    );

    expect(createdSubscriber.firstName).to.equal(payload.firstName);
    expect(createdSubscriber.lastName).to.equal(payload.lastName);
    expect(createdSubscriber.email).to.equal(payload.email);
  });
});

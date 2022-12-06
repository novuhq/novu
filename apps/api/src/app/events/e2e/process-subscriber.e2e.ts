import {
  NotificationTemplateEntity,
  SubscriberEntity,
  MessageRepository,
  SubscriberRepository,
  NotificationTemplateRepository,
} from '@novu/dal';
import { UserSession, SubscribersService } from '@novu/testing';
import { expect } from 'chai';
import axios from 'axios';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { ISubscribersDefine } from '@novu/node';
import { UpdateSubscriberPreferenceRequestDto } from '../../widgets/dtos/update-subscriber-preference-request.dto';
import { testCacheService } from '../../../../e2e/setup';

const axiosInstance = axios.create();

describe('Trigger event - process subscriber /v1/events/trigger (POST)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;

  const cacheService = testCacheService().cacheService;
  const subscriberRepository = new SubscriberRepository(cacheService);
  const messageRepository = new MessageRepository(cacheService);
  const notificationTemplateRepository = new NotificationTemplateRepository(cacheService);

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
          type: StepTypeEnum.IN_APP,
          content: 'Welcome to {{organizationName}}' as string,
        },
        {
          active: true,
          type: StepTypeEnum.IN_APP,
          content: 'Welcome to {{organizationName}}' as string,
        },
        {
          active: false,
          type: StepTypeEnum.IN_APP,
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

    const message = await messageRepository.find({
      _environmentId: session.environment._id,
      _templateId: newTemplate._id,
      _subscriberId: subscriber._id,
      channel: ChannelTypeEnum.IN_APP,
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

    await triggerEvent(session, template, payload);

    const createdSubscriber = await subscriberRepository.findBySubscriberId(
      session.environment._id,
      subscriber.subscriberId
    );

    expect(createdSubscriber.firstName).to.equal(payload.firstName);
    expect(createdSubscriber.lastName).to.equal(payload.lastName);
    expect(createdSubscriber.email).to.equal(payload.email);
  });

  it('should send only email trigger second time based on the subscriber preference', async function () {
    const payload: ISubscribersDefine = {
      subscriberId: session.subscriberId,
      firstName: 'New Test Name',
      lastName: 'New Last of name',
      email: 'newtest@email.novu',
    };

    await triggerEvent(session, template, payload);

    await session.awaitRunningJobs(template._id);

    const widgetSubscriber = await subscriberRepository.findBySubscriberId(
      session.environment._id,
      session.subscriberId
    );

    let message = await messageRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: widgetSubscriber._id,
    });

    expect(message.length).to.equal(2);

    const updateData = {
      channel: {
        type: ChannelTypeEnum.IN_APP,
        enabled: false,
      },
    };

    await updateSubscriberPreference(updateData, session.subscriberToken, template._id);

    await triggerEvent(session, template, payload);

    await session.awaitRunningJobs(template._id);

    message = await messageRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: widgetSubscriber._id,
    });

    expect(message.length).to.equal(3);
  });

  it('should ignore subscriber preference and send all triggers for system critical template', async function () {
    const payload: ISubscribersDefine = {
      subscriberId: session.subscriberId,
      firstName: 'New Test Name',
      lastName: 'New Last of name',
      email: 'newtest@email.novu',
    };

    await triggerEvent(session, template, payload);

    await session.awaitRunningJobs(template._id);

    const widgetSubscriber = await subscriberRepository.findBySubscriberId(
      session.environment._id,
      session.subscriberId
    );

    let message = await messageRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: widgetSubscriber._id,
    });

    expect(message.length).to.equal(2);

    const updateData = {
      channel: {
        type: ChannelTypeEnum.IN_APP,
        enabled: false,
      },
    };

    await updateSubscriberPreference(updateData, session.subscriberToken, template._id);

    await notificationTemplateRepository.update(
      {
        _id: template._id,
        _environmentId: session.environment._id,
      },
      {
        critical: true,
      }
    );

    await triggerEvent(session, template, payload);

    await session.awaitRunningJobs(template._id);

    message = await messageRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: widgetSubscriber._id,
    });

    expect(message.length).to.equal(4);
  });
});

async function triggerEvent(session, template, payload) {
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
}

async function updateSubscriberPreference(
  data: UpdateSubscriberPreferenceRequestDto,
  subscriberToken: string,
  templateId: string
) {
  return await axios.patch(`http://localhost:${process.env.PORT}/v1/widgets/preferences/${templateId}`, data, {
    headers: {
      Authorization: `Bearer ${subscriberToken}`,
    },
  });
}

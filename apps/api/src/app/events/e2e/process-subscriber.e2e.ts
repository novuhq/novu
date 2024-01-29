import { expect } from 'chai';
import axios from 'axios';
import {
  NotificationTemplateEntity,
  SubscriberEntity,
  MessageRepository,
  SubscriberRepository,
  NotificationTemplateRepository,
} from '@novu/dal';
import { UserSession, SubscribersService } from '@novu/testing';
import { ChannelTypeEnum, ISubscribersDefine, IUpdateNotificationTemplateDto, StepTypeEnum } from '@novu/shared';
import {
  buildNotificationTemplateIdentifierKey,
  buildNotificationTemplateKey,
  CacheInMemoryProviderService,
  CacheService,
  InvalidateCacheService,
} from '@novu/application-generic';

import { UpdateSubscriberPreferenceRequestDto } from '../../widgets/dtos/update-subscriber-preference-request.dto';

const axiosInstance = axios.create();

describe('Trigger event - process subscriber /v1/events/trigger (POST)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  let cacheService: CacheService;
  let invalidateCache: InvalidateCacheService;
  let cacheInMemoryProviderService: CacheInMemoryProviderService;

  const subscriberRepository = new SubscriberRepository();
  const messageRepository = new MessageRepository();
  const notificationTemplateRepository = new NotificationTemplateRepository();

  before(async () => {
    cacheInMemoryProviderService = new CacheInMemoryProviderService();
    cacheService = new CacheService(cacheInMemoryProviderService);
    await cacheService.initialize();
    invalidateCache = new InvalidateCacheService(cacheService);
  });

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
      locale: 'en',
    };

    await triggerEvent(session, template, payload);

    await session.awaitRunningJobs(template._id);

    const createdSubscriber = await subscriberRepository.findBySubscriberId(
      session.environment._id,
      subscriber.subscriberId
    );

    expect(createdSubscriber?.firstName).to.equal(payload.firstName);
    expect(createdSubscriber?.lastName).to.equal(payload.lastName);
    expect(createdSubscriber?.email).to.equal(payload.email);
    expect(createdSubscriber?.locale).to.equal(payload.locale);
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
      _subscriberId: widgetSubscriber?._id,
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
      _subscriberId: widgetSubscriber?._id,
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
      _subscriberId: widgetSubscriber?._id,
    });

    expect(message.length).to.equal(2);

    const notificationTemplateKey = buildNotificationTemplateKey({
      _id: template._id,
      _environmentId: session.environment._id,
    });
    await invalidateCache.invalidateByKey({
      key: notificationTemplateKey,
    });

    const updateData = {
      channel: {
        type: ChannelTypeEnum.IN_APP,
        enabled: false,
      },
    };

    await updateSubscriberPreference(updateData, session.subscriberToken, template._id);

    const rest = await notificationTemplateRepository.update(
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
      _subscriberId: widgetSubscriber?._id,
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
  return await axios.patch(`http://127.0.0.1:${process.env.PORT}/v1/widgets/preferences/${templateId}`, data, {
    headers: {
      Authorization: `Bearer ${subscriberToken}`,
    },
  });
}

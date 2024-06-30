import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { MessageRepository, NotificationTemplateEntity, SubscriberEntity, SubscriberRepository } from '@novu/dal';
import {
  StepTypeEnum,
  ChannelCTATypeEnum,
  TemplateVariableTypeEnum,
  ActorTypeEnum,
  SystemAvatarIconEnum,
  ChannelTypeEnum,
} from '@novu/shared';

describe('Get Notifications Count - /inbox/notifications/count (GET)', async () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity | null;
  const messageRepository = new MessageRepository();
  const subscriberRepository = new SubscriberRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    subscriber = await subscriberRepository.findBySubscriberId(session.environment._id, session.subscriberId);
    template = await session.createTemplate({
      noFeedId: true,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test content for <b>{{firstName}}</b>',
          cta: {
            type: ChannelCTATypeEnum.REDIRECT,
            data: {
              url: '/cypress/test-shell/example/test?test-param=true',
            },
          },
          variables: [
            {
              defaultValue: '',
              name: 'firstName',
              required: false,
              type: TemplateVariableTypeEnum.STRING,
            },
          ],
          actor: {
            type: ActorTypeEnum.SYSTEM_ICON,
            data: SystemAvatarIconEnum.WARNING,
          },
        },
      ],
    });
  });

  const getNotificationsCount = async ({
    tags,
    read,
    archived,
  }: {
    tags?: string[];
    read?: boolean;
    archived?: boolean;
  } = {}) => {
    let query = '';
    if (tags) {
      query += tags.map((tag, index) => `${index > 0 ? '&' : ''}tags[]=${tag}`).join('');
    }
    if (typeof read !== 'undefined') {
      query += `${query.length ? '&' : ''}read=${read}`;
    }
    if (typeof archived !== 'undefined') {
      query += `${query.length ? '&' : ''}archived=${archived}`;
    }

    return await session.testAgent
      .get(`/v1/inbox/notifications/count?${query}`)
      .set('Authorization', `Bearer ${session.subscriberToken}`);
  };

  const triggerEvent = async (templateToTrigger: NotificationTemplateEntity, times = 1) => {
    const promises: Array<Promise<unknown>> = [];
    for (let i = 0; i < times; i++) {
      promises.push(session.triggerEvent(templateToTrigger.triggers[0].identifier, session.subscriberId));
    }

    await Promise.all(promises);
    await session.awaitRunningJobs(templateToTrigger._id);
  };

  it('should return all notifications count', async function () {
    const count = 4;
    await triggerEvent(template, count);
    const { body, status } = await getNotificationsCount();

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.count).to.eq(count);
    expect(body.filter).to.deep.equal({});
  });

  it('should return notifications count for specified tags', async function () {
    const count = 4;
    const tags = ['hello'];
    const templateWithTags = await session.createTemplate({
      noFeedId: true,
      tags,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test content for newsletter',
          actor: {
            type: ActorTypeEnum.SYSTEM_ICON,
            data: SystemAvatarIconEnum.WARNING,
          },
        },
      ],
    });
    await triggerEvent(template, 2);
    await triggerEvent(templateWithTags, count);

    const { body, status } = await getNotificationsCount({ tags });

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.count).to.eq(count);
    expect(body.filter).to.deep.equal({
      tags,
    });
  });

  it('should return notifications count for read notifications', async function () {
    const count = 4;
    await triggerEvent(template, count);
    await messageRepository.update(
      {
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id ?? '',
        channel: ChannelTypeEnum.IN_APP,
      },
      { $set: { read: true } }
    );

    const { body, status } = await getNotificationsCount({ read: true });

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.count).to.eq(count);
    expect(body.filter).to.deep.equal({
      read: true,
    });
  });

  it('should return notifications count for archived notifications', async function () {
    const count = 4;
    await triggerEvent(template, count);
    await messageRepository.update(
      {
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id ?? '',
        channel: ChannelTypeEnum.IN_APP,
      },
      { $set: { archived: true } }
    );

    const { body, status } = await getNotificationsCount({ archived: true });

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.count).to.eq(count);
    expect(body.filter).to.deep.equal({
      archived: true,
    });
  });

  it('should return notifications count for read and archived notifications', async function () {
    const count = 2;
    await triggerEvent(template, count);
    await messageRepository.update(
      {
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id ?? '',
        channel: ChannelTypeEnum.IN_APP,
      },
      { $set: { read: true, archived: true } }
    );

    const { body, status } = await getNotificationsCount({ read: true, archived: true });

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.count).to.eq(count);
    expect(body.filter).to.deep.equal({
      read: true,
      archived: true,
    });
  });

  it('should return read notifications count for specified tags', async function () {
    const count = 4;
    const tags = ['hello'];
    const templateWithTags = await session.createTemplate({
      noFeedId: true,
      tags,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test content for newsletter',
          actor: {
            type: ActorTypeEnum.SYSTEM_ICON,
            data: SystemAvatarIconEnum.WARNING,
          },
        },
      ],
    });
    await triggerEvent(template, 2);
    await triggerEvent(templateWithTags, count);

    await messageRepository.update(
      {
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id ?? '',
        channel: ChannelTypeEnum.IN_APP,
        tags: { $in: tags },
      },
      { $set: { read: true } }
    );

    const { body, status } = await getNotificationsCount({ tags, read: true });

    expect(status).to.equal(200);
    expect(body.data).to.be.ok;
    expect(body.data.count).to.eq(count);
    expect(body.filter).to.deep.equal({
      tags,
      read: true,
    });
  });
});

import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { MessageRepository, NotificationTemplateEntity, SubscriberEntity, SubscriberRepository } from '@novu/dal';
import {
  StepTypeEnum,
  ChannelCTATypeEnum,
  TemplateVariableTypeEnum,
  ActorTypeEnum,
  SystemAvatarIconEnum,
  ButtonTypeEnum,
} from '@novu/shared';

describe('Update All Notifications - /inbox/notifications/{read,archive,read-archive} (POST)', async () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity | null;
  const messageRepository = new MessageRepository();
  const subscriberRepository = new SubscriberRepository();

  const updateAllNotifications = async ({
    action,
    tags,
  }: {
    action: 'read' | 'archive' | 'read-archive';
    tags?: string[];
  }) => {
    return await session.testAgent
      .post(`/v1/inbox/notifications/${action}`)
      .set('Authorization', `Bearer ${session.subscriberToken}`)
      .send({ tags });
  };

  const triggerEvent = async (templateToTrigger: NotificationTemplateEntity, times = 1) => {
    const promises: Array<Promise<unknown>> = [];
    for (let i = 0; i < times; i += 1) {
      promises.push(session.triggerEvent(templateToTrigger.triggers[0].identifier, session.subscriberId));
    }

    await Promise.all(promises);
    await session.awaitRunningJobs(templateToTrigger._id);
  };

  const removeUndefinedDeep = (obj) => {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return obj;

    const newObj = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        newObj[key] = removeUndefinedDeep(obj[key]);
      }
    }

    return newObj;
  };

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
              url: '',
            },
            action: {
              buttons: [
                { type: ButtonTypeEnum.PRIMARY, content: '' },
                { type: ButtonTypeEnum.SECONDARY, content: '' },
              ],
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
    await triggerEvent(template, 3);
  });

  it('should mark all unread notifications as read', async function () {
    const allMessages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
      _templateId: template._id,
    });
    expect(allMessages.length).to.equal(3);
    expect(allMessages.every((el) => !el.read)).to.be.true;

    const { status } = await updateAllNotifications({ action: 'read' });

    const allUpdatedMessages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
      _templateId: template._id,
    });

    expect(status).to.equal(204);
    expect(allUpdatedMessages.length).to.equal(3);
    expect(allUpdatedMessages.every((el) => el.read)).to.be.true;
  });

  it('should mark all unread notifications as read using tags', async function () {
    const tags = ['newsletter'];
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
    await triggerEvent(templateWithTags, 4);

    const allMessages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
    });
    expect(allMessages.length).to.equal(7);
    expect(allMessages.every((el) => !el.read)).to.be.true;

    const { status } = await updateAllNotifications({ action: 'read', tags });

    const allUpdatedMessages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
    });

    expect(status).to.equal(204);
    expect(allUpdatedMessages.length).to.equal(7);

    const newsletterMessages = allUpdatedMessages.filter((el) => el.tags?.includes('newsletter'));
    expect(newsletterMessages.length).to.equal(4);
    expect(newsletterMessages.every((el) => el.read)).to.be.true;
  });

  it('should mark all notifications as archived', async function () {
    const allMessages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
      _templateId: template._id,
    });
    expect(allMessages.length).to.equal(3);
    expect(allMessages.every((el) => !el.read)).to.be.true;

    const { status } = await updateAllNotifications({ action: 'archive' });

    const allUpdatedMessages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
      _templateId: template._id,
    });

    expect(status).to.equal(204);
    expect(allUpdatedMessages.length).to.equal(3);
    expect(allUpdatedMessages.every((el) => el.archived)).to.be.true;
  });

  it('should mark all notifications as archived using tags', async function () {
    const tags = ['newsletter'];
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
    await triggerEvent(templateWithTags, 4);

    const allMessages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
    });
    expect(allMessages.length).to.equal(7);
    expect(allMessages.every((el) => !el.read)).to.be.true;

    const { status } = await updateAllNotifications({ action: 'archive', tags });

    const allUpdatedMessages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
    });

    expect(status).to.equal(204);
    expect(allUpdatedMessages.length).to.equal(7);

    const newsletterMessages = allUpdatedMessages.filter((el) => el.tags?.includes('newsletter'));
    expect(newsletterMessages.length).to.equal(4);
    expect(newsletterMessages.every((el) => el.archived)).to.be.true;
  });

  it('should mark all read notifications as archived', async function () {
    const allMessages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
      _templateId: template._id,
    });
    expect(allMessages.length).to.equal(3);
    expect(allMessages.every((el) => !el.read)).to.be.true;

    await messageRepository.update(
      {
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id ?? '',
        _templateId: template._id,
      },
      { $set: { read: true } }
    );

    const { status } = await updateAllNotifications({ action: 'read-archive' });

    const allUpdatedMessages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
      _templateId: template._id,
    });

    expect(status).to.equal(204);
    expect(allUpdatedMessages.length).to.equal(3);
    expect(allUpdatedMessages.every((el) => el.archived)).to.be.true;
  });

  it('should mark all read notifications as archived using tags', async function () {
    const tags = ['newsletter'];
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
    await triggerEvent(templateWithTags, 4);
    await messageRepository.update(
      {
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id ?? '',
        _templateId: templateWithTags._id,
      },
      { $set: { read: true } }
    );

    const allMessages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
    });
    expect(allMessages.length).to.equal(7);

    const { status } = await updateAllNotifications({ action: 'read-archive', tags });

    const allUpdatedMessages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
    });

    expect(status).to.equal(204);
    expect(allUpdatedMessages.length).to.equal(7);

    const newsletterMessages = allUpdatedMessages.filter((el) => el.tags?.includes('newsletter'));
    expect(newsletterMessages.length).to.equal(4);
    expect(newsletterMessages.every((el) => el.archived)).to.be.true;
  });
});

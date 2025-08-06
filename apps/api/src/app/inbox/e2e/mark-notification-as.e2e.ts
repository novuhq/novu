import { Novu } from '@novu/api';
import {
  MessageEntity,
  MessageRepository,
  NotificationTemplateEntity,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';
import {
  ActorTypeEnum,
  ButtonTypeEnum,
  ChannelCTATypeEnum,
  StepTypeEnum,
  SystemAvatarIconEnum,
  TemplateVariableTypeEnum,
} from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import { mapToDto } from '../utils/notification-mapper';

describe('Mark Notification As - /inbox/notifications/:id/{read,unread,archive,unarchive,snooze,unsnooze} (PATCH) #novu-v2', async () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity | null;
  let message: MessageEntity;
  const messageRepository = new MessageRepository();
  const subscriberRepository = new SubscriberRepository();
  let novuClient: Novu;
  const updateNotification = async ({
    id,
    status,
    body,
  }: {
    id: string;
    status: 'read' | 'unread' | 'archive' | 'unarchive' | 'snooze' | 'unsnooze';
    body?: any;
  }) => {
    return await session.testAgent
      .patch(`/v1/inbox/notifications/${id}/${status}`)
      .set('Authorization', `Bearer ${session.subscriberToken}`)
      .send(body);
  };

  const triggerEvent = async (templateToTrigger: NotificationTemplateEntity, times = 1) => {
    const promises: Array<Promise<unknown>> = [];
    for (let i = 0; i < times; i += 1) {
      promises.push(
        novuClient.trigger({
          workflowId: templateToTrigger.triggers[0].identifier,
          to: { subscriberId: session.subscriberId },
        })
      );
    }

    await Promise.all(promises);
    await session.waitForJobCompletion(templateToTrigger._id);
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
    novuClient = initNovuClassSdk(session);
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
    await triggerEvent(template);
    message = (await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
      _templateId: template._id,
    })) as MessageEntity;
  });

  it('should throw bad request error when the notification id is not mongo id', async () => {
    const id = 'fake';
    const { body, status } = await updateNotification({ id, status: 'read' });
    expect(body.statusCode).to.equal(422);
    expect(body.errors.notificationId.messages[0]).to.equal(`notificationId must be a mongodb id`);
  });

  it("should throw not found error when the message doesn't exist", async () => {
    const id = '666c0dfa0b55d0f06f4aaa6c';
    const { body, status } = await updateNotification({ id, status: 'read' });

    expect(status).to.equal(404);
    expect(body.message).to.equal(`Notification with id: ${id} is not found.`);
  });

  it('should update the read status', async () => {
    const { body, status } = await updateNotification({ id: message._id, status: 'read' });
    const updatedMessage = (await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
      _templateId: template._id,
    })) as MessageEntity;

    expect(status).to.equal(200);
    expect(body.data).to.deep.equal(removeUndefinedDeep(mapToDto(updatedMessage)));
    expect(updatedMessage.seen).to.be.true;
    expect(updatedMessage.lastSeenDate).not.to.be.undefined;
    expect(body.data.isRead).to.be.true;
    expect(body.data.readAt).not.to.be.undefined;
    expect(body.data.isArchived).to.be.false;
    expect(body.data.archivedAt).to.be.undefined;
  });

  it('should update the unread status', async () => {
    const now = new Date();
    await messageRepository.update(
      { _id: message._id, _environmentId: message._environmentId },
      { $set: { seen: true, lastSeenDate: now, read: true, lastReadDate: now, archived: true, archivedAt: now } }
    );

    const { body, status } = await updateNotification({ id: message._id, status: 'unread' });

    const updatedMessage = (await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
      _templateId: template._id,
    })) as MessageEntity;

    expect(status).to.equal(200);
    expect(body.data).to.deep.equal(removeUndefinedDeep(mapToDto(updatedMessage)));
    expect(updatedMessage.seen).to.be.true;
    expect(updatedMessage.lastSeenDate).not.to.be.undefined;
    expect(body.data.isRead).to.be.false;
    expect(body.data.readAt).to.be.null;
    expect(body.data.isArchived).to.be.false;
    expect(body.data.archivedAt).to.be.null;
  });

  it('should update the archived status', async () => {
    const { body, status } = await updateNotification({ id: message._id, status: 'archive' });

    const updatedMessage = (await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
      _templateId: template._id,
    })) as MessageEntity;

    expect(status).to.equal(200);
    expect(body.data).to.deep.equal(removeUndefinedDeep(mapToDto(updatedMessage)));
    expect(updatedMessage.seen).to.be.true;
    expect(updatedMessage.lastSeenDate).not.to.be.undefined;
    expect(body.data.isRead).to.be.true;
    expect(body.data.readAt).not.to.be.undefined;
    expect(body.data.isArchived).to.be.true;
    expect(body.data.archivedAt).not.to.be.undefined;
  });

  it('should update the unarchived status', async () => {
    const now = new Date();
    await messageRepository.update(
      { _id: message._id, _environmentId: message._environmentId },
      { $set: { seen: true, lastSeenDate: now, read: true, lastReadDate: now, archived: true, archivedAt: now } }
    );

    const { body, status } = await updateNotification({ id: message._id, status: 'unarchive' });

    const updatedMessage = (await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
      _templateId: template._id,
    })) as MessageEntity;

    expect(status).to.equal(200);
    expect(body.data).to.deep.equal(removeUndefinedDeep(mapToDto(updatedMessage)));
    expect(updatedMessage.seen).to.be.true;
    expect(updatedMessage.lastSeenDate).not.to.be.undefined;
    expect(body.data.isRead).to.be.true;
    expect(body.data.readAt).not.to.be.undefined;
    expect(body.data.isArchived).to.be.false;
    expect(body.data.archivedAt).to.be.null;
  });

  it('should update the snoozed status', async () => {
    const snoozeUntil = new Date(Date.now() + 1000 * 60 * 60); // 1 hour in the future
    const { body, status } = await updateNotification({
      id: message._id,
      status: 'snooze',
      body: { snoozeUntil },
    });

    const updatedMessage = (await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
      _templateId: template._id,
    })) as MessageEntity;

    expect(status).to.equal(200);
    expect(body.data).to.deep.equal(removeUndefinedDeep(mapToDto(updatedMessage)));
    expect(updatedMessage.seen).to.be.true;
    expect(updatedMessage.lastSeenDate).not.to.be.undefined;
    expect(body.data.isSnoozed).to.be.true;
    expect(body.data.snoozedUntil).to.equal(snoozeUntil.toISOString());
  });

  it('should update the unsnoozed status', async () => {
    const now = new Date();
    const snoozeUntil = new Date(Date.now() + 1000 * 60 * 60); // 1 hour in the future

    // First set up a snoozed notification
    await updateNotification({
      id: message._id,
      status: 'snooze',
      body: { snoozeUntil },
    });

    // Then unsnooze it
    const { body, status } = await updateNotification({ id: message._id, status: 'unsnooze' });

    const updatedMessage = (await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
      _templateId: template._id,
    })) as MessageEntity;

    expect(status).to.equal(200);
    expect(body.data).to.deep.equal(removeUndefinedDeep(mapToDto(updatedMessage)));
    expect(updatedMessage.seen).to.be.true;
    expect(updatedMessage.lastSeenDate).not.to.be.undefined;
    expect(body.data.isSnoozed).to.be.false;
    expect(body.data.snoozedUntil).to.be.undefined;
  });
});

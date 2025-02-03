import { expect } from 'chai';
import { UserSession } from '@novu/testing';
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

import { Novu } from '@novu/api';
import { mapToDto } from '../utils/notification-mapper';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Mark Notification As - /inbox/notifications/:id/{read,unread,archive,unarchive} (PATCH) #novu-v2', async () => {
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
  }: {
    id: string;
    status: 'read' | 'unread' | 'archive' | 'unarchive';
  }) => {
    return await session.testAgent
      .patch(`/v1/inbox/notifications/${id}/${status}`)
      .set('Authorization', `Bearer ${session.subscriberToken}`)
      .send();
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

  it('should throw bad request error when the notification id is not mongo id', async function () {
    const id = 'fake';
    const { body, status } = await updateNotification({ id, status: 'read' });
    expect(body.statusCode).to.equal(422);
    expect(body.errors.notificationId.messages[0]).to.equal(`notificationId must be a mongodb id`);
  });

  it("should throw not found error when the message doesn't exist", async function () {
    const id = '666c0dfa0b55d0f06f4aaa6c';
    const { body, status } = await updateNotification({ id, status: 'read' });

    expect(status).to.equal(404);
    expect(body.message).to.equal(`Notification with id: ${id} is not found.`);
  });

  it('should update the read status', async function () {
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

  it('should update the unread status', async function () {
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

  it('should update the archived status', async function () {
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

  it('should update the unarchived status', async function () {
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
});

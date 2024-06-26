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
  StepTypeEnum,
  ChannelCTATypeEnum,
  TemplateVariableTypeEnum,
  ActorTypeEnum,
  SystemAvatarIconEnum,
  ButtonTypeEnum,
} from '@novu/shared';

import { mapToDto } from '../utils/notification-mapper';

describe('Update Notification - /inbox/notifications/:id (PATCH)', async () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity | null;
  let message: MessageEntity;
  const messageRepository = new MessageRepository();
  const subscriberRepository = new SubscriberRepository();

  const updateNotification = async ({
    id,
    read,
    archived,
    primaryActionCompleted,
    secondaryActionCompleted,
  }: {
    id: string;
    read?: boolean;
    archived?: boolean;
    primaryActionCompleted?: boolean;
    secondaryActionCompleted?: boolean;
  }) => {
    return await session.testAgent
      .patch(`/v1/inbox/notifications/${id}`)
      .set('Authorization', `Bearer ${session.subscriberToken}`)
      .send({ read, archived, primaryActionCompleted, secondaryActionCompleted });
  };

  const triggerEvent = async (templateToTrigger: NotificationTemplateEntity, times = 1) => {
    const promises: Array<Promise<unknown>> = [];
    for (let i = 0; i < times; i++) {
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
    await triggerEvent(template);
    message = (await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
      _templateId: template._id,
    })) as MessageEntity;
  });

  it('should throw bad request error when the notification id is not mongo id', async function () {
    const id = 'fake';
    const { body, status } = await updateNotification({ id });

    expect(status).to.equal(400);
    expect(body.message[0]).to.equal(`notificationId must be a mongodb id`);
  });

  it("should throw not found error when the message doesn't exist", async function () {
    const id = '666c0dfa0b55d0f06f4aaa6c';
    const { body, status } = await updateNotification({ id });

    expect(status).to.equal(404);
    expect(body.message).to.equal(`Notification with id: ${id} is not found.`);
  });

  it('should throw bad request error when the action cannot be performed on the primary button', async function () {
    const templateNoButtons = await session.createTemplate({
      noFeedId: true,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test No Buttons',
        },
      ],
    });
    await triggerEvent(templateNoButtons);
    const newMessage = (await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
      _templateId: templateNoButtons._id,
    })) as MessageEntity;

    const { body, status } = await updateNotification({ id: newMessage._id, primaryActionCompleted: true });

    expect(status).to.equal(400);
    expect(body.message).to.equal(`Could not perform action on the primary button.`);
  });

  it('should throw bad request error when the action cannot be performed on the secondary button', async function () {
    const templateNoButtons = await session.createTemplate({
      noFeedId: true,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test No Buttons',
        },
      ],
    });
    await triggerEvent(templateNoButtons);
    const newMessage = (await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
      _templateId: templateNoButtons._id,
    })) as MessageEntity;

    const { body, status } = await updateNotification({ id: newMessage._id, secondaryActionCompleted: true });

    expect(status).to.equal(400);
    expect(body.message).to.equal(`Could not perform action on the secondary button.`);
  });

  it('should update the read status', async function () {
    const { body, status } = await updateNotification({ id: message._id, read: true });
    const updatedMessage = (await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
      _templateId: template._id,
    })) as MessageEntity;

    expect(status).to.equal(200);
    expect(body.data).to.deep.equal(removeUndefinedDeep(mapToDto(updatedMessage)));
    expect(body.data.read).to.be.true;
    expect(body.data.archived).to.be.false;
  });

  it('should update the archived status', async function () {
    const { body, status } = await updateNotification({ id: message._id, archived: true });
    const updatedMessage = (await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
      _templateId: template._id,
    })) as MessageEntity;

    expect(status).to.equal(200);
    expect(body.data).to.deep.equal(removeUndefinedDeep(mapToDto(updatedMessage)));
    expect(body.data.read).to.be.false;
    expect(body.data.archived).to.be.true;
  });

  it('should update the primary action status', async function () {
    const { body, status } = await updateNotification({ id: message._id, primaryActionCompleted: true });
    const updatedMessage = (await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
      _templateId: template._id,
    })) as MessageEntity;

    expect(status).to.equal(200);
    expect(body.data).to.deep.equal(removeUndefinedDeep(mapToDto(updatedMessage)));
    expect(body.data.primaryAction.isCompleted).to.be.true;
    expect(body.data.secondaryAction.isCompleted).to.be.false;
  });

  it('should update the secondary action status', async function () {
    const { body, status } = await updateNotification({ id: message._id, secondaryActionCompleted: true });
    const updatedMessage = (await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
      _templateId: template._id,
    })) as MessageEntity;

    expect(status).to.equal(200);
    expect(body.data).to.deep.equal(removeUndefinedDeep(mapToDto(updatedMessage)));
    expect(body.data.primaryAction.isCompleted).to.be.false;
    expect(body.data.secondaryAction.isCompleted).to.be.true;
  });

  it('should update the all props together', async function () {
    const { body, status } = await updateNotification({
      id: message._id,
      read: true,
      archived: true,
      primaryActionCompleted: true,
    });
    const updatedMessage = (await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id ?? '',
      _templateId: template._id,
    })) as MessageEntity;

    expect(status).to.equal(200);
    expect(body.data).to.deep.equal(removeUndefinedDeep(mapToDto(updatedMessage)));
    expect(body.data.read).to.be.true;
    expect(body.data.archived).to.be.true;
    expect(body.data.primaryAction.isCompleted).to.be.true;
  });
});

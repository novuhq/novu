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

describe('Update Notification Action - /inbox/notifications/:id/{complete/revert} (PATCH) #novu-v2', async () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity | null;
  let message: MessageEntity;
  const messageRepository = new MessageRepository();
  const subscriberRepository = new SubscriberRepository();
  let novuClient: Novu;
  const updateNotificationAction = async ({
    id,
    action,
    actionType,
  }: {
    id: string;
    action: 'complete' | 'revert';
    actionType: ButtonTypeEnum;
  }) => {
    return await session.testAgent
      .patch(`/v1/inbox/notifications/${id}/${action}`)
      .set('Authorization', `Bearer ${session.subscriberToken}`)
      .send({ actionType });
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
    const { body, status } = await updateNotificationAction({
      id,
      action: 'complete',
      actionType: ButtonTypeEnum.PRIMARY,
    });

    expect(status).to.equal(422);
    expect(body.statusCode).to.equal(422);
    expect(body.errors.notificationId.messages[0]).to.equal(`notificationId must be a mongodb id`);
  });

  it("should throw not found error when the message doesn't exist", async function () {
    const id = '666c0dfa0b55d0f06f4aaa6c';
    const { body, status } = await updateNotificationAction({
      id,
      action: 'complete',
      actionType: ButtonTypeEnum.PRIMARY,
    });

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

    const { body, status } = await updateNotificationAction({
      id: newMessage._id,
      action: 'complete',
      actionType: ButtonTypeEnum.PRIMARY,
    });

    expect(status).to.equal(400);
    expect(body.message).to.equal(`Could not perform action on the primary button because it does not exist.`);
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

    const { body, status } = await updateNotificationAction({
      id: newMessage._id,
      action: 'complete',
      actionType: ButtonTypeEnum.SECONDARY,
    });

    expect(status).to.equal(400);
    expect(body.message).to.equal(`Could not perform action on the secondary button because it does not exist.`);
  });

  it('should update the primary action status', async function () {
    const { body, status } = await updateNotificationAction({
      id: message._id,
      action: 'complete',
      actionType: ButtonTypeEnum.PRIMARY,
    });
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
    const { body, status } = await updateNotificationAction({
      id: message._id,
      action: 'complete',
      actionType: ButtonTypeEnum.SECONDARY,
    });
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
});

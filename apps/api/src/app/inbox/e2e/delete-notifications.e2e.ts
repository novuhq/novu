import { Novu } from '@novu/api';
import {
  MessageEntity,
  MessageRepository,
  NotificationTemplateEntity,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';
import { ChannelCTATypeEnum, StepTypeEnum, TemplateVariableTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { randomBytes } from 'crypto';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Delete Notifications - /inbox/notifications (DELETE/POST) #novu-v2', async () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity | null;
  let messages: MessageEntity[];
  const messageRepository = new MessageRepository();
  const subscriberRepository = new SubscriberRepository();
  let novuClient: Novu;

  const getSubscriber = (): SubscriberEntity => {
    if (!subscriber) {
      throw new Error('Subscriber not initialized');
    }
    return subscriber;
  };

  const deleteNotification = async (id: string) => {
    return await session.testAgent
      .delete(`/v1/inbox/notifications/${id}/delete`)
      .set('Authorization', `Bearer ${session.subscriberToken}`);
  };

  const deleteAllNotifications = async (body?: any) => {
    return await session.testAgent
      .post(`/v1/inbox/notifications/delete`)
      .set('Authorization', `Bearer ${session.subscriberToken}`)
      .send(body || {});
  };

  const triggerEvent = async (templateToTrigger: NotificationTemplateEntity, times = 1) => {
    const currentSubscriber = getSubscriber();

    const promises: Array<Promise<unknown>> = [];
    for (let i = 0; i < times; i += 1) {
      promises.push(
        novuClient.trigger({
          workflowId: templateToTrigger.triggers[0].identifier,
          to: currentSubscriber.subscriberId,
          payload: {
            subject: 'this is a test',
            message: 'Hello, World!',
            isUrgent: true,
            nested: {
              value: `Nested property ${i}`,
            },
          },
        })
      );
    }
    await Promise.all(promises);

    await session.waitForJobCompletion(templateToTrigger._id);
  };

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate({
      noFeedId: true,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello World {{#if isUrgent}}URGENT: {{/if}}{{#each nested}}{{value}}{{/each}}' as string,
          cta: {
            type: ChannelCTATypeEnum.REDIRECT,
            data: {
              url: '/cypress/test-shell/example/test?test-param=true',
            },
          },
          variables: [
            {
              name: 'isUrgent',
              type: TemplateVariableTypeEnum.BOOLEAN,
            },
          ],
        },
      ],
    });

    subscriber = await subscriberRepository.findBySubscriberId(session.environment._id, session.subscriberId);

    if (!subscriber) {
      throw new Error('Subscriber not found after session initialization');
    }

    novuClient = initNovuClassSdk(session);

    // Create multiple messages for testing
    await triggerEvent(template, 3);

    messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: getSubscriber()._id,
      _templateId: template._id,
    });
  });

  describe('Single notification deletion', () => {
    it('should delete a single notification', async () => {
      const message = messages[0];

      const response = await deleteNotification(message._id);
      expect(response.status).to.equal(204);

      // Verify the message is actually deleted from the database
      const deletedMessage = await messageRepository.findOne({
        _id: message._id,
        _environmentId: session.environment._id,
      });
      expect(deletedMessage).to.be.null;
    });

    it('should return 404 for non-existent notification', async () => {
      const response = await deleteNotification('507f1f77bcf86cd799439011');
      expect(response.status).to.equal(404);
    });
  });

  describe('Bulk notification deletion', () => {
    it('should delete all notifications without filters', async () => {
      const response = await deleteAllNotifications();
      expect(response.status).to.equal(204);

      // Verify all messages are deleted
      const remainingMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: getSubscriber()._id,
        _templateId: template._id,
      });
      expect(remainingMessages).to.have.length(0);
    });

    it('should delete notifications with tag filter', async () => {
      // First, add tags to some messages
      await messageRepository.update(
        { _id: messages[0]._id, _environmentId: session.environment._id },
        { $set: { tags: ['urgent'] } }
      );
      await messageRepository.update(
        { _id: messages[1]._id, _environmentId: session.environment._id },
        { $set: { tags: ['urgent'] } }
      );

      const response = await deleteAllNotifications({ tags: ['urgent'] });
      expect(response.status).to.equal(204);

      // Verify only tagged messages are deleted
      const remainingMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: getSubscriber()._id,
        _templateId: template._id,
      });
      expect(remainingMessages).to.have.length(1);
      expect(remainingMessages[0]._id).to.equal(messages[2]._id);
    });

    it('should delete notifications with data filter', async () => {
      // First, add data to some messages
      await messageRepository.update(
        { _id: messages[0]._id, _environmentId: session.environment._id },
        { $set: { data: { category: 'test' } } }
      );

      const response = await deleteAllNotifications({
        data: JSON.stringify({ category: 'test' }),
      });
      expect(response.status).to.equal(204);

      // Verify only messages with matching data are deleted
      const remainingMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: getSubscriber()._id,
        _templateId: template._id,
      });
      expect(remainingMessages).to.have.length(2);
    });
  });

  describe('Authorization', () => {
    it('should require authentication', async () => {
      const response = await session.testAgent.delete(`/v1/inbox/notifications/${messages[0]._id}/delete`);
      expect(response.status).to.equal(401);
    });

    it('should not allow deleting notifications from other subscribers', async () => {
      const uniqueSubscriberId = `other-subscriber-${randomBytes(4).toString('hex')}`;
      const otherSubscriber = await subscriberRepository.create({
        subscriberId: uniqueSubscriberId,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
      });

      // Trigger event for the other subscriber
      await novuClient.trigger({
        workflowId: template.triggers[0].identifier,
        to: uniqueSubscriberId,
        payload: {
          subject: 'this is a test',
          message: 'Hello, World!',
          isUrgent: true,
        },
      });

      await session.waitForJobCompletion(template._id);

      const otherMessage = await messageRepository.findOne({
        _environmentId: session.environment._id,
        _subscriberId: otherSubscriber._id,
        _templateId: template._id,
      });

      const response = await deleteNotification(otherMessage?._id || '');
      expect(response.status).to.equal(404);
    });
  });
});

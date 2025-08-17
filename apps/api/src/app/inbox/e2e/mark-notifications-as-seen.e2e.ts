import { Novu } from '@novu/api';
import {
  MessageEntity,
  MessageRepository,
  NotificationTemplateEntity,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';
import { ActorTypeEnum, ChannelCTATypeEnum, StepTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Mark Notifications As Seen - /inbox/notifications/seen (POST) #novu-v2', async () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity | null;
  let messages: MessageEntity[];
  const messageRepository = new MessageRepository();
  const subscriberRepository = new SubscriberRepository();
  let novuClient: Novu;

  const markNotificationsAsSeen = async (body: any = {}) => {
    return await session.testAgent
      .post('/v1/inbox/notifications/seen')
      .set('Authorization', `Bearer ${session.subscriberToken}`)
      .send(body);
  };

  const triggerEvent = async (templateToTrigger: NotificationTemplateEntity, times = 1, payload: any = {}) => {
    const promises: Array<Promise<unknown>> = [];
    for (let i = 0; i < times; i += 1) {
      promises.push(
        novuClient.trigger({
          workflowId: templateToTrigger.triggers[0].identifier,
          to: { subscriberId: session.subscriberId },
          payload,
        })
      );
    }

    await Promise.all(promises);
    await session.waitForJobCompletion(templateToTrigger._id);
  };

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    subscriber = await subscriberRepository.findBySubscriberId(session.environment._id, session.subscriberId);

    template = await session.createTemplate({
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
          actor: {
            type: ActorTypeEnum.NONE,
            data: null,
          },
        },
      ],
    });

    novuClient = new Novu({
      security: {
        secretKey: session.apiKey,
      },
      serverURL: session.serverUrl,
    });
  });

  describe('Mark specific notifications as seen by IDs', () => {
    beforeEach(async () => {
      await triggerEvent(template, 3);
      messages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id,
        _templateId: template._id,
      });
    });

    it('should mark specific notifications as seen by providing IDs', async () => {
      const messageIds = [messages[0]._id, messages[1]._id];
      const { status } = await markNotificationsAsSeen({ notificationIds: messageIds });

      expect(status).to.equal(204);

      const updatedMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id,
        _templateId: template._id,
      });

      const updatedMessage1 = updatedMessages.find((message) => message._id === messages[0]._id);
      const updatedMessage2 = updatedMessages.find((message) => message._id === messages[1]._id);
      const updatedMessage3 = updatedMessages.find((message) => message._id === messages[2]._id);

      expect(updatedMessage1?.seen).to.be.true;
      expect(updatedMessage1?.lastSeenDate).not.to.be.undefined;
      expect(updatedMessage2?.seen).to.be.true;
      expect(updatedMessage2?.lastSeenDate).not.to.be.undefined;
      expect(updatedMessage3?.seen).to.be.false; // Should not be marked as seen
    });

    it('should throw validation error for invalid notification IDs', async () => {
      const invalidBody = {
        notificationIds: ['invalid-id', 'another-invalid'],
      };

      const { body } = await session.testAgent
        .post('/v1/inbox/notifications/seen')
        .set('Authorization', `Bearer ${session.subscriberToken}`)
        .send(invalidBody)
        .expect(422);

      expect(body.message).to.include('Validation Error');
    });
  });

  describe('Mark notifications as seen by filters', () => {
    beforeEach(async () => {
      // Create notifications with different tags and data
      await triggerEvent(template, 2, { category: 'urgent', tags: ['important'] });
      await triggerEvent(template, 2, { category: 'normal', tags: ['regular'] });
      messages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id,
        _templateId: template._id,
      });
    });

    it('should mark all notifications as seen when no filters provided', async () => {
      const { status } = await markNotificationsAsSeen({});

      expect(status).to.equal(204);

      const updatedMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id,
        _templateId: template._id,
      });

      updatedMessages.forEach((message) => {
        expect(message.seen).to.be.true;
        expect(message.lastSeenDate).not.to.be.undefined;
      });
    });

    it('should mark notifications as seen by tags filter', async () => {
      // Create template with tags
      const taggedTemplate = await session.createTemplate({
        tags: ['important'],
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'Tagged notification',
          },
        ],
      });

      await triggerEvent(taggedTemplate, 2);

      const { status } = await markNotificationsAsSeen({ tags: ['important'] });

      expect(status).to.equal(204);

      const taggedMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id,
        _templateId: taggedTemplate._id,
      });

      taggedMessages.forEach((message) => {
        expect(message.seen).to.be.true;
        expect(message.lastSeenDate).not.to.be.undefined;
      });
    });

    it('should throw validation error for invalid JSON data', async () => {
      const invalidBody = {
        data: 'invalid-json-{',
      };

      const { body } = await session.testAgent
        .post('/v1/inbox/notifications/seen')
        .set('Authorization', `Bearer ${session.subscriberToken}`)
        .send(invalidBody)
        .expect(400);

      expect(body.message).to.include('Invalid JSON format for data parameter');
    });
  });

  describe('Priority handling', () => {
    beforeEach(async () => {
      await triggerEvent(template, 3);
      messages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id,
        _templateId: template._id,
      });
    });

    it('should prioritize notificationIds over filters when both are provided', async () => {
      const messageIds = [messages[0]._id];
      const { status } = await markNotificationsAsSeen({
        notificationIds: messageIds,
        tags: ['some-tag'], // This should be ignored
      });

      expect(status).to.equal(204);

      const updatedMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id,
        _templateId: template._id,
      });

      const updatedMessage1 = updatedMessages.find((message) => message._id === messages[0]._id);
      const updatedMessage2 = updatedMessages.find((message) => message._id === messages[1]._id);
      const updatedMessage3 = updatedMessages.find((message) => message._id === messages[2]._id);

      expect(updatedMessage1?.seen).to.be.true;
      expect(updatedMessage2?.seen).to.be.false; // Should not be affected by tags filter
      expect(updatedMessage3?.seen).to.be.false;
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent notification IDs gracefully', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011'; // Valid ObjectId format but doesn't exist
      const { status } = await markNotificationsAsSeen({ notificationIds: [nonExistentId] });

      expect(status).to.equal(204); // Should still succeed but no notifications updated
    });

    it('should validate array format for notificationIds', async () => {
      const invalidBody = {
        notificationIds: 'not-an-array',
      };

      await session.testAgent
        .post('/v1/inbox/notifications/seen')
        .set('Authorization', `Bearer ${session.subscriberToken}`)
        .send(invalidBody)
        .expect(422);
    });

    it('should validate array format for tags', async () => {
      const invalidBody = {
        tags: 'not-an-array',
      };

      await session.testAgent
        .post('/v1/inbox/notifications/seen')
        .set('Authorization', `Bearer ${session.subscriberToken}`)
        .send(invalidBody)
        .expect(422);
    });
  });

  describe('Side effects', () => {
    beforeEach(async () => {
      await triggerEvent(template, 2);
      messages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id,
        _templateId: template._id,
      });
    });

    it('should not affect read status when marking as seen', async () => {
      // First mark one message as read
      await messageRepository.update(
        {
          _id: messages[0]._id,
          _environmentId: session.environment._id,
        },
        { $set: { read: true, lastReadDate: new Date() } }
      );

      const messageIds = [messages[0]._id, messages[1]._id];
      await markNotificationsAsSeen({ notificationIds: messageIds });

      const updatedMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id,
        _templateId: template._id,
      });

      const updatedMessage1 = updatedMessages.find((message) => message._id === messages[0]._id);
      const updatedMessage2 = updatedMessages.find((message) => message._id === messages[1]._id);

      expect(updatedMessage1?.seen).to.be.true;
      expect(updatedMessage1?.read).to.be.true; // Should remain read
      expect(updatedMessage2?.seen).to.be.true;
      expect(updatedMessage2?.read).to.be.false; // Should remain unread
    });

    it('should not affect archived status when marking as seen', async () => {
      // First mark one message as archived
      await messageRepository.update(
        {
          _id: messages[0]._id,
          _environmentId: session.environment._id,
        },
        { $set: { archived: true, archivedAt: new Date() } }
      );

      const messageIds = [messages[0]._id, messages[1]._id];
      await markNotificationsAsSeen({ notificationIds: messageIds });

      const updatedMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id,
        _templateId: template._id,
      });

      const updatedMessage1 = updatedMessages.find((message) => message._id === messages[0]._id);
      const updatedMessage2 = updatedMessages.find((message) => message._id === messages[1]._id);

      expect(updatedMessage1?.seen).to.be.true;
      expect(updatedMessage1?.archived).to.be.true; // Should remain archived
      expect(updatedMessage2?.seen).to.be.true;
      expect(updatedMessage2?.archived).to.be.false; // Should remain unarchived
    });
  });
});

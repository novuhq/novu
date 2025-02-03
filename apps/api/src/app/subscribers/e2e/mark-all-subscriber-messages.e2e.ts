import { expect } from 'chai';
import { ChannelTypeEnum, MessagesStatusEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { MessageRepository, NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';
import { Novu } from '@novu/api';
import { expectSdkExceptionGeneric, initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Mark All Subscriber Messages - /subscribers/:subscriberId/messages/mark-all (POST) #novu-v2', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  const messageRepository = new MessageRepository();
  const subscriberRepository = new SubscriberRepository();
  let novuClient: Novu;
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate();
    novuClient = initNovuClassSdk(session);
    await messageRepository.deleteMany({
      _environmentId: session.environment._id,
      _subscriberId: session.subscriberId,
    });
  });

  it("should throw not found when subscriberId doesn't exist", async function () {
    const fakeSubscriberId = 'fake-subscriber-id';
    const { error } = await expectSdkExceptionGeneric(() =>
      markAllSubscriberMessagesAs(fakeSubscriberId, MessagesStatusEnum.READ)
    );
    if (!error) {
      throw new Error('Call Should fail');
    }
    expect(error.statusCode).to.equal(404);
    expect(error.message, JSON.stringify(error)).to.equal(
      `Subscriber ${fakeSubscriberId} does not exist in environment ${session.environment._id}, ` +
        'please provide a valid subscriber identifier'
    );
  });

  it('should mark all the subscriber messages as read', async function () {
    const { subscriberId } = session;
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });

    await session.awaitRunningJobs(template._id);

    const notificationsFeedResponse = await getSubscriberNotifications(subscriberId);
    expect(notificationsFeedResponse.totalCount).to.equal(5);

    const messagesMarkedAsReadResponse = await markAllSubscriberMessagesAs(subscriberId, MessagesStatusEnum.READ);
    expect(messagesMarkedAsReadResponse).to.equal(5);

    const subscriber = await subscriberRepository.findBySubscriberId(session.environment._id, subscriberId);
    const feed = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id,
      channel: ChannelTypeEnum.IN_APP,
      seen: true,
      read: true,
    });

    expect(feed.length).to.equal(5);
    for (const message of feed) {
      expect(message.seen).to.equal(true);
      expect(message.read).to.equal(true);
    }
  });

  it('should not mark all the messages as read if they are already read', async function () {
    const { subscriberId } = session;
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });

    await session.awaitRunningJobs(template._id);

    const notificationsFeedResponse = await getSubscriberNotifications(subscriberId);
    expect(notificationsFeedResponse.totalCount).to.equal(5);

    const subscriber = await subscriberRepository.findBySubscriberId(session.environment._id, subscriberId);
    await messageRepository.update(
      {
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id,
        channel: ChannelTypeEnum.IN_APP,
        seen: false,
        read: false,
      },
      { $set: { read: true, seen: true } }
    );

    const messagesMarkedAsReadResponse = await markAllSubscriberMessagesAs(subscriberId, MessagesStatusEnum.READ);
    expect(messagesMarkedAsReadResponse).to.equal(0);

    const feed = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id,
      channel: ChannelTypeEnum.IN_APP,
      seen: true,
      read: true,
    });

    expect(feed.length).to.equal(5);
    for (const message of feed) {
      expect(message.seen).to.equal(true);
      expect(message.read).to.equal(true);
    }
  });

  it('should mark all the subscriber messages as unread', async function () {
    const { subscriberId } = session;
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });

    await session.awaitRunningJobs(template._id);

    const notificationsFeedResponse = await getSubscriberNotifications(subscriberId);
    expect(notificationsFeedResponse.totalCount).to.equal(5);

    const subscriber = await subscriberRepository.findBySubscriberId(session.environment._id, subscriberId);
    await messageRepository.update(
      {
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id,
        channel: ChannelTypeEnum.IN_APP,
        seen: false,
        read: false,
      },
      { $set: { read: true, seen: true } }
    );

    const messagesMarkedAsReadResponse = await markAllSubscriberMessagesAs(subscriberId, MessagesStatusEnum.UNREAD);
    expect(messagesMarkedAsReadResponse).to.equal(5);

    const feed = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id,
      channel: ChannelTypeEnum.IN_APP,
      seen: true,
      read: false,
    });

    expect(feed.length).to.equal(5);
    for (const message of feed) {
      expect(message.seen).to.equal(true);
      expect(message.read).to.equal(false);
    }
  });

  it('should mark all the subscriber messages as seen', async function () {
    const { subscriberId } = session;
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });

    await session.awaitRunningJobs(template._id);

    const notificationsFeedResponse = await getSubscriberNotifications(subscriberId);
    expect(notificationsFeedResponse.totalCount).to.equal(5);

    const messagesMarkedAsReadResponse = await markAllSubscriberMessagesAs(subscriberId, MessagesStatusEnum.SEEN);
    expect(messagesMarkedAsReadResponse).to.equal(5);

    const subscriber = await subscriberRepository.findBySubscriberId(session.environment._id, subscriberId);
    const feed = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id,
      channel: ChannelTypeEnum.IN_APP,
      seen: true,
      read: false,
    });

    expect(feed.length).to.equal(5);
    for (const message of feed) {
      expect(message.seen).to.equal(true);
      expect(message.read).to.equal(false);
    }
  });

  it('should mark all the subscriber messages as unseen', async function () {
    const { subscriberId } = session;
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });

    await session.awaitRunningJobs(template._id);

    const notificationsFeedResponse = await getSubscriberNotifications(subscriberId);
    expect(notificationsFeedResponse.totalCount).to.equal(5);

    const subscriber = await subscriberRepository.findBySubscriberId(session.environment._id, subscriberId);
    await messageRepository.update(
      {
        _environmentId: session.environment._id,
        _subscriberId: subscriber?._id,
        channel: ChannelTypeEnum.IN_APP,
        seen: false,
        read: false,
      },
      { $set: { seen: true } }
    );

    const messagesMarkedAsReadResponse = await markAllSubscriberMessagesAs(subscriberId, MessagesStatusEnum.UNSEEN);
    expect(messagesMarkedAsReadResponse).to.equal(5);

    const feed = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber?._id,
      channel: ChannelTypeEnum.IN_APP,
      seen: false,
      read: false,
    });

    expect(feed.length).to.equal(5);
    for (const message of feed) {
      expect(message.seen).to.equal(false);
      expect(message.read).to.equal(false);
    }
  });
  async function markAllSubscriberMessagesAs(subscriberId: string, markAs: MessagesStatusEnum) {
    const res = await novuClient.subscribers.messages.markAll({ markAs }, subscriberId);

    return res.result;
  }
  async function getSubscriberNotifications(subscriberId: string) {
    const res = await novuClient.subscribers.notifications.feed({
      subscriberId,
      limit: 100,
    });

    return res.result;
  }
});

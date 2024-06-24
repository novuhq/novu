import * as sinon from 'sinon';
import { expect } from 'chai';
import { MessageRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum, MessagesStatusEnum } from '@novu/shared';
import { buildMessageCountKey, CachedQuery } from '@novu/application-generic';

import { NotificationsCount } from './notifications-count.usecase';
import { NotificationsCountCommand } from './notifications-count.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

sinon.stub(CachedQuery);
sinon.stub(buildMessageCountKey);

describe('NotificationsCount', () => {
  let notificationsCount: NotificationsCount;
  let messageRepository: sinon.SinonStubbedInstance<MessageRepository>;
  let subscriberRepository: sinon.SinonStubbedInstance<SubscriberRepository>;

  beforeEach(() => {
    messageRepository = sinon.createStubInstance(MessageRepository);
    subscriberRepository = sinon.createStubInstance(SubscriberRepository);

    notificationsCount = new NotificationsCount(messageRepository as any, subscriberRepository as any);
  });

  describe('execute', () => {
    it('should throw ApiException if subscriber is not found', async () => {
      subscriberRepository.findBySubscriberId.resolves(null);

      const command: NotificationsCountCommand = {
        organizationId: 'organizationId',
        environmentId: 'environmentId',
        subscriberId: 'subscriber-id',
        status: [MessagesStatusEnum.UNREAD],
      };

      try {
        await notificationsCount.execute(command);
      } catch (error) {
        expect(error).to.be.instanceOf(ApiException);
        expect(error.message).to.equal(
          `Subscriber ${command.subscriberId} doesn't exist in environment ${command.environmentId}`
        );
      }
    });

    it('should return the correct count of notifications', async () => {
      const subscriber = { _id: 'subscriber-id' };
      const count = 42;

      subscriberRepository.findBySubscriberId.resolves(subscriber as any);
      messageRepository.getCount.resolves(count);

      const command: NotificationsCountCommand = {
        organizationId: 'organizationId',
        environmentId: 'environmentId',
        subscriberId: 'subscriber-id',
        status: [MessagesStatusEnum.UNREAD],
      };

      const result = await notificationsCount.execute(command);

      expect(result).to.deep.equal({ count });
      expect(subscriberRepository.findBySubscriberId.calledOnce).to.be.true;
      expect(messageRepository.getCount.calledOnce).to.be.true;
      expect(
        messageRepository.getCount.calledWith(
          command.environmentId,
          subscriber._id,
          ChannelTypeEnum.IN_APP,
          {
            read: false,
          },
          { limit: 100 }
        )
      ).to.be.true;
    });

    it('should construct the query correctly', async () => {
      const environmentId = 'environmentId';
      const subscriber = { _id: 'subscriber-id' };
      const count = 42;

      subscriberRepository.findBySubscriberId.resolves(subscriber as any);
      messageRepository.getCount.resolves(count);

      await notificationsCount.execute({
        organizationId: 'organizationId',
        environmentId,
        subscriberId: 'subscriber-id',
        status: [MessagesStatusEnum.READ],
      });

      expect(
        messageRepository.getCount.calledWith(
          environmentId,
          subscriber._id,
          ChannelTypeEnum.IN_APP,
          {
            read: true,
          },
          { limit: 100 }
        )
      ).to.be.true;

      await notificationsCount.execute({
        organizationId: 'organizationId',
        environmentId,
        subscriberId: 'subscriber-id',
        status: [MessagesStatusEnum.UNREAD],
      });

      expect(
        messageRepository.getCount.calledWith(
          environmentId,
          subscriber._id,
          ChannelTypeEnum.IN_APP,
          {
            read: false,
          },
          { limit: 100 }
        )
      ).to.be.true;

      await notificationsCount.execute({
        organizationId: 'organizationId',
        environmentId,
        subscriberId: 'subscriber-id',
        status: [MessagesStatusEnum.READ, MessagesStatusEnum.UNREAD],
      });

      expect(
        messageRepository.getCount.calledWith(
          environmentId,
          subscriber._id,
          ChannelTypeEnum.IN_APP,
          {
            read: undefined,
          },
          { limit: 100 }
        )
      ).to.be.true;

      await notificationsCount.execute({
        organizationId: 'organizationId',
        environmentId,
        subscriberId: 'subscriber-id',
        status: [MessagesStatusEnum.SEEN],
      });

      expect(
        messageRepository.getCount.calledWith(
          environmentId,
          subscriber._id,
          ChannelTypeEnum.IN_APP,
          {
            seen: true,
          },
          { limit: 100 }
        )
      ).to.be.true;

      await notificationsCount.execute({
        organizationId: 'organizationId',
        environmentId,
        subscriberId: 'subscriber-id',
        status: [MessagesStatusEnum.UNSEEN],
      });

      expect(
        messageRepository.getCount.calledWith(
          environmentId,
          subscriber._id,
          ChannelTypeEnum.IN_APP,
          {
            seen: false,
          },
          { limit: 100 }
        )
      ).to.be.true;

      await notificationsCount.execute({
        organizationId: 'organizationId',
        environmentId,
        subscriberId: 'subscriber-id',
        status: [MessagesStatusEnum.SEEN, MessagesStatusEnum.UNSEEN],
      });

      expect(
        messageRepository.getCount.calledWith(
          environmentId,
          subscriber._id,
          ChannelTypeEnum.IN_APP,
          {
            seen: undefined,
          },
          { limit: 100 }
        )
      ).to.be.true;

      await notificationsCount.execute({
        organizationId: 'organizationId',
        environmentId,
        subscriberId: 'subscriber-id',
        status: [MessagesStatusEnum.READ, MessagesStatusEnum.SEEN],
      });

      expect(
        messageRepository.getCount.calledWith(
          environmentId,
          subscriber._id,
          ChannelTypeEnum.IN_APP,
          {
            read: true,
            seen: true,
          },
          { limit: 100 }
        )
      ).to.be.true;
    });
  });
});

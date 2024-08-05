import sinon from 'sinon';
import { expect } from 'chai';
import { MessageRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
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
        filters: [{ read: false }],
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

    it('it should throw exception when filtering for unread and archived notifications', async () => {
      const subscriber = { _id: 'subscriber-id' };
      const command: NotificationsCountCommand = {
        environmentId: 'env-1',
        organizationId: 'org-1',
        subscriberId: 'not-found',
        filters: [{ read: false, archived: true }],
      };

      subscriberRepository.findBySubscriberId.resolves(subscriber as any);

      try {
        await notificationsCount.execute(command);
      } catch (error) {
        expect(error).to.be.instanceOf(ApiException);
        expect(error.message).to.equal(`Filtering for unread and archived notifications is not supported.`);
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
        filters: [{ read: false }],
      };

      const result = await notificationsCount.execute(command);
      const filter = { read: false };

      expect(result).to.deep.equal({ data: [{ count, filter }] });
      expect(subscriberRepository.findBySubscriberId.calledOnce).to.be.true;
      expect(messageRepository.getCount.calledOnce).to.be.true;
      expect(
        messageRepository.getCount.calledWith(command.environmentId, subscriber._id, ChannelTypeEnum.IN_APP, filter, {
          limit: 99,
        })
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
        filters: [{ read: true }],
      });

      expect(
        messageRepository.getCount.calledWith(
          environmentId,
          subscriber._id,
          ChannelTypeEnum.IN_APP,
          { read: true },
          { limit: 99 }
        )
      ).to.be.true;

      await notificationsCount.execute({
        organizationId: 'organizationId',
        environmentId,
        subscriberId: 'subscriber-id',
        filters: [{ read: false }],
      });

      expect(
        messageRepository.getCount.calledWith(
          environmentId,
          subscriber._id,
          ChannelTypeEnum.IN_APP,
          { read: false },
          { limit: 99 }
        )
      ).to.be.true;

      await notificationsCount.execute({
        organizationId: 'organizationId',
        environmentId,
        subscriberId: 'subscriber-id',
        filters: [{}],
      });

      expect(
        messageRepository.getCount.calledWith(environmentId, subscriber._id, ChannelTypeEnum.IN_APP, {}, { limit: 99 })
      ).to.be.true;

      await notificationsCount.execute({
        organizationId: 'organizationId',
        environmentId,
        subscriberId: 'subscriber-id',
        filters: [{ archived: true }],
      });

      expect(
        messageRepository.getCount.calledWith(
          environmentId,
          subscriber._id,
          ChannelTypeEnum.IN_APP,
          { archived: true },
          { limit: 99 }
        )
      ).to.be.true;

      await notificationsCount.execute({
        organizationId: 'organizationId',
        environmentId,
        subscriberId: 'subscriber-id',
        filters: [{ archived: false }],
      });

      expect(
        messageRepository.getCount.calledWith(
          environmentId,
          subscriber._id,
          ChannelTypeEnum.IN_APP,
          { archived: false },
          { limit: 99 }
        )
      ).to.be.true;

      await notificationsCount.execute({
        organizationId: 'organizationId',
        environmentId,
        subscriberId: 'subscriber-id',
        filters: [{}],
      });

      expect(
        messageRepository.getCount.calledWith(environmentId, subscriber._id, ChannelTypeEnum.IN_APP, {}, { limit: 99 })
      ).to.be.true;

      await notificationsCount.execute({
        organizationId: 'organizationId',
        environmentId,
        subscriberId: 'subscriber-id',
        filters: [{ read: true, archived: true }],
      });

      expect(
        messageRepository.getCount.calledWith(
          environmentId,
          subscriber._id,
          ChannelTypeEnum.IN_APP,
          { read: true, archived: true },
          { limit: 99 }
        )
      ).to.be.true;
    });
  });
});

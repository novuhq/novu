import { Injectable, NotFoundException } from '@nestjs/common';
import {
  MessageEntity,
  DalException,
  MessageRepository,
  SubscriberRepository,
  SubscriberEntity,
  MemberRepository,
  FeedRepository,
  FeedEntity,
} from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import {
  WsQueueService,
  AnalyticsService,
  InvalidateCacheService,
  buildFeedKey,
  buildMessageCountKey,
} from '@novu/application-generic';

import { RemoveAllMessagesCommand } from './remove-all-messages.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { MarkEnum } from '../mark-message-as/mark-message-as.command';

@Injectable()
export class RemoveAllMessages {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private messageRepository: MessageRepository,
    private wsQueueService: WsQueueService,
    private analyticsService: AnalyticsService,
    private subscriberRepository: SubscriberRepository,
    private memberRepository: MemberRepository,
    private feedRepository: FeedRepository
  ) {}

  async execute(command: RemoveAllMessagesCommand): Promise<void> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
    if (!subscriber) throw new NotFoundException(`Subscriber ${command.subscriberId} not found`);

    try {
      let feed;
      if (command.feedId) {
        feed = await this.feedRepository.findById(command.feedId);
        if (!feed) {
          throw new NotFoundException(`Feed with ${command.feedId} not found`);
        }
      }

      const deleteMessageQuery: Partial<MessageEntity> = {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _subscriberId: subscriber._id,
        channel: ChannelTypeEnum.IN_APP,
      };

      if (feed) {
        deleteMessageQuery._feedId = feed._id;
      }

      await this.messageRepository.deleteMany(deleteMessageQuery);

      await this.updateServices(command, subscriber, MarkEnum.SEEN);
      await this.updateServices(command, subscriber, MarkEnum.READ);

      const admin = await this.memberRepository.getOrganizationAdminAccount(command.organizationId);
      if (admin) {
        this.analyticsService.track(`Removed Message - [Notification Center]`, admin._userId, {
          _subscriber: subscriber._id,
          _organization: command.organizationId,
          _environment: command.environmentId,
          _feedId: command.feedId,
        });
      }

      await this.invalidateCache.invalidateQuery({
        key: buildFeedKey().invalidate({
          subscriberId: command.subscriberId,
          _environmentId: command.environmentId,
        }),
      });

      await this.invalidateCache.invalidateQuery({
        key: buildMessageCountKey().invalidate({
          subscriberId: command.subscriberId,
          _environmentId: command.environmentId,
        }),
      });
    } catch (e) {
      if (e instanceof DalException) {
        throw new ApiException(e.message);
      }
      throw e;
    }
  }

  private async updateServices(command: RemoveAllMessagesCommand, subscriber, marked: string, feed?: FeedEntity) {
    let count = 0;
    if (feed) {
      count = await this.messageRepository.getCount(
        command.environmentId,
        subscriber._id,
        ChannelTypeEnum.IN_APP,
        {
          [marked]: false,
        },
        { limit: 1000 }
      );
    }
    this.updateSocketCount(subscriber, count, marked);
  }

  private updateSocketCount(subscriber: SubscriberEntity, count: number, mark: string) {
    const eventMessage = `un${mark}_count_changed`;
    const countKey = `un${mark}Count`;

    this.wsQueueService.bullMqService.add(
      'sendMessage',
      {
        event: eventMessage,
        userId: subscriber._id,
        payload: {
          [countKey]: count,
        },
      },
      {},
      subscriber._organizationId
    );
  }
}

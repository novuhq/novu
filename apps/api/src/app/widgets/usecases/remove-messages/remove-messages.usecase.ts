import { Injectable, NotFoundException } from '@nestjs/common';
import {
  MessageEntity,
  DalException,
  MessageRepository,
  SubscriberRepository,
  SubscriberEntity,
  MemberRepository,
  FeedRepository,
} from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import {
  WsQueueService,
  AnalyticsService,
  InvalidateCacheService,
  buildFeedKey,
  buildMessageCountKey,
} from '@novu/application-generic';

import { RemoveMessagesCommand } from './remove-messages.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { MarkEnum } from '../mark-message-as/mark-message-as.command';

@Injectable()
export class RemoveMessages {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private messageRepository: MessageRepository,
    private wsQueueService: WsQueueService,
    private analyticsService: AnalyticsService,
    private subscriberRepository: SubscriberRepository,
    private memberRepository: MemberRepository,
    private feedRepository: FeedRepository
  ) {}

  async execute(command: RemoveMessagesCommand): Promise<number> {
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

    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
    if (!subscriber) throw new NotFoundException(`Subscriber ${command.subscriberId} not found`);

    let deletedMessages;
    let feed;
    if (command.feedId !== '' && command.feedId !== null && command.feedId !== undefined) {
      feed = await this.feedRepository.findById(command.feedId);
      if (!feed) {
        throw new NotFoundException(`Feed with ${command.feedId} not found`);
      }
    }
    try {
      const deleteMessageQuery: Partial<MessageEntity> = {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _subscriberId: subscriber._id,
        channel: ChannelTypeEnum.IN_APP,
      };

      if (feed) {
        deleteMessageQuery._feedId = feed._id;
      }

      deletedMessages = await this.messageRepository.deleteMany(deleteMessageQuery);

      // count is 0 because all messages are deleted
      await this.updateSocketCount(subscriber, 0, MarkEnum.SEEN);
      await this.updateSocketCount(subscriber, 0, MarkEnum.READ);

      const admin = await this.memberRepository.getOrganizationAdminAccount(command.organizationId);
      if (admin) {
        this.analyticsService.track(`Removed Message - [Notification Center]`, admin._userId, {
          _subscriber: subscriber._id,
          _organization: command.organizationId,
          _environment: command.environmentId,
        });
      }
    } catch (e) {
      if (e instanceof DalException) {
        throw new ApiException(e.message);
      }
      throw e;
    }

    return deletedMessages.modifiedCount;
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

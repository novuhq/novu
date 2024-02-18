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
import { ChannelTypeEnum, WebSocketEventEnum } from '@novu/shared';
import {
  WebSocketsQueueService,
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
    private webSocketsQueueService: WebSocketsQueueService,
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
        feed = await this.feedRepository.findOne({ _id: command.feedId, _organizationId: command.organizationId });
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
        this.analyticsService.track(`Removed All Feed Messages - [Notification Center]`, admin._userId, {
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

  private async updateServices(command: RemoveAllMessagesCommand, subscriber, marked: string) {
    this.updateSocketCount(subscriber, marked);
  }

  private updateSocketCount(subscriber: SubscriberEntity, mark: string) {
    const eventMessage = mark === MarkEnum.READ ? WebSocketEventEnum.UNREAD : WebSocketEventEnum.UNSEEN;

    this.webSocketsQueueService.add({
      name: 'sendMessage',
      data: {
        event: eventMessage,
        userId: subscriber._id,
        _environmentId: subscriber._environmentId,
      },
      groupId: subscriber._organizationId,
    });
  }
}

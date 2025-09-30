import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
  buildFeedKey,
  buildMessageCountKey,
  InvalidateCacheService,
  WebSocketsQueueService,
} from '@novu/application-generic';
import {
  DalException,
  EnforceEnvId,
  FeedRepository,
  MessageEntity,
  MessageRepository,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';
import { ChannelTypeEnum, WebSocketEventEnum } from '@novu/shared';
import { MarkEnum } from '../mark-message-as/mark-message-as.command';
import { RemoveAllMessagesCommand } from './remove-all-messages.command';

@Injectable()
export class RemoveAllMessages {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private messageRepository: MessageRepository,
    private webSocketsQueueService: WebSocketsQueueService,
    private analyticsService: AnalyticsService,
    private subscriberRepository: SubscriberRepository,
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

      const deleteMessageQuery: Partial<MessageEntity> & EnforceEnvId = {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _subscriberId: subscriber._id,
        channel: ChannelTypeEnum.IN_APP,
      };

      if (feed) {
        deleteMessageQuery._feedId = feed._id;
      }
      const deletedMessages = await this.messageRepository.delete(deleteMessageQuery);

      if (deletedMessages.deletedCount > 0) {
        await Promise.all([
          this.updateServices(command, subscriber, MarkEnum.SEEN),
          this.updateServices(command, subscriber, MarkEnum.READ),
          this.invalidateCache.invalidateQuery({
            key: buildFeedKey().invalidate({
              subscriberId: command.subscriberId,
              _environmentId: command.environmentId,
            }),
          }),
          this.invalidateCache.invalidateQuery({
            key: buildMessageCountKey().invalidate({
              subscriberId: command.subscriberId,
              _environmentId: command.environmentId,
            }),
          }),
        ]);
      }

      this.analyticsService.track(`Removed All Feed Messages - [Notification Center]`, command.organizationId, {
        _subscriber: subscriber._id,
        _organization: command.organizationId,
        _environment: command.environmentId,
        _feedId: command.feedId,
      });
    } catch (e) {
      if (e instanceof DalException) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }
  }

  private async updateServices(command: RemoveAllMessagesCommand, subscriber, marked: string): Promise<void> {
    await this.updateSocketCount(subscriber, marked);
  }

  private async updateSocketCount(subscriber: SubscriberEntity, mark: string): Promise<void> {
    const eventMessage = mark === MarkEnum.READ ? WebSocketEventEnum.UNREAD : WebSocketEventEnum.UNSEEN;

    await this.webSocketsQueueService.add({
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

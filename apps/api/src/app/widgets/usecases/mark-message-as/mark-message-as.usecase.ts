import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MessageEntity, MessageRepository, SubscriberRepository, SubscriberEntity, MemberRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { AnalyticsService } from '@novu/application-generic';

import { CacheKeyPrefixEnum, InvalidateCacheService } from '../../../shared/services/cache';
import { QueueService } from '../../../shared/services/queue';
import { ANALYTICS_SERVICE } from '../../../shared/shared.module';
import { MarkEnum, MarkMessageAsCommand } from './mark-message-as.command';
import { CachedEntity } from '../../../shared/interceptors/cached-entity.interceptor';
import { buildCommonKey, CacheKeyTypeEnum, queryBuilder } from '../../../shared/services/cache/keys';

@Injectable()
export class MarkMessageAs {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private messageRepository: MessageRepository,
    private queueService: QueueService,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService,
    private subscriberRepository: SubscriberRepository,
    private memberRepository: MemberRepository
  ) {}

  async execute(command: MarkMessageAsCommand): Promise<MessageEntity[]> {
    await this.invalidateCache.invalidateQuery({
      key: queryBuilder().feed().invalidate({
        subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
      }),
    });

    await this.invalidateCache.invalidateQuery({
      key: queryBuilder().messageCount().invalidate({
        subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
      }),
    });

    const subscriber = await this.fetchSubscriber({
      _environmentId: command.environmentId,
      subscriberId: command.subscriberId,
    });

    if (!subscriber) throw new NotFoundException(`Subscriber ${command.subscriberId} not found`);

    await this.messageRepository.changeStatus(command.environmentId, subscriber._id, command.messageIds, command.mark);

    const messages = await this.messageRepository.find({
      _environmentId: command.environmentId,
      _id: {
        $in: command.messageIds,
      },
    });

    if (command.mark.seen != null) {
      await this.updateServices(command, subscriber, messages, MarkEnum.SEEN);
    }

    if (command.mark.read != null) {
      await this.updateServices(command, subscriber, messages, MarkEnum.READ);
    }

    return messages;
  }

  private async updateServices(command: MarkMessageAsCommand, subscriber, messages, marked: string) {
    const admin = await this.memberRepository.getOrganizationAdminAccount(command.organizationId);
    const count = await this.messageRepository.getCount(command.environmentId, subscriber._id, ChannelTypeEnum.IN_APP, {
      [marked]: false,
    });

    this.updateSocketCount(subscriber, count, marked);

    for (const message of messages) {
      if (admin) {
        this.analyticsService.track(`Mark as ${marked} - [Notification Center]`, admin._userId, {
          _subscriber: message._subscriberId,
          _organization: command.organizationId,
          _template: message._templateId,
        });
      }
    }
  }

  private updateSocketCount(subscriber: SubscriberEntity, count: number, mark: string) {
    const eventMessage = `un${mark}_count_changed`;
    const countKey = `un${mark}Count`;

    this.queueService.wsSocketQueue.add({
      event: eventMessage,
      userId: subscriber._id,
      payload: {
        [countKey]: count,
      },
    });
  }
  @CachedEntity({
    builder: (command: { subscriberId: string; _environmentId: string }) =>
      buildCommonKey({
        type: CacheKeyTypeEnum.ENTITY,
        keyEntity: CacheKeyPrefixEnum.SUBSCRIBER,
        environmentId: command._environmentId,
        identifier: command.subscriberId,
        identifierPrefix: 's',
      }),
  })
  private async fetchSubscriber({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }): Promise<SubscriberEntity | null> {
    return await this.subscriberRepository.findBySubscriberId(_environmentId, subscriberId);
  }
}

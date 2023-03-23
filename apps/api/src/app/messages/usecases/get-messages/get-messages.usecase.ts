import { BadRequestException, Injectable } from '@nestjs/common';
import { MessageEntity, MessageRepository, SubscriberRepository, SubscriberEntity } from '@novu/dal';
import {
  ChannelTypeEnum,
  IMessageButton,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IEmailBlock,
  InAppProviderIdEnum,
  ActorTypeEnum,
  IActor,
} from '@novu/shared';
import { GetMessagesCommand } from './get-messages.command';
import { CachedEntity } from '../../../shared/interceptors/cached-entity.interceptor';
import { buildSubscriberKey } from '../../../shared/services/cache/key-builders/entities';

@Injectable()
export class GetMessages {
  constructor(private messageRepository: MessageRepository, private subscriberRepository: SubscriberRepository) {}

  async execute(command: GetMessagesCommand) {
    const LIMIT = command.limit;

    if (LIMIT > 1000) {
      throw new BadRequestException('Limit can not be larger then 1000');
    }

    const query: Partial<MessageEntity> & { _environmentId: string } = {
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    };

    if (command.subscriberId) {
      const subscriber = await this.fetchSubscriber({
        _environmentId: command.environmentId,
        subscriberId: command.subscriberId,
      });

      if (subscriber) {
        query._subscriberId = subscriber._id;
      }
    }

    if (command.channel) {
      query.channel = command.channel;
    }

    const totalCount = await this.messageRepository.count(query);

    const data = await this.messageRepository.find(query, '', {
      limit: LIMIT,
      skip: command.page * LIMIT,
    });

    for (const message of data) {
      if (message._actorId && message.actor?.type === ActorTypeEnum.USER) {
        message.actor.data = await this.processAvatar(message._actorId, command.environmentId);
      }
    }

    return {
      page: command.page,
      totalCount,
      pageSize: LIMIT,
      data,
    };
  }

  @CachedEntity({
    builder: (command: { subscriberId: string; _environmentId: string }) =>
      buildSubscriberKey({
        _environmentId: command._environmentId,
        subscriberId: command.subscriberId,
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

  private async processAvatar(actorId: string, environmentId: string): Promise<string | null> {
    const actorSubscriber: SubscriberEntity | null = await this.subscriberRepository.findOne(
      {
        _environmentId: environmentId,
        _id: actorId,
      },
      'avatar'
    );

    return actorSubscriber?.avatar || null;
  }
}

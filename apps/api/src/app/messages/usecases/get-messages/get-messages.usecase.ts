import { BadRequestException, Injectable } from '@nestjs/common';
import { MessageEntity, MessageRepository, SubscriberRepository, SubscriberEntity } from '@novu/dal';
import { CachedEntity, buildSubscriberKey } from '@novu/application-generic';
import { ActorTypeEnum } from '@novu/shared';

import { GetMessagesCommand } from './get-messages.command';

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

    const data = await this.messageRepository.getMessages(query, '', {
      limit: LIMIT,
      skip: command.page * LIMIT,
    });

    for (const message of data) {
      if (message._actorId && message.actor?.type === ActorTypeEnum.USER) {
        message.actor.data = this.processUserAvatar(message.actorSubscriber);
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

  private processUserAvatar(actorSubscriber?: SubscriberEntity): string | null {
    return actorSubscriber?.avatar || null;
  }
}

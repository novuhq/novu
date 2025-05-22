import { Injectable, NotFoundException } from '@nestjs/common';
import { TopicSubscribersEntity, TopicSubscribersRepository } from '@novu/dal';

import { GetTopicSubscriberCommand } from './get-topic-subscriber.command';

import { TopicSubscriberDto } from '../../dtos';

@Injectable()
export class GetTopicSubscriberUseCase {
  constructor(private topicSubscribersRepository: TopicSubscribersRepository) {}

  async execute(command: GetTopicSubscriberCommand): Promise<TopicSubscriberDto> {
    const topicSubscriber = await this.topicSubscribersRepository.findOneByTopicKeyAndExternalSubscriberId(
      command.environmentId,
      command.organizationId,
      command.topicKey,
      command.externalSubscriberId
    );

    if (!topicSubscriber) {
      throw new NotFoundException(
        `Subscriber ${command.externalSubscriberId} not found for topic ${command.topicKey} in the environment ${command.environmentId}`
      );
    }

    return this.mapFromEntity(topicSubscriber);
  }

  private mapFromEntity(topicSubscriber: TopicSubscribersEntity): TopicSubscriberDto {
    return {
      externalSubscriberId: topicSubscriber.externalSubscriberId,
      topicKey: topicSubscriber.topicKey,
      _topicId: topicSubscriber._topicId,
      _organizationId: topicSubscriber._organizationId,
      _environmentId: topicSubscriber._environmentId,
      _subscriberId: topicSubscriber._subscriberId,
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { TopicSubscribersEntity, TopicSubscribersRepository, TopicRepository } from '@novu/dal';

import { GetTopicSubscribersCommand } from './get-topic-subscribers.command';

import { TopicSubscribersDto } from '../../dtos/topic-subscribers.dto';

@Injectable()
export class GetTopicSubscribersUseCase {
  constructor(
    private topicSubscribersRepository: TopicSubscribersRepository,
    private topicRepository: TopicRepository
  ) {}

  async execute(command: GetTopicSubscribersCommand) {
    const topic = await this.topicRepository.findTopicByKey(
      command.topicKey,
      command.organizationId,
      command.environmentId
    );
    if (!topic) {
      throw new NotFoundException(`Topic with key ${command.topicKey} not found in current environment`);
    }

    const topicSubscribers = await this.topicSubscribersRepository.findSubscribersByTopicId(
      command.environmentId,
      command.organizationId,
      topic._id
    );

    if (!topicSubscribers) {
      throw new NotFoundException(
        `Topic id ${command.topicKey} for the organization ${command.organizationId} in the environment ${command.environmentId} has no entity with subscribers`
      );
    }

    return topicSubscribers.map(this.mapFromEntity);
  }

  private mapFromEntity(topicSubscribers: TopicSubscribersEntity): TopicSubscribersDto {
    return {
      ...topicSubscribers,
      topicKey: topicSubscribers.topicKey,
      _topicId: topicSubscribers._topicId,
      _organizationId: topicSubscribers._organizationId,
      _environmentId: topicSubscribers._environmentId,
      _subscriberId: topicSubscribers._subscriberId,
    };
  }
}

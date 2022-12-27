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
      TopicRepository.convertStringToObjectId(command.organizationId),
      TopicRepository.convertStringToObjectId(command.environmentId)
    );
    if (!topic) {
      throw new NotFoundException(`Topic with key ${command.topicKey} not found in current environment`);
    }

    const topicSubscribers = await this.topicSubscribersRepository.findSubscribersByTopicId(
      TopicRepository.convertStringToObjectId(command.environmentId),
      TopicRepository.convertStringToObjectId(command.organizationId),
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
      _topicId: TopicSubscribersRepository.convertObjectIdToString(topicSubscribers._topicId),
      _organizationId: TopicSubscribersRepository.convertObjectIdToString(topicSubscribers._organizationId),
      _environmentId: TopicSubscribersRepository.convertObjectIdToString(topicSubscribers._environmentId),
      _subscriberId: TopicSubscribersRepository.convertObjectIdToString(topicSubscribers._subscriberId),
    };
  }
}

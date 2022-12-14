import { TopicSubscribersEntity, TopicSubscribersRepository } from '@novu/dal';
import { Injectable } from '@nestjs/common';

import { CreateTopicSubscribersCommand } from './create-topic-subscribers.command';

import { TopicSubscribersDto } from '../../dtos/topic-subscribers.dto';

@Injectable()
export class CreateTopicSubscribersUseCase {
  constructor(private topicSubscribersRepository: TopicSubscribersRepository) {}

  async execute(command: CreateTopicSubscribersCommand) {
    const entity = this.mapToEntity(command);

    const topicSubscribers = await this.topicSubscribersRepository.create(entity);

    return this.mapFromEntity(topicSubscribers);
  }

  private mapToEntity(domainEntity: CreateTopicSubscribersCommand): TopicSubscribersEntity {
    return {
      _environmentId: TopicSubscribersRepository.convertStringToObjectId(domainEntity.environmentId),
      _organizationId: TopicSubscribersRepository.convertStringToObjectId(domainEntity.organizationId),
      _topicId: TopicSubscribersRepository.convertStringToObjectId(domainEntity.topicId),
      _userId: TopicSubscribersRepository.convertStringToObjectId(domainEntity.userId),
      subscribers: [],
    };
  }

  private mapFromEntity(topicSubscribers: TopicSubscribersEntity): TopicSubscribersDto {
    return {
      ...topicSubscribers,
      _environmentId: TopicSubscribersRepository.convertObjectIdToString(topicSubscribers._environmentId),
      _organizationId: TopicSubscribersRepository.convertObjectIdToString(topicSubscribers._organizationId),
      _topicId: TopicSubscribersRepository.convertObjectIdToString(topicSubscribers._topicId),
      _userId: TopicSubscribersRepository.convertObjectIdToString(topicSubscribers._userId),
    };
  }
}

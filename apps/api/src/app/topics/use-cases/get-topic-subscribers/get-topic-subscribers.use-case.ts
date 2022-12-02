import { Injectable, NotFoundException } from '@nestjs/common';
import { TopicSubscribersEntity, TopicSubscribersRepository } from '@novu/dal';

import { GetTopicSubscribersCommand } from './get-topic-subscribers.command';

import { TopicSubscribersDto } from '../../dtos/topic-subscribers.dto';

@Injectable()
export class GetTopicSubscribersUseCase {
  constructor(private topicSubscribersRepository: TopicSubscribersRepository) {}

  async execute(command: GetTopicSubscribersCommand) {
    const entity = this.mapToEntity(command);
    const topicSubscribers = await this.topicSubscribersRepository.findOne(entity);

    if (!topicSubscribers) {
      throw new NotFoundException(
        `Topic id ${command.topicId} for the user ${command.userId} has no entity with subscribers`
      );
    }

    return this.mapFromEntity(topicSubscribers);
  }

  private mapToEntity(domainEntity: GetTopicSubscribersCommand): Omit<TopicSubscribersEntity, 'subscribers'> {
    return {
      _environmentId: TopicSubscribersRepository.convertStringToObjectId(domainEntity.environmentId),
      _topicId: TopicSubscribersRepository.convertStringToObjectId(domainEntity.topicId),
      _organizationId: TopicSubscribersRepository.convertStringToObjectId(domainEntity.organizationId),
      _userId: TopicSubscribersRepository.convertStringToObjectId(domainEntity.userId),
    };
  }

  private mapFromEntity(topicSubscribers: TopicSubscribersEntity): TopicSubscribersDto {
    return {
      ...topicSubscribers,
      _topicId: TopicSubscribersRepository.convertObjectIdToString(topicSubscribers._topicId),
      _organizationId: TopicSubscribersRepository.convertObjectIdToString(topicSubscribers._organizationId),
      _environmentId: TopicSubscribersRepository.convertObjectIdToString(topicSubscribers._environmentId),
      _userId: TopicSubscribersRepository.convertObjectIdToString(topicSubscribers._userId),
    };
  }
}

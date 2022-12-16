import { Injectable, NotFoundException } from '@nestjs/common';
import { TopicSubscribersEntity, TopicSubscribersRepository } from '@novu/dal';

import { GetTopicSubscribersCommand } from './get-topic-subscribers.command';

import { TopicSubscribersDto } from '../../dtos/topic-subscribers.dto';

@Injectable()
export class GetTopicSubscribersUseCase {
  constructor(private topicSubscribersRepository: TopicSubscribersRepository) {}

  async execute(command: GetTopicSubscribersCommand) {
    const domainEntity = this.mapToEntity(command);
    const topicSubscribers = await this.topicSubscribersRepository.findSubscribersByTopicId(
      domainEntity._environmentId,
      domainEntity._organizationId,
      domainEntity._topicId
    );

    if (!topicSubscribers) {
      throw new NotFoundException(
        `Topic id ${command.topicId} for the organization ${command.organizationId} in the environment ${command.environmentId} has no entity with subscribers`
      );
    }

    return topicSubscribers.map(this.mapFromEntity);
  }

  private mapToEntity(
    command: GetTopicSubscribersCommand
  ): Omit<TopicSubscribersEntity, '_subscriberId' | 'externalSubscriberId'> {
    return {
      _environmentId: TopicSubscribersRepository.convertStringToObjectId(command.environmentId),
      _topicId: TopicSubscribersRepository.convertStringToObjectId(command.topicId),
      _organizationId: TopicSubscribersRepository.convertStringToObjectId(command.organizationId),
    };
  }

  private mapFromEntity(topicSubscribers: TopicSubscribersEntity): TopicSubscribersDto {
    return {
      ...topicSubscribers,
      _topicId: TopicSubscribersRepository.convertObjectIdToString(topicSubscribers._topicId),
      _organizationId: TopicSubscribersRepository.convertObjectIdToString(topicSubscribers._organizationId),
      _environmentId: TopicSubscribersRepository.convertObjectIdToString(topicSubscribers._environmentId),
      _subscriberId: TopicSubscribersRepository.convertObjectIdToString(topicSubscribers._subscriberId),
    };
  }
}

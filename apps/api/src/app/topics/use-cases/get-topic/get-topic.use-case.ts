import { Injectable, NotFoundException } from '@nestjs/common';
import { TopicEntity, TopicRepository } from '@novu/dal';

import { GetTopicCommand } from './get-topic.command';

import { TopicDto } from '../../dtos/topic.dto';

@Injectable()
export class GetTopicUseCase {
  constructor(private topicRepository: TopicRepository) {}

  async execute(command: GetTopicCommand) {
    const entity = this.mapToEntity(command);
    const topic = await this.topicRepository.findTopic(entity);

    if (!topic) {
      throw new NotFoundException(`Topic not found for id ${command.id} for the user ${command.userId}`);
    }

    return this.mapFromEntity(topic);
  }

  private mapToEntity(domainEntity: GetTopicCommand): Omit<TopicEntity, 'key' | 'name'> {
    return {
      _environmentId: TopicRepository.convertStringToObjectId(domainEntity.environmentId),
      _id: TopicRepository.convertStringToObjectId(domainEntity.id),
      _organizationId: TopicRepository.convertStringToObjectId(domainEntity.organizationId),
      _userId: TopicRepository.convertStringToObjectId(domainEntity.userId),
    };
  }

  private mapFromEntity(topic: TopicEntity): TopicDto {
    return {
      ...topic,
      _id: TopicRepository.convertObjectIdToString(topic._id),
      _organizationId: TopicRepository.convertObjectIdToString(topic._organizationId),
      _environmentId: TopicRepository.convertObjectIdToString(topic._environmentId),
      _userId: TopicRepository.convertObjectIdToString(topic._userId),
    };
  }
}

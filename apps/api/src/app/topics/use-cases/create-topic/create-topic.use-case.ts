import { TopicEntity, TopicRepository } from '@novu/dal';
import { ConflictException, Injectable } from '@nestjs/common';

import { CreateTopicCommand } from './create-topic.command';

import { TopicDto } from '../../dtos/topic.dto';

@Injectable()
export class CreateTopicUseCase {
  constructor(private topicRepository: TopicRepository) {}

  async execute(command: CreateTopicCommand) {
    const entity = this.mapToEntity(command);

    const topicExists = await this.topicRepository.findTopicByKey(
      entity.key,
      entity._userId,
      entity._organizationId,
      entity._environmentId
    );

    if (topicExists) {
      throw new ConflictException(`There is already a topic with the key ${entity.key} for user ${entity._userId}`);
    }

    const topic = await this.topicRepository.createTopic(entity);

    return this.mapFromEntity(topic);
  }

  private mapToEntity(domainEntity: CreateTopicCommand): Omit<TopicEntity, '_id'> {
    return {
      _environmentId: TopicRepository.convertStringToObjectId(domainEntity.environmentId),
      _organizationId: TopicRepository.convertStringToObjectId(domainEntity.organizationId),
      _userId: TopicRepository.convertStringToObjectId(domainEntity.userId),
      key: domainEntity.key,
      name: domainEntity.name,
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

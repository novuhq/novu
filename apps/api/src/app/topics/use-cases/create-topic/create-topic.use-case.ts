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
      entity._organizationId,
      entity._environmentId
    );

    if (topicExists) {
      throw new ConflictException(
        `Topic exists with key ${entity.key} in the environment ${entity._environmentId} of the organization ${entity._organizationId}`
      );
    }

    const topic = await this.topicRepository.createTopic(entity);

    return this.mapFromEntity(topic);
  }

  private mapToEntity(domainEntity: CreateTopicCommand): Omit<TopicEntity, '_id'> {
    return {
      _environmentId: domainEntity.environmentId,
      _organizationId: domainEntity.organizationId,
      key: domainEntity.key,
      name: domainEntity.name,
    };
  }

  private mapFromEntity(topic: TopicEntity): TopicDto {
    return {
      ...topic,
      _id: topic._id,
      _organizationId: topic._organizationId,
      _environmentId: topic._environmentId,
      subscribers: [],
    };
  }
}

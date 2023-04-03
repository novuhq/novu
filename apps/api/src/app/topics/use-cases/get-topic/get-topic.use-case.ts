import { Injectable, NotFoundException } from '@nestjs/common';
import { TopicEntity, TopicRepository } from '@novu/dal';

import { GetTopicCommand } from './get-topic.command';

import { TopicDto } from '../../dtos';
import { ExternalSubscriberId } from '../../types';

@Injectable()
export class GetTopicUseCase {
  constructor(private topicRepository: TopicRepository) {}

  async execute(command: GetTopicCommand) {
    const topic = await this.topicRepository.findTopic(command.topicKey, command.environmentId);

    if (!topic) {
      throw new NotFoundException(
        `Topic not found for id ${command.topicKey} in the environment ${command.environmentId}`
      );
    }

    return this.mapFromEntity(topic);
  }

  private mapFromEntity(topic: TopicEntity & { subscribers: ExternalSubscriberId[] }): TopicDto {
    return {
      ...topic,
      _id: topic._id,
      _organizationId: topic._organizationId,
      _environmentId: topic._environmentId,
    };
  }
}

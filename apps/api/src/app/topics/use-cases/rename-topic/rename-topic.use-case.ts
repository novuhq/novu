import { Injectable, NotFoundException } from '@nestjs/common';
import { TopicEntity, TopicRepository } from '@novu/dal';

import { RenameTopicCommand } from './rename-topic.command';

import { GetTopicUseCase, GetTopicCommand } from '../get-topic';
import { TopicDto } from '../../dtos/topic.dto';

@Injectable()
export class RenameTopicUseCase {
  constructor(private getTopicUseCase: GetTopicUseCase, private topicRepository: TopicRepository) {}

  async execute(command: RenameTopicCommand): Promise<TopicDto> {
    await this.getTopicUseCase.execute(command);

    const entity = this.mapToEntity(command);
    const renamedTopic = await this.topicRepository.renameTopic(entity);

    return this.mapFromEntity(renamedTopic);
  }

  private mapToEntity(domainEntity: RenameTopicCommand): Omit<TopicEntity, 'key'> {
    return {
      _environmentId: TopicRepository.convertStringToObjectId(domainEntity.environmentId),
      _id: TopicRepository.convertStringToObjectId(domainEntity.id),
      _organizationId: TopicRepository.convertStringToObjectId(domainEntity.organizationId),
      _userId: TopicRepository.convertStringToObjectId(domainEntity.userId),
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

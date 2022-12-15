import { Injectable, NotFoundException } from '@nestjs/common';
import { TopicEntity, TopicRepository } from '@novu/dal';

import { RenameTopicCommand } from './rename-topic.command';

import { GetTopicUseCase, GetTopicCommand } from '../get-topic';
import { TopicDto } from '../../dtos/topic.dto';
import { ExternalSubscriberId } from '../../types';

@Injectable()
export class RenameTopicUseCase {
  constructor(private getTopicUseCase: GetTopicUseCase, private topicRepository: TopicRepository) {}

  async execute(command: RenameTopicCommand): Promise<TopicDto> {
    await this.getTopicUseCase.execute(command);

    const query = this.mapToQuery(command);
    const renamedTopic = await this.topicRepository.renameTopic(query._id, query._environmentId, query.name);

    return this.mapFromEntityToDto(renamedTopic);
  }

  private mapToQuery(domainEntity: RenameTopicCommand): Pick<TopicEntity, '_id' | '_environmentId' | 'name'> {
    return {
      _environmentId: TopicRepository.convertStringToObjectId(domainEntity.environmentId),
      _id: TopicRepository.convertStringToObjectId(domainEntity.id),
      name: domainEntity.name,
    };
  }

  private mapFromEntityToDto(topic: TopicEntity & { subscribers: ExternalSubscriberId[] }): TopicDto {
    return {
      ...topic,
      _id: TopicRepository.convertObjectIdToString(topic._id),
      _organizationId: TopicRepository.convertObjectIdToString(topic._organizationId),
      _environmentId: TopicRepository.convertObjectIdToString(topic._environmentId),
    };
  }
}

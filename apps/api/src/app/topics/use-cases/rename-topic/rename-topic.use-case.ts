import { Injectable } from '@nestjs/common';
import { TopicEntity, TopicRepository } from '@novu/dal';

import { RenameTopicCommand } from './rename-topic.command';

import { GetTopicUseCase } from '../get-topic';
import { TopicDto } from '../../dtos/topic.dto';
import { ExternalSubscriberId } from '../../types';

@Injectable()
export class RenameTopicUseCase {
  constructor(private getTopicUseCase: GetTopicUseCase, private topicRepository: TopicRepository) {}

  async execute(command: RenameTopicCommand): Promise<TopicDto> {
    const topic = await this.getTopicUseCase.execute(command);

    const query = this.mapToQuery(command);
    const renamedTopic = await this.topicRepository.renameTopic(
      TopicRepository.convertStringToObjectId(topic._id),
      query._environmentId,
      query.name
    );

    return this.mapFromEntityToDto(renamedTopic);
  }

  private mapToQuery(domainEntity: RenameTopicCommand): Pick<TopicEntity, '_environmentId' | 'name'> {
    return {
      _environmentId: TopicRepository.convertStringToObjectId(domainEntity.environmentId),
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

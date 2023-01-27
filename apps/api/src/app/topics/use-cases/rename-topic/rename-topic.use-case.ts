import { Injectable, NotFoundException } from '@nestjs/common';
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
    if (!topic) throw new NotFoundException(`Topic ${command.topicKey} not found`);

    const query = this.mapToQuery(command);
    const renamedTopic = await this.topicRepository.renameTopic(topic._id, query._environmentId, query.name);

    return this.mapFromEntityToDto(renamedTopic);
  }

  private mapToQuery(domainEntity: RenameTopicCommand): Pick<TopicEntity, '_environmentId' | 'name'> {
    return {
      _environmentId: domainEntity.environmentId,
      name: domainEntity.name,
    };
  }

  private mapFromEntityToDto(topic: TopicEntity & { subscribers: ExternalSubscriberId[] }): TopicDto {
    return {
      ...topic,
      _id: topic._id,
      _organizationId: topic._organizationId,
      _environmentId: topic._environmentId,
    };
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { EnvironmentId, OrganizationId, TopicEntity, TopicRepository, UserId } from '@novu/dal';

import { FilterTopicsCommand } from './filter-topics.command';

import { TopicDto } from '../../dtos/topic.dto';

const DEFAULT_TOPIC_LIMIT = 100;

const mapFromCommandToEntity = (
  command: FilterTopicsCommand
): Pick<TopicEntity, '_environmentId' | 'key' | '_organizationId' | '_userId'> => ({
  _environmentId: command.environmentId as unknown as EnvironmentId,
  _organizationId: command.organizationId as unknown as OrganizationId,
  _userId: command.userId as unknown as UserId,
  ...(command.key && { key: command.key }),
});

const mapFromEntityToDto = (topic: TopicEntity): TopicDto => ({
  ...topic,
  _id: topic._id as unknown as string,
  _organizationId: topic._organizationId as unknown as string,
  _environmentId: topic._environmentId as unknown as string,
  _userId: topic._userId as unknown as string,
});

@Injectable()
export class FilterTopicsUseCase {
  constructor(private topicRepository: TopicRepository) {}

  async execute(command: FilterTopicsCommand) {
    const { pageSize = DEFAULT_TOPIC_LIMIT, page = 0 } = command;

    if (pageSize > DEFAULT_TOPIC_LIMIT) {
      throw new BadRequestException(`Page size can not be larger then ${DEFAULT_TOPIC_LIMIT}`);
    }

    const query = mapFromCommandToEntity(command);

    const totalCount = await this.topicRepository.count(query);

    const data = await this.topicRepository.find(query, '', {
      limit: pageSize,
      skip: page * pageSize,
    });

    return {
      page,
      totalCount,
      pageSize,
      data: data.map(mapFromEntityToDto),
    };
  }
}

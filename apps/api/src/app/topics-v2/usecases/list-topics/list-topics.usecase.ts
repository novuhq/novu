import { BadRequestException, Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { TopicRepository } from '@novu/dal';
import { DirectionEnum } from '../../../shared/dtos/base-responses';
import { ListTopicsResponseDto } from '../../dtos/list-topics-response.dto';
import { ListTopicsCommand } from './list-topics.command';
import { mapTopicEntityToDto } from './map-topic-entity-to.dto';

@Injectable()
export class ListTopicsUseCase {
  constructor(private topicRepository: TopicRepository) {}

  @InstrumentUsecase()
  async execute(command: ListTopicsCommand): Promise<ListTopicsResponseDto> {
    if (command.before && command.after) {
      throw new BadRequestException('Cannot specify both "before" and "after" cursors at the same time.');
    }

    const pagination = await this.topicRepository.listTopics({
      after: command.after,
      before: command.before,
      limit: command.limit,
      sortDirection: command.orderDirection === DirectionEnum.ASC ? 1 : -1,
      sortBy: command.orderBy,
      key: command.key,
      name: command.name,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      includeCursor: command.includeCursor,
    });

    return {
      data: pagination.topics.map((topic) => mapTopicEntityToDto(topic)),
      next: pagination.next,
      previous: pagination.previous,
      totalCount: pagination.totalCount,
      totalCountCapped: pagination.totalCountCapped,
    };
  }
}

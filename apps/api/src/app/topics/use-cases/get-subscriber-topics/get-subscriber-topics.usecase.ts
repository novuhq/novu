import { Injectable } from '@nestjs/common';
import { TopicSubscribersRepository } from '@novu/dal';
import { TopicSubscriberDto } from 'apps/api/dist/src/app/topics/dtos';
import { GetSubscriberTopicsCommand } from './get-subscriber-topics.command';

const DEFAULT_TOPIC_LIMIT = 10;

@Injectable()
export class GetSubscriberTopicsUseCase {
  constructor(private topicSubscriberRepository: TopicSubscribersRepository) {}

  async execute(command: GetSubscriberTopicsCommand) {
    const { pageSize = DEFAULT_TOPIC_LIMIT, page = 0 } = command;

    const query = {
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      externalSubscriberId: command.subscriberId,
    };

    const pagination = { limit: pageSize, skip: page * pageSize };

    const [data, totalCount] = await Promise.all([
      this.topicSubscriberRepository.find(query, '', pagination),
      this.topicSubscriberRepository.count(query),
    ]);

    return {
      page,
      totalCount,
      pageSize,
      data,
    };
  }
}

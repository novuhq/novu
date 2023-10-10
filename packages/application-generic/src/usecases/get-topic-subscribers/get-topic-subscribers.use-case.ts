import { Injectable, NotFoundException } from '@nestjs/common';
import {
  TopicSubscribersEntity,
  TopicSubscribersRepository,
  TopicRepository,
} from '@novu/dal';

import { GetTopicSubscribersCommand } from './get-topic-subscribers.command';
import { ITopicSubscriber } from '@novu/shared';

@Injectable()
export class GetTopicSubscribersUseCase {
  constructor(
    private topicSubscribersRepository: TopicSubscribersRepository,
    private topicRepository: TopicRepository
  ) {}

  async execute(command: GetTopicSubscribersCommand) {
    const topic = await this.topicRepository.findTopicByKey(
      command.topicKey,
      command.organizationId,
      command.environmentId
    );
    if (!topic) {
      throw new NotFoundException(
        `Topic with key ${command.topicKey} not found in current environment`
      );
    }

    const topicSubscribers =
      await this.topicSubscribersRepository.findSubscribersByTopicId(
        command.environmentId,
        command.organizationId,
        topic._id
      );

    if (!topicSubscribers) {
      throw new NotFoundException(
        `Topic id ${command.topicKey} for the organization ${command.organizationId} in the environment ${command.environmentId} has no entity with subscribers`
      );
    }

    return topicSubscribers.map(this.mapFromEntity);
  }

  private mapFromEntity(
    topicSubscriber: TopicSubscribersEntity
  ): ITopicSubscriber {
    return {
      ...topicSubscriber,
      topicKey: topicSubscriber.topicKey,
      _topicId: topicSubscriber._topicId,
      _organizationId: topicSubscriber._organizationId,
      _environmentId: topicSubscriber._environmentId,
      _subscriberId: topicSubscriber._subscriberId,
    };
  }
}

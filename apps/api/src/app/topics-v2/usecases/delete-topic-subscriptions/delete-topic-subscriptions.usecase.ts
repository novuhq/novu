import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { TopicRepository, TopicSubscribersRepository } from '@novu/dal';
import { DeleteTopicSubscriptionsCommand } from './delete-topic-subscriptions.command';

export interface ITopicSubscriptionResult {
  acknowledged: boolean;
}

@Injectable()
export class DeleteTopicSubscriptionsUsecase {
  constructor(
    private topicRepository: TopicRepository,
    private topicSubscribersRepository: TopicSubscribersRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: DeleteTopicSubscriptionsCommand): Promise<ITopicSubscriptionResult> {
    const topic = await this.topicRepository.findTopicByKey(
      command.topicKey,
      command.organizationId,
      command.environmentId
    );

    if (!topic) {
      throw new NotFoundException(`Topic with key ${command.topicKey} not found`);
    }

    if (command.subscriberIds.length === 0) {
      return {
        acknowledged: true,
      };
    }

    // Remove subscriptions for the specified subscribers
    await this.topicSubscribersRepository.removeSubscribers(
      command.environmentId,
      command.organizationId,
      command.topicKey,
      command.subscriberIds
    );

    return {
      acknowledged: true,
    };
  }
}

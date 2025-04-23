import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import {
  CreateTopicSubscribersEntity,
  SubscriberRepository,
  TopicEntity,
  TopicRepository,
  TopicSubscribersRepository,
} from '@novu/dal';
import { SubscriberDto } from '@novu/shared';
import { CreateTopicSubscriptionsCommand } from './create-topic-subscriptions.command';

export interface ITopicSubscriptionResult {
  acknowledged: boolean;
}

@Injectable()
export class CreateTopicSubscriptionsUsecase {
  constructor(
    private topicRepository: TopicRepository,
    private topicSubscribersRepository: TopicSubscribersRepository,
    private subscriberRepository: SubscriberRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: CreateTopicSubscriptionsCommand): Promise<ITopicSubscriptionResult> {
    const topic = await this.topicRepository.findTopicByKey(
      command.topicKey,
      command.organizationId,
      command.environmentId
    );

    if (!topic) {
      throw new NotFoundException(`Topic with key ${command.topicKey} not found`);
    }

    // Find existing subscribers directly using the subscriberRepository
    const foundSubscribers = await this.subscriberRepository.searchByExternalSubscriberIds({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      externalSubscriberIds: command.subscriberIds,
    });

    if (foundSubscribers.length === 0) {
      return {
        acknowledged: true,
      };
    }

    // Create topic subscriptions
    const topicSubscribersToCreate = this.mapSubscribersToTopic(topic, foundSubscribers);
    await this.topicSubscribersRepository.addSubscribers(topicSubscribersToCreate);

    return {
      acknowledged: true,
    };
  }

  private mapSubscribersToTopic(topic: TopicEntity, subscribers: SubscriberDto[]): CreateTopicSubscribersEntity[] {
    return subscribers.map((subscriber) => ({
      _environmentId: subscriber._environmentId,
      _organizationId: subscriber._organizationId,
      _subscriberId: subscriber._id,
      _topicId: topic._id,
      topicKey: topic.key,
      externalSubscriberId: subscriber.subscriberId,
    }));
  }
}

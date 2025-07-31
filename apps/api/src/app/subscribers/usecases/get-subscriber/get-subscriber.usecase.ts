import { Injectable, NotFoundException } from '@nestjs/common';
import { buildSubscriberKey, CachedResponse } from '@novu/application-generic';
import { SubscriberEntity, SubscriberRepository, TopicSubscribersRepository } from '@novu/dal';

import { GetSubscriberCommand } from './get-subscriber.command';

@Injectable()
export class GetSubscriber {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private topicSubscriberRepository: TopicSubscribersRepository
  ) {}

  async execute(command: GetSubscriberCommand): Promise<SubscriberEntity> {
    const { environmentId, subscriberId, includeTopics } = command;
    const subscribePromise = this.fetchSubscriber({ _environmentId: environmentId, subscriberId });
    const subscriberTopicsPromise = includeTopics
      ? this.fetchSubscriberTopics({ _environmentId: environmentId, subscriberId })
      : null;

    const [subscriber, topics] = await Promise.all([subscribePromise, subscriberTopicsPromise]);

    if (!subscriber) {
      throw new NotFoundException(`Subscriber '${subscriberId}' was not found`);
    }

    if (includeTopics) {
      subscriber.topics = topics || [];
    }

    return subscriber;
  }

  @CachedResponse({
    builder: (command: { subscriberId: string; _environmentId: string }) =>
      buildSubscriberKey({
        _environmentId: command._environmentId,
        subscriberId: command.subscriberId,
      }),
  })
  private async fetchSubscriber({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }): Promise<SubscriberEntity | null> {
    return await this.subscriberRepository.findBySubscriberId(_environmentId, subscriberId);
  }

  private async fetchSubscriberTopics({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }): Promise<string[]> {
    return await this.topicSubscriberRepository._model.distinct('topicKey', {
      _environmentId,
      externalSubscriberId: subscriberId,
    });
  }
}

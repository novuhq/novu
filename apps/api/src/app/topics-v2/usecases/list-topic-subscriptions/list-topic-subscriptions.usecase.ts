import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import {
  SubscriberRepository,
  TopicEntity,
  TopicRepository,
  TopicSubscribersEntity,
  TopicSubscribersRepository,
} from '@novu/dal';
import { DirectionEnum, EnvironmentId } from '@novu/shared';
import { ListTopicSubscriptionsResponseDto } from '../../dtos/list-topic-subscriptions-response.dto';
import { TopicSubscriptionResponseDto } from '../../dtos/topic-subscription-response.dto';
import { mapTopicSubscriptionsToDto } from '../list-topics/map-topic-entity-to.dto';
import { ListTopicSubscriptionsCommand } from './list-topic-subscriptions.command';

@Injectable()
export class ListTopicSubscriptionsUseCase {
  constructor(
    private topicRepository: TopicRepository,
    private topicSubscribersRepository: TopicSubscribersRepository,
    private subscriberRepository: SubscriberRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: ListTopicSubscriptionsCommand): Promise<ListTopicSubscriptionsResponseDto> {
    const topic = await this.topicRepository.findTopicByKey(
      command.topicKey,
      command.organizationId,
      command.environmentId
    );

    if (!topic) {
      throw new NotFoundException(`Topic with key ${command.topicKey} not found`);
    }

    const subscriptionsPagination = await this.topicSubscribersRepository.findTopicSubscriptionsWithPagination({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      topicKey: command.topicKey,
      subscriberId: command.subscriberId,
      limit: command.limit || 10,
      before: command.before,
      after: command.after,
      orderDirection: command.orderDirection === 1 ? DirectionEnum.ASC : DirectionEnum.DESC,
      includeCursor: command.includeCursor,
    });

    // Build detailed response with topic and subscriber info
    const subscriptionsWithDetails = await this.populateSubscriptionsData(
      topic,
      subscriptionsPagination.data,
      command.environmentId
    );

    return {
      data: subscriptionsWithDetails,
      next: subscriptionsPagination.next,
      previous: subscriptionsPagination.previous,
    };
  }

  private async populateSubscriptionsData(
    topic: TopicEntity,
    subscriptions: TopicSubscribersEntity[],
    environmentId: EnvironmentId
  ): Promise<TopicSubscriptionResponseDto[]> {
    if (subscriptions.length === 0) {
      return [];
    }

    // Get all subscriber IDs from subscriptions
    const subscriberIds = subscriptions.map((subscription) => subscription._subscriberId);

    // Fetch all subscribers in a single query
    const subscribers = await this.subscriberRepository.find({
      _environmentId: environmentId,
      _id: { $in: subscriberIds },
    });

    // Create a map for quick lookup
    const subscriberMap = new Map(subscribers.map((subscriber) => [subscriber._id, subscriber]));

    // Map subscriptions to response DTOs with topic and subscriber details
    return subscriptions
      .map((subscription) => {
        const subscriber = subscriberMap.get(subscription._subscriberId);

        if (!subscriber) {
          return null;
        }

        return mapTopicSubscriptionsToDto(subscription, subscriber, topic);
      })
      .filter(Boolean) as TopicSubscriptionResponseDto[];
  }
}

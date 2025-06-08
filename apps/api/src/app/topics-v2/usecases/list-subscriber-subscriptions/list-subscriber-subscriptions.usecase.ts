import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { SubscriberRepository, TopicSubscribersEntity, TopicSubscribersRepository } from '@novu/dal';
import { DirectionEnum, EnvironmentId } from '@novu/shared';
import { ListTopicSubscriptionsResponseDto } from '../../dtos/list-topic-subscriptions-response.dto';
import { TopicSubscriptionResponseDto } from '../../dtos/topic-subscription-response.dto';
import { mapTopicSubscriptionsToDto } from '../list-topics/map-topic-entity-to.dto';
import { ListSubscriberSubscriptionsCommand } from './list-subscriber-subscriptions.command';

@Injectable()
export class ListSubscriberSubscriptionsUseCase {
  constructor(
    private topicSubscribersRepository: TopicSubscribersRepository,
    private subscriberRepository: SubscriberRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: ListSubscriberSubscriptionsCommand): Promise<ListTopicSubscriptionsResponseDto> {
    // Find the subscriber to validate it exists
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    if (!subscriber) {
      throw new NotFoundException('Subscriber not found');
    }

    if (command.before && command.after) {
      throw new Error('Cannot specify both "before" and "after" cursors at the same time.');
    }

    // Use the repository method for pagination
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
    subscriptions: TopicSubscribersEntity[],
    environmentId: EnvironmentId
  ): Promise<TopicSubscriptionResponseDto[]> {
    if (subscriptions.length === 0) {
      return [];
    }

    // Get the subscriber from the first subscription since it's always the same subscriber
    const subscriberId = subscriptions[0]._subscriberId;
    const subscriber = await this.subscriberRepository.findOne({
      _environmentId: environmentId,
      _id: subscriberId,
    });

    if (!subscriber) {
      return [];
    }

    // Need unique topic IDs
    const topicKeys = subscriptions.map((subscription) => subscription.topicKey);

    if (topicKeys.length === 0) {
      return [];
    }

    // Find all topic information using the topic keys
    const topics = await this.topicSubscribersRepository.findTopicsByTopicKeys(environmentId, topicKeys);

    // Create a map for quick lookup
    const topicsMap = new Map(topics.map((result) => [result._id, result.topic]));

    // Map subscriptions to response DTOs with topic and subscriber details
    return subscriptions
      .map((subscription) => {
        const topic = topicsMap.get(subscription.topicKey);

        if (!topic) {
          return null;
        }

        return mapTopicSubscriptionsToDto(subscription, subscriber, topic);
      })
      .filter(Boolean) as TopicSubscriptionResponseDto[];
  }
}

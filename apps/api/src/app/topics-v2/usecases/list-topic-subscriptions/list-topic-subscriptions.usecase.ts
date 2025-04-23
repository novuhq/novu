import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { SubscriberRepository, TopicRepository, TopicSubscribersRepository } from '@novu/dal';
import { DirectionEnum } from '@novu/shared';
import { ListTopicSubscriptionsResponseDto } from '../../dtos/list-topic-subscriptions-response.dto';
import { TopicSubscriptionResponseDto } from '../../dtos/topic-subscription-response.dto';
import { mapTopicEntityToDto } from '../list-topics/map-topic-entity-to.dto';
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

    // Build query for topic subscriptions
    const query: any = {
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      topicKey: command.topicKey,
    };

    if (command.subscriberId) {
      query.externalSubscriberId = command.subscriberId;
    }

    let afterCursor;
    let beforeCursor;

    const id = command.after || command.before;
    if (id) {
      const subscription = await this.topicSubscribersRepository.findOne({
        _id: id,
        _environmentId: command.environmentId,
      });

      if (subscription) {
        const cursorValue = { _id: subscription._id };
        if (command.after) {
          afterCursor = cursorValue;
        } else {
          beforeCursor = cursorValue;
        }
      }
    }

    // Use cursor-based pagination
    const subscriptionsPagination = await this.topicSubscribersRepository.findWithCursorBasedPagination({
      query,
      paginateField: '_id',
      sortBy: '_id',
      sortDirection: command.orderDirection === 1 ? DirectionEnum.ASC : DirectionEnum.DESC,
      limit: command.limit || 10,
      after: afterCursor,
      before: beforeCursor,
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
    topic,
    subscriptions,
    environmentId
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

        return {
          _id: subscription._id,
          topic: mapTopicEntityToDto(topic),
          subscriber: {
            _id: subscriber._id,
            subscriberId: subscriber.subscriberId,
            firstName: subscriber.firstName,
            lastName: subscriber.lastName,
            email: subscriber.email,
            avatar: subscriber.avatar,
          },
        };
      })
      .filter(Boolean) as TopicSubscriptionResponseDto[];
  }
}

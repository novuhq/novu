import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { SubscriberRepository, TopicRepository, TopicSubscribersRepository } from '@novu/dal';
import {
  DeleteTopicSubscriptionsResponseDto,
  SubscriptionDto,
  SubscriptionsDeleteErrorDto,
} from '../../dtos/delete-topic-subscriptions-response.dto';
import { DeleteTopicSubscriptionsCommand } from './delete-topic-subscriptions.command';

@Injectable()
export class DeleteTopicSubscriptionsUsecase {
  constructor(
    private topicRepository: TopicRepository,
    private topicSubscribersRepository: TopicSubscribersRepository,
    private subscriberRepository: SubscriberRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: DeleteTopicSubscriptionsCommand): Promise<DeleteTopicSubscriptionsResponseDto> {
    const topic = await this.topicRepository.findTopicByKey(
      command.topicKey,
      command.organizationId,
      command.environmentId
    );

    if (!topic) {
      throw new NotFoundException(`Topic with key ${command.topicKey} not found`);
    }

    const errors: SubscriptionsDeleteErrorDto[] = [];
    const subscriptionData: SubscriptionDto[] = [];

    if (command.subscriberIds.length === 0) {
      return {
        data: [],
        meta: {
          totalCount: 0,
          successful: 0,
          failed: 0,
        },
      };
    }

    // Find existing subscribers directly using the subscriberRepository
    const foundSubscribers = await this.subscriberRepository.searchByExternalSubscriberIds({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      externalSubscriberIds: command.subscriberIds,
    });

    // Identify which subscribers were not found
    const foundSubscriberIds = foundSubscribers.map((sub) => sub.subscriberId);
    const notFoundSubscriberIds = command.subscriberIds.filter((id) => !foundSubscriberIds.includes(id));

    // Add errors for subscribers not found
    for (const subscriberId of notFoundSubscriberIds) {
      errors.push({
        subscriberId,
        code: 'SUBSCRIBER_NOT_FOUND',
        message: `Subscriber with ID '${subscriberId}' could not be found.`,
      });
    }

    if (foundSubscribers.length === 0) {
      return {
        data: [],
        meta: {
          totalCount: command.subscriberIds.length,
          successful: 0,
          failed: command.subscriberIds.length,
        },
        errors,
      };
    }

    // Find existing subscriptions for these subscribers
    const existingSubscriptions = await this.topicSubscribersRepository.find({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _topicId: topic._id,
      _subscriberId: { $in: foundSubscribers.map((sub) => sub._id) },
    });

    // Identify which subscribers don't have a subscription to delete
    const existingSubscriberIds = existingSubscriptions.map((sub) => sub._subscriberId.toString());
    const subscribersWithoutSubscription = foundSubscribers.filter(
      (sub) => !existingSubscriberIds.includes(sub._id.toString())
    );

    // Add errors for subscribers without subscriptions
    for (const subscriber of subscribersWithoutSubscription) {
      errors.push({
        subscriberId: subscriber.subscriberId,
        code: 'SUBSCRIPTION_NOT_FOUND',
        message: `Subscription for subscriber '${subscriber.subscriberId}' not found.`,
      });
    }

    // Map existing subscriptions to response format before deleting them
    for (const subscription of existingSubscriptions) {
      const subscriber = foundSubscribers.find((sub) => sub._id.toString() === subscription._subscriberId.toString());

      subscriptionData.push({
        _id: subscription._id,
        topic: {
          _id: topic._id,
          key: topic.key,
          name: topic.name,
        },
        subscriber: subscriber
          ? {
              _id: subscriber._id,
              subscriberId: subscriber.subscriberId,
              avatar: subscriber.avatar,
              firstName: subscriber.firstName,
              lastName: subscriber.lastName,
              email: subscriber.email,
              createdAt: subscriber.createdAt,
              updatedAt: subscriber.updatedAt,
            }
          : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Only delete subscriptions if there are any to delete
    if (existingSubscriptions.length > 0) {
      // Get the list of external subscriber IDs that have subscriptions
      const subscribersToRemove = foundSubscribers
        .filter((sub) => existingSubscriberIds.includes(sub._id.toString()))
        .map((sub) => sub.subscriberId);

      // Remove subscriptions for the specified subscribers
      await this.topicSubscribersRepository.removeSubscribers(
        command.environmentId,
        command.organizationId,
        command.topicKey,
        subscribersToRemove
      );
    }

    return {
      data: subscriptionData,
      meta: {
        totalCount: command.subscriberIds.length,
        successful: subscriptionData.length,
        failed: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import {
  CreateTopicSubscribersEntity,
  SubscriberEntity,
  SubscriberRepository,
  TopicEntity,
  TopicRepository,
  TopicSubscribersEntity,
  TopicSubscribersRepository,
} from '@novu/dal';
import { SubscriberDto } from '@novu/shared';
import { ISubscriptionData, ISubscriptionError, ITopicSubscriptionResult } from '../../dtos/subscription-interfaces';
import { CreateTopicSubscriptionsCommand } from './create-topic-subscriptions.command';

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

    const errors: ISubscriptionError[] = [];
    const subscriptionData: ISubscriptionData[] = [];
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

    // Check for existing subscriptions to make the operation idempotent
    const existingSubscriptions = await this.topicSubscribersRepository.find({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _topicId: topic._id,
      _subscriberId: { $in: foundSubscribers.map((sub) => sub._id) },
    });

    // Create topic subscriptions for subscribers that don't already have a subscription
    const existingSubscriberIds = existingSubscriptions.map((sub) => sub._subscriberId.toString());
    const subscribersToCreate = foundSubscribers.filter((sub) => !existingSubscriberIds.includes(sub._id.toString()));

    let newSubscriptions: TopicSubscribersEntity[] = [];
    if (subscribersToCreate.length > 0) {
      const topicSubscribersToCreate = this.mapSubscribersToTopic(topic, subscribersToCreate);
      newSubscriptions = await this.topicSubscribersRepository.addSubscribers(topicSubscribersToCreate);
    }

    // Combine existing and new subscriptions for the response
    const allSubscriptions = [...existingSubscriptions, ...newSubscriptions];
    // Map subscriptions to response format
    for (const subscription of allSubscriptions) {
      const subscriber = foundSubscribers.find((sub) => sub._id.toString() === subscription._subscriberId.toString());
      if (subscriber) {
        subscriptionData.push({
          _id: subscription._id.toString(),
          topic: {
            _id: topic._id.toString(),
            key: topic.key,
            name: topic.name,
          },
          subscriber: {
            _id: subscriber._id.toString(),
            subscriberId: subscriber.subscriberId,
            avatar: subscriber.avatar,
            firstName: subscriber.firstName,
            lastName: subscriber.lastName,
            email: subscriber.email,
            createdAt: subscriber.createdAt ? new Date(subscriber.createdAt).toISOString() : undefined,
            updatedAt: subscriber.updatedAt ? new Date(subscriber.updatedAt).toISOString() : undefined,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
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

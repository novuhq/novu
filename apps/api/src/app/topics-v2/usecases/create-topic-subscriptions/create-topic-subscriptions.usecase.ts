import { Injectable } from '@nestjs/common';
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
import {
  CreateTopicSubscriptionsResponseDto,
  SubscriptionDto,
  SubscriptionErrorDto,
} from '../../dtos/create-topic-subscriptions-response.dto';
import { UpsertTopicUseCase } from '../upsert-topic/upsert-topic.usecase';
import { CreateTopicSubscriptionsCommand } from './create-topic-subscriptions.command';

@Injectable()
export class CreateTopicSubscriptionsUsecase {
  constructor(
    private topicRepository: TopicRepository,
    private topicSubscribersRepository: TopicSubscribersRepository,
    private subscriberRepository: SubscriberRepository,
    private upsertTopicUseCase: UpsertTopicUseCase
  ) {}

  @InstrumentUsecase()
  async execute(command: CreateTopicSubscriptionsCommand): Promise<CreateTopicSubscriptionsResponseDto> {
    // Use upsert topic usecase to create the topic if it doesn't exist
    await this.upsertTopicUseCase.execute({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      userId: command.userId,
      key: command.topicKey,
    });

    // Get the topic entity from the repository after upsert
    const topic = await this.topicRepository.findTopicByKey(
      command.topicKey,
      command.organizationId,
      command.environmentId
    );

    if (!topic) {
      throw new Error(`Topic with key ${command.topicKey} not found after upsert`);
    }

    const errors: SubscriptionErrorDto[] = [];
    const subscriptionData: SubscriptionDto[] = [];

    const foundSubscribers = await this.subscriberRepository.searchByExternalSubscriberIds({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      externalSubscriberIds: command.subscriberIds,
    });

    const foundSubscriberIds = foundSubscribers.map((sub) => sub.subscriberId);
    const notFoundSubscriberIds = command.subscriberIds.filter((id) => !foundSubscriberIds.includes(id));

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

      subscriptionData.push({
        _id: subscription._id.toString(),
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
        createdAt: subscription.createdAt ?? '',
        updatedAt: subscription.updatedAt ?? '',
      });
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

  private mapSubscribersToTopic(topic: TopicEntity, subscribers: SubscriberEntity[]): CreateTopicSubscribersEntity[] {
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

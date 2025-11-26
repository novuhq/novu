import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import {
  PreferencesRepository,
  SubscriberEntity,
  SubscriberRepository,
  TopicEntity,
  TopicRepository,
  TopicSubscribersEntity,
  TopicSubscribersRepository,
} from '@novu/dal';
import { PreferencesTypeEnum } from '@novu/shared';
import {
  DeleteTopicSubscriptionsResponseDto,
  SubscriptionDto,
  SubscriptionsDeleteErrorDto,
} from '../../dtos/delete-topic-subscriptions-response.dto';
import { DeleteTopicSubscriptionsCommand } from './delete-topic-subscriptions.command';

interface SubscriptionLookupResult {
  foundSubscribers: SubscriberEntity[];
  existingSubscriptions: TopicSubscribersEntity[];
  errors: SubscriptionsDeleteErrorDto[];
}

@Injectable()
export class DeleteTopicSubscriptionsUsecase {
  constructor(
    private topicRepository: TopicRepository,
    private topicSubscribersRepository: TopicSubscribersRepository,
    private subscriberRepository: SubscriberRepository,
    private preferencesRepository: PreferencesRepository
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

    const subscriptions = command.subscriptions || [];

    if (subscriptions.length === 0) {
      return {
        data: [],
        meta: {
          totalCount: 0,
          successful: 0,
          failed: 0,
        },
      };
    }

    const subscriberIds = subscriptions.map((sub) => sub.subscriberId).filter((id) => id !== undefined);
    const identifiers = subscriptions.map((sub) => sub.identifier).filter((id) => id !== undefined);

    const useIdentifierLookup = identifiers.length > 0;

    if (!useIdentifierLookup && subscriberIds.length === 0) {
      return {
        data: [],
        meta: {
          totalCount: subscriptions.length,
          successful: 0,
          failed: subscriptions.length,
        },
        errors: subscriptions.map((sub) => ({
          subscriberId: sub.subscriberId || 'unknown',
          identifier: sub.identifier || 'unknown',
          code: 'INVALID_REQUEST',
          message: 'Subscription identifier is required.',
        })),
      };
    }

    return this.deleteSubscriptions(command, topic, subscriptions, useIdentifierLookup, identifiers, subscriberIds);
  }

  private async deleteSubscriptions(
    command: DeleteTopicSubscriptionsCommand,
    topic: TopicEntity,
    subscriptions: Array<{ identifier?: string; subscriberId?: string }>,
    useIdentifierLookup: boolean,
    identifiers: string[],
    subscriberIds: string[]
  ): Promise<DeleteTopicSubscriptionsResponseDto> {
    const lookupResult = await this.lookupSubscriptionsAndSubscribers(
      command,
      topic,
      subscriptions,
      useIdentifierLookup,
      identifiers,
      subscriberIds
    );

    if (lookupResult.existingSubscriptions.length === 0) {
      return {
        data: [],
        meta: {
          totalCount: subscriptions.length,
          successful: 0,
          failed: lookupResult.errors.length,
        },
        errors: lookupResult.errors,
      };
    }

    const subscriptionData = this.buildSubscriptionData(topic, lookupResult);

    await this.performDeletion(command, lookupResult.existingSubscriptions);

    return {
      data: subscriptionData,
      meta: {
        totalCount: subscriptions.length,
        successful: subscriptionData.length,
        failed: lookupResult.errors.length,
      },
      errors: lookupResult.errors.length > 0 ? lookupResult.errors : undefined,
    };
  }

  private async lookupSubscriptionsAndSubscribers(
    command: DeleteTopicSubscriptionsCommand,
    topic: TopicEntity,
    subscriptions: Array<{ identifier?: string; subscriberId?: string }>,
    useIdentifierLookup: boolean,
    identifiers: string[],
    subscriberIds: string[]
  ): Promise<SubscriptionLookupResult> {
    if (useIdentifierLookup) {
      return this.lookupByIdentifiers(command, topic, identifiers);
    }

    return this.lookupBySubscriberIds(command, topic, subscriptions, subscriberIds, identifiers);
  }

  private async lookupByIdentifiers(
    command: DeleteTopicSubscriptionsCommand,
    topic: TopicEntity,
    identifiers: string[]
  ): Promise<SubscriptionLookupResult> {
    const errors: SubscriptionsDeleteErrorDto[] = [];

    const existingSubscriptions = await this.topicSubscribersRepository.find({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _topicId: topic._id,
      identifier: { $in: identifiers },
    });

    const existingIdentifiers = new Set(existingSubscriptions.map((sub) => sub.identifier).filter(Boolean));
    const notFoundIdentifiers = identifiers.filter((id) => !existingIdentifiers.has(id));

    for (const identifier of notFoundIdentifiers) {
      errors.push({
        subscriberId: 'unknown',
        code: 'SUBSCRIPTION_NOT_FOUND',
        message: `Subscription with identifier '${identifier}' not found.`,
      });
    }

    const subscriberInternalIds = [...new Set(existingSubscriptions.map((sub) => sub._subscriberId))];
    const foundSubscribers =
      subscriberInternalIds.length > 0
        ? await this.subscriberRepository.find({
            _environmentId: command.environmentId,
            _organizationId: command.organizationId,
            _id: { $in: subscriberInternalIds },
          })
        : [];

    return { foundSubscribers, existingSubscriptions, errors };
  }

  private async lookupBySubscriberIds(
    command: DeleteTopicSubscriptionsCommand,
    topic: TopicEntity,
    subscriptions: Array<{ identifier?: string; subscriberId?: string }>,
    subscriberIds: string[],
    identifiers: string[]
  ): Promise<SubscriptionLookupResult> {
    const errors: SubscriptionsDeleteErrorDto[] = [];

    const foundSubscribers = await this.subscriberRepository.searchByExternalSubscriberIds({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      externalSubscriberIds: subscriberIds,
    });

    const foundSubscriberIds = foundSubscribers.map((sub) => sub.subscriberId);
    const notFoundSubscriberIds = subscriberIds.filter((id) => !foundSubscriberIds.includes(id));

    for (const subscriberId of notFoundSubscriberIds) {
      errors.push({
        subscriberId,
        code: 'SUBSCRIBER_NOT_FOUND',
        message: `Subscriber with ID '${subscriberId}' could not be found.`,
      });
    }

    if (foundSubscribers.length === 0) {
      return { foundSubscribers, existingSubscriptions: [], errors };
    }

    const subscriptionQuery: {
      _environmentId: string;
      _organizationId: string;
      _topicId: string;
      _subscriberId: { $in: string[] };
      identifier?: { $in: string[] };
    } = {
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _topicId: topic._id,
      _subscriberId: { $in: foundSubscribers.map((sub) => sub._id) },
    };

    if (identifiers.length > 0) {
      subscriptionQuery.identifier = { $in: identifiers };
    }

    const existingSubscriptions = await this.topicSubscribersRepository.find(subscriptionQuery);

    this.validateSubscriptions(subscriptions, foundSubscribers, existingSubscriptions, errors);

    return { foundSubscribers, existingSubscriptions, errors };
  }

  private validateSubscriptions(
    subscriptions: Array<{ identifier?: string; subscriberId?: string }>,
    foundSubscribers: SubscriberEntity[],
    existingSubscriptions: TopicSubscribersEntity[],
    errors: SubscriptionsDeleteErrorDto[]
  ): void {
    const existingIdentifiers = new Set(existingSubscriptions.map((sub) => sub.identifier).filter(Boolean));
    const existingSubscriberIdsSet = new Set(existingSubscriptions.map((sub) => sub._subscriberId.toString()));

    for (const subscription of subscriptions) {
      const subscriber = foundSubscribers.find((sub) => sub.subscriberId === subscription.subscriberId);
      if (!subscriber) continue;

      if (subscription.identifier) {
        if (!existingIdentifiers.has(subscription.identifier)) {
          errors.push({
            subscriberId: subscriber.subscriberId,
            code: 'SUBSCRIPTION_NOT_FOUND',
            message: `Subscription with identifier '${subscription.identifier}' for subscriber '${subscriber.subscriberId}' not found.`,
          });
        }
      } else {
        if (!existingSubscriberIdsSet.has(subscriber._id.toString())) {
          errors.push({
            subscriberId: subscriber.subscriberId,
            code: 'SUBSCRIPTION_NOT_FOUND',
            message: `Subscription for subscriber '${subscriber.subscriberId}' not found.`,
          });
        }
      }
    }
  }

  private buildSubscriptionData(topic: TopicEntity, lookupResult: SubscriptionLookupResult): SubscriptionDto[] {
    return lookupResult.existingSubscriptions.map((subscription) => {
      const subscriber = lookupResult.foundSubscribers.find(
        (sub) => sub._id.toString() === subscription._subscriberId.toString()
      );

      return {
        _id: subscription._id,
        identifier: subscription.identifier,
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
        createdAt: subscription.createdAt ?? new Date().toISOString(),
        updatedAt: subscription.updatedAt ?? new Date().toISOString(),
      };
    });
  }

  private async performDeletion(
    command: DeleteTopicSubscriptionsCommand,
    existingSubscriptions: TopicSubscribersEntity[]
  ): Promise<void> {
    await this.topicSubscribersRepository.withTransaction(async () => {
      const subscriptionIds = existingSubscriptions.map((sub) => sub._id);

      await this.preferencesRepository.delete({
        _environmentId: command.environmentId,
        _topicSubscriptionId: { $in: subscriptionIds },
        type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
      });

      await this.topicSubscribersRepository.delete({
        _organizationId: command.organizationId,
        _id: { $in: subscriptionIds },
      });
    });
  }
}

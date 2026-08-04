import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService, InstrumentUsecase } from '@novu/application-generic';
import {
  NotificationTemplateRepository,
  PreferencesEntity,
  PreferencesRepository,
  SubscriberRepository,
  TopicSubscribersEntity,
  TopicSubscribersRepository,
} from '@novu/dal';
import { DirectionEnum, EnvironmentId, FeatureFlagsKeysEnum, PreferencesTypeEnum } from '@novu/shared';
import { SubscriptionPreferenceDto } from '../../../shared/dtos/subscriptions/create-subscriptions-response.dto';
import {
  mapTopicSubscriptionToDto,
  SELECTED_WORKFLOW_FIELDS_PROJECTION,
  SelectedWorkflowFields,
} from '../../../subscriptions/utils/subscriptions';
import { ListTopicSubscriptionsResponseDto } from '../../dtos/list-topic-subscriptions-response.dto';
import { TopicSubscriptionResponseDto } from '../../dtos/topic-subscription-response.dto';
import { mapTopicSubscriptionsToDto } from '../list-topics/map-topic-entity-to.dto';
import { ListSubscriberSubscriptionsCommand } from './list-subscriber-subscriptions.command';

@Injectable()
export class ListSubscriberSubscriptionsUseCase {
  constructor(
    private topicSubscribersRepository: TopicSubscribersRepository,
    private subscriberRepository: SubscriberRepository,
    private preferencesRepository: PreferencesRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private featureFlagsService: FeatureFlagsService
  ) {}

  @InstrumentUsecase()
  async execute(command: ListSubscriberSubscriptionsCommand): Promise<ListTopicSubscriptionsResponseDto> {
    // Find the subscriber to validate it exists
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    if (!subscriber) {
      throw new NotFoundException('Subscriber not found');
    }

    if (command.before && command.after) {
      throw new BadRequestException('Cannot specify both "before" and "after" cursors at the same time.');
    }

    // Use the repository method for pagination
    const subscriptionsPagination = await this.topicSubscribersRepository.findTopicSubscriptionsWithPagination({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      topicKey: command.topicKey,
      subscriberId: command.subscriberId,
      contextKeys: command.contextKeys,
      limit: command.limit || 10,
      before: command.before,
      after: command.after,
      orderDirection: command.orderDirection === 1 ? DirectionEnum.ASC : DirectionEnum.DESC,
      includeCursor: command.includeCursor,
    });

    // Build detailed response with topic and subscriber info
    const subscriptionsWithDetails = await this.populateSubscriptionsData(
      subscriptionsPagination.data,
      command.environmentId,
      command.organizationId,
      command.contextKeys
    );

    return {
      data: subscriptionsWithDetails,
      next: subscriptionsPagination.next,
      previous: subscriptionsPagination.previous,
      totalCount: subscriptionsPagination.totalCount,
      totalCountCapped: subscriptionsPagination.totalCountCapped,
    };
  }

  private async populateSubscriptionsData(
    subscriptions: TopicSubscribersEntity[],
    environmentId: EnvironmentId,
    organizationId: string,
    contextKeys?: string[]
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

    const preferencesBySubscriptionId = await this.fetchPreferencesForSubscriptions(
      subscriptions,
      organizationId,
      contextKeys
    );

    // Map subscriptions to response DTOs with topic and subscriber details
    return subscriptions
      .map((subscription) => {
        const topic = topicsMap.get(subscription.topicKey);

        if (!topic) {
          return null;
        }

        const preferences = preferencesBySubscriptionId.get(subscription._id.toString());

        return mapTopicSubscriptionsToDto(subscription, subscriber, topic, preferences);
      })
      .filter(Boolean) as TopicSubscriptionResponseDto[];
  }

  private async fetchPreferencesForSubscriptions(
    subscriptions: TopicSubscribersEntity[],
    organizationId: string,
    contextKeys?: string[]
  ): Promise<Map<string, SubscriptionPreferenceDto[]>> {
    const preferencesBySubscriptionId = new Map<string, SubscriptionPreferenceDto[]>();

    if (subscriptions.length === 0) {
      return preferencesBySubscriptionId;
    }

    const contextQuery = await this.buildContextQuery(contextKeys, organizationId);

    const allPreferences = await this.preferencesRepository.find({
      _environmentId: subscriptions[0]._environmentId,
      _subscriberId: subscriptions[0]._subscriberId,
      _topicSubscriptionId: { $in: subscriptions.map((subscription) => subscription._id) },
      type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
      ...contextQuery,
    });

    const preferencesBySubscriptionEntityId = new Map<string, PreferencesEntity[]>();

    for (const subscription of subscriptions) {
      preferencesBySubscriptionEntityId.set(subscription._id.toString(), []);
    }

    for (const preference of allPreferences) {
      const subscriptionId = preference._topicSubscriptionId?.toString();

      if (!subscriptionId) {
        continue;
      }

      const subscriptionPreferences = preferencesBySubscriptionEntityId.get(subscriptionId);

      if (subscriptionPreferences) {
        subscriptionPreferences.push(preference);
      }
    }

    const subscriptionPreferencesMap = new Map<TopicSubscribersEntity, PreferencesEntity[]>();

    for (const subscription of subscriptions) {
      subscriptionPreferencesMap.set(
        subscription,
        preferencesBySubscriptionEntityId.get(subscription._id.toString()) ?? []
      );
    }

    const workflowsMap = await this.findWorkflows(subscriptionPreferencesMap, subscriptions);

    for (const [subscription, preferencesEntities] of subscriptionPreferencesMap) {
      const preferenceWorkflowIds = preferencesEntities
        .map((pref) => pref._templateId?.toString())
        .filter((id): id is string => id !== undefined);

      const workflows = preferenceWorkflowIds
        .map((id) => workflowsMap.get(id))
        .filter((workflow): workflow is SelectedWorkflowFields => workflow !== undefined);

      const mappedSubscription = mapTopicSubscriptionToDto(subscription, preferencesEntities, workflows);

      if (mappedSubscription.preferences) {
        preferencesBySubscriptionId.set(subscription._id.toString(), mappedSubscription.preferences);
      }
    }

    return preferencesBySubscriptionId;
  }

  private async findWorkflows(
    subscriptionPreferencesMap: Map<TopicSubscribersEntity, PreferencesEntity[]>,
    subscriptions: TopicSubscribersEntity[]
  ): Promise<Map<string, SelectedWorkflowFields>> {
    const uniqueWorkflowIds = new Set(
      Array.from(subscriptionPreferencesMap.values())
        .flat()
        .map((pref) => pref._templateId?.toString())
        .filter((id): id is string => id !== undefined)
    );

    const workflowsMap = new Map<string, SelectedWorkflowFields>();

    if (uniqueWorkflowIds.size > 0 && subscriptions.length > 0) {
      const workflows: SelectedWorkflowFields[] = await this.notificationTemplateRepository.find(
        {
          _id: { $in: Array.from(uniqueWorkflowIds) },
          _environmentId: subscriptions[0]._environmentId,
          _organizationId: subscriptions[0]._organizationId,
        },
        SELECTED_WORKFLOW_FIELDS_PROJECTION
      );

      for (const workflow of workflows) {
        workflowsMap.set(workflow._id, workflow);
      }
    }

    return workflowsMap;
  }

  private async buildContextQuery(contextKeys?: string[], organizationId?: string): Promise<Record<string, unknown>> {
    if (!organizationId) {
      return {};
    }

    const useContextFiltering = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
      defaultValue: false,
      organization: { _id: organizationId },
    });

    return contextKeys === undefined
      ? {}
      : this.topicSubscribersRepository.buildContextExactMatchQuery(contextKeys, {
          enabled: useContextFiltering,
        });
  }
}

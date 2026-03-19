import { Injectable } from '@nestjs/common';
import { FeatureFlagsService, InstrumentUsecase } from '@novu/application-generic';
import {
  NotificationTemplateRepository,
  PreferencesEntity,
  PreferencesRepository,
  TopicSubscribersEntity,
  TopicSubscribersRepository,
} from '@novu/dal';
import { FeatureFlagsKeysEnum, PreferencesTypeEnum } from '@novu/shared';
import { SubscriptionDetailsResponseDto } from '../../../shared/dtos/subscription-details-response.dto';
import {
  mapTopicSubscriptionToDto,
  SELECTED_WORKFLOW_FIELDS_PROJECTION,
  SelectedWorkflowFields,
} from '../../../subscriptions/utils/subscriptions';
import { GetTopicSubscriptionsCommand } from './get-topic-subscriptions.command';

@Injectable()
export class GetTopicSubscriptions {
  constructor(
    private topicSubscribersRepository: TopicSubscribersRepository,
    private preferencesRepository: PreferencesRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private featureFlagsService: FeatureFlagsService
  ) {}

  @InstrumentUsecase()
  async execute(command: GetTopicSubscriptionsCommand): Promise<SubscriptionDetailsResponseDto[]> {
    const contextQuery = await this.buildContextQuery(command.contextKeys, command.organizationId);

    const subscriptions = await this.topicSubscribersRepository.find({
      _environmentId: command.environmentId,
      _subscriberId: command._subscriberId,
      topicKey: command.topicKey,
      ...contextQuery,
    });

    return await this.buildSubscriptionsResponse(subscriptions, command.contextKeys, command.organizationId);
  }

  private async buildSubscriptionsResponse(
    subscriptions: TopicSubscribersEntity[],
    contextKeys?: string[],
    organizationId?: string
  ): Promise<SubscriptionDetailsResponseDto[]> {
    const subscriptionPreferencesMap = new Map<TopicSubscribersEntity, PreferencesEntity[]>();

    const contextQuery = await this.buildContextQuery(contextKeys, organizationId);

    for (const subscription of subscriptions) {
      const preferences = await this.preferencesRepository.find({
        _environmentId: subscription._environmentId,
        _subscriberId: subscription._subscriberId,
        _topicSubscriptionId: subscription._id,
        type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
        ...contextQuery,
      });
      subscriptionPreferencesMap.set(subscription, preferences);
    }

    const workflowsMap = await this.findWorkflows(subscriptionPreferencesMap, subscriptions);

    const result: SubscriptionDetailsResponseDto[] = [];

    for (const [subscription, preferencesEntities] of subscriptionPreferencesMap) {
      const preferenceWorkflowIds = preferencesEntities
        .map((pref) => pref._templateId?.toString())
        .filter((id): id is string => id !== undefined);

      const workflows = preferenceWorkflowIds
        .map((id) => workflowsMap.get(id))
        .filter((workflow): workflow is SelectedWorkflowFields => workflow !== undefined);

      result.push(mapTopicSubscriptionToDto(subscription, preferencesEntities, workflows));
    }

    return result;
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

    return this.topicSubscribersRepository.buildContextExactMatchQuery(contextKeys, {
      enabled: useContextFiltering,
    });
  }
}

import { Injectable } from '@nestjs/common';
import {
  FeatureFlagsService,
  GetPreferences,
  GetPreferencesCommand,
  InstrumentUsecase,
} from '@novu/application-generic';
import {
  BaseRepository,
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
  stripContextFromIdentifier,
} from '../../utils/subscriptions';
import { GetSubscriptionCommand } from './get-subscription.command';

type PartialPreferenceEntity = Pick<PreferencesEntity, '_templateId' | 'preferences'>;

@Injectable()
export class GetSubscription {
  constructor(
    private topicSubscribersRepository: TopicSubscribersRepository,
    private preferencesRepository: PreferencesRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private getPreferences: GetPreferences,
    private featureFlagsService: FeatureFlagsService
  ) {}

  @InstrumentUsecase()
  async execute(command: GetSubscriptionCommand): Promise<SubscriptionDetailsResponseDto | null> {
    const isContextEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
    });

    if (!isContextEnabled) {
      command.identifier = stripContextFromIdentifier(command.identifier);
    }

    const useContextFiltering = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
    });

    // Admin API (topics-v2): contextKeys undefined → no context filtering (identifier is sufficient)
    const contextQuery =
      command.contextKeys === undefined
        ? {}
        : this.topicSubscribersRepository.buildContextExactMatchQuery(command.contextKeys, {
            enabled: useContextFiltering,
          });

    const subscription = await this.topicSubscribersRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      topicKey: command.topicKey,
      identifier: command.identifier,
      ...contextQuery,
    });

    if (!subscription) {
      return null;
    }

    const preferencesEntities = await this.preferencesRepository.find({
      _environmentId: subscription._environmentId,
      _subscriberId: subscription._subscriberId,
      _topicSubscriptionId: subscription._id,
      type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
      ...contextQuery,
    });

    const { allPreferencesEntities, allWorkflowEntities } = await this.resolveWorkflowPreferences(
      command,
      subscription,
      preferencesEntities
    );

    return mapTopicSubscriptionToDto(subscription, allPreferencesEntities, allWorkflowEntities);
  }

  private async resolveWorkflowPreferences(
    command: GetSubscriptionCommand,
    subscription: TopicSubscribersEntity,
    storedPreferences: Array<PartialPreferenceEntity>
  ): Promise<{
    allPreferencesEntities: Array<PartialPreferenceEntity>;
    allWorkflowEntities: SelectedWorkflowFields[];
  }> {
    const storedPreferenceWorkflowInternalIds = new Set(
      storedPreferences.map((pref) => pref._templateId?.toString()).filter((id): id is string => id !== undefined)
    );

    const orConditions: Array<Record<string, unknown>> = [];

    const workflowIdentifiers = command.workflowIds?.filter((id) => !BaseRepository.isInternalId(id)) ?? [];
    const workflowInternalIds = command.workflowIds?.filter((id) => BaseRepository.isInternalId(id)) ?? [];
    const allIds = [...Array.from(storedPreferenceWorkflowInternalIds), ...workflowInternalIds];

    if (allIds.length > 0) {
      orConditions.push({ _id: { $in: allIds } });
    }

    if (workflowIdentifiers.length > 0) {
      orConditions.push({ 'triggers.identifier': { $in: workflowIdentifiers } });
    }

    if (command.tags?.length) {
      orConditions.push({ tags: { $in: command.tags } });
    }

    if (orConditions.length === 0) {
      return {
        allPreferencesEntities: storedPreferences,
        allWorkflowEntities: [],
      };
    }

    const allWorkflows = await this.notificationTemplateRepository.find(
      {
        _environmentId: subscription._environmentId,
        _organizationId: subscription._organizationId,
        $or: orConditions,
      },
      SELECTED_WORKFLOW_FIELDS_PROJECTION
    );

    const missingWorkflows: SelectedWorkflowFields[] = allWorkflows.filter(
      (workflow) => !storedPreferenceWorkflowInternalIds.has(workflow._id)
    );

    const computedPreferences = await this.computePreferencesForMissingWorkflows(
      command,
      subscription,
      missingWorkflows
    );

    return {
      allPreferencesEntities: [...storedPreferences, ...computedPreferences],
      allWorkflowEntities: [...allWorkflows],
    };
  }

  private async computePreferencesForMissingWorkflows(
    command: GetSubscriptionCommand,
    subscription: TopicSubscribersEntity,
    missingWorkflows: SelectedWorkflowFields[]
  ): Promise<Array<PartialPreferenceEntity>> {
    if (missingWorkflows.length === 0) {
      return [];
    }

    const computedPreferences = await Promise.all(
      missingWorkflows.map(async (workflow) => {
        const result = await this.getPreferences.safeExecute(
          GetPreferencesCommand.create({
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            subscriberId: subscription._subscriberId,
            templateId: workflow._id,
            excludeSubscriberPreferences: true,
            contextKeys: subscription.contextKeys,
          })
        );

        if (!result?.preferences) {
          return null;
        }

        return {
          _templateId: workflow._id,
          preferences: result.preferences,
        };
      })
    );

    return computedPreferences.filter((pref): pref is NonNullable<typeof pref> => pref !== null);
  }
}

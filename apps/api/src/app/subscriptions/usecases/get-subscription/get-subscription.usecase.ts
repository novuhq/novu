import { Injectable } from '@nestjs/common';
import { GetPreferences, GetPreferencesCommand, InstrumentUsecase } from '@novu/application-generic';
import {
  BaseRepository,
  NotificationTemplateRepository,
  PreferencesEntity,
  PreferencesRepository,
  TopicSubscribersEntity,
  TopicSubscribersRepository,
} from '@novu/dal';
import { PreferencesTypeEnum } from '@novu/shared';
import { SubscriptionDetailsResponseDto } from '../../../shared/dtos/subscription-details-response.dto';
import {
  mapTopicSubscriptionToDto,
  SELECTED_WORKFLOW_FIELDS_PROJECTION,
  SelectedWorkflowFields,
} from '../../utils/subscriptions';
import { GetSubscriptionCommand } from './get-subscription.command';

type PartialPreferenceEntity = Pick<PreferencesEntity, '_templateId' | 'preferences'>;

@Injectable()
export class GetSubscription {
  constructor(
    private topicSubscribersRepository: TopicSubscribersRepository,
    private preferencesRepository: PreferencesRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private getPreferences: GetPreferences
  ) {}

  @InstrumentUsecase()
  async execute(command: GetSubscriptionCommand): Promise<SubscriptionDetailsResponseDto | null> {
    const subscription = await this.topicSubscribersRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      topicKey: command.topicKey,
      ...(TopicSubscribersRepository.isInternalId(command.subscriptionIdOrIdentifier)
        ? { _id: command.subscriptionIdOrIdentifier }
        : { identifier: command.subscriptionIdOrIdentifier }),
    });

    if (!subscription) {
      return null;
    }

    const preferencesEntities = await this.preferencesRepository.find({
      _environmentId: subscription._environmentId,
      _subscriberId: subscription._subscriberId,
      _topicSubscriptionId: subscription._id,
      type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
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
            ensureDefaultAllEnabled: false,
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

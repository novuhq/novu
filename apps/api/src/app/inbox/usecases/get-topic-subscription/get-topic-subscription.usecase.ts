import { Injectable, NotFoundException } from '@nestjs/common';
import { GetPreferences, GetPreferencesCommand, InstrumentUsecase } from '@novu/application-generic';
import {
  NotificationTemplateRepository,
  PreferencesEntity,
  PreferencesRepository,
  TopicSubscribersEntity,
  TopicSubscribersRepository,
} from '@novu/dal';
import { PreferencesTypeEnum } from '@novu/shared';
import { TopicSubscriptionDetailsResponseDto } from '../../dtos/get-topic-subscriptions-response.dto';
import { mapTopicSubscriptionToDto } from '../../utils/topic-subscription-mapper';
import {
  SELECTED_WORKFLOW_FIELDS_PROJECTION,
  SelectedWorkflowFields,
} from '../get-topic-subscriptions/get-topic-subscriptions.usecase';
import { GetTopicSubscriptionCommand } from './get-topic-subscription.command';

@Injectable()
export class GetTopicSubscription {
  constructor(
    private topicSubscribersRepository: TopicSubscribersRepository,
    private preferencesRepository: PreferencesRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private getPreferences: GetPreferences
  ) {}

  @InstrumentUsecase()
  async execute(command: GetTopicSubscriptionCommand): Promise<TopicSubscriptionDetailsResponseDto> {
    const subscription = await this.topicSubscribersRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command._subscriberId,
      topicKey: command.topicKey,
      ...(TopicSubscribersRepository.isInternalId(command.subscriptionIdOrIdentifier)
        ? { _id: command.subscriptionIdOrIdentifier }
        : { identifier: command.subscriptionIdOrIdentifier }),
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription with ID ${command.subscriptionIdOrIdentifier} not found for topic ${command.topicKey}`
      );
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
    command: GetTopicSubscriptionCommand,
    subscription: TopicSubscribersEntity,
    storedPreferences: PreferencesEntity[]
  ): Promise<{
    allPreferencesEntities: PreferencesEntity[];
    allWorkflowEntities: SelectedWorkflowFields[];
  }> {
    const storedPreferenceWorkflowInternalIds = new Set(
      storedPreferences.map((pref) => pref._templateId?.toString()).filter((id): id is string => id !== undefined)
    );

    const workflowEntities =
      storedPreferenceWorkflowInternalIds.size > 0
        ? await this.notificationTemplateRepository.find(
            {
              _id: { $in: Array.from(storedPreferenceWorkflowInternalIds) },
              _environmentId: subscription._environmentId,
              _organizationId: subscription._organizationId,
            },
            SELECTED_WORKFLOW_FIELDS_PROJECTION
          )
        : [];

    const storedWorkflowIds = workflowEntities.map((workflow) => workflow.triggers?.[0]?.identifier);
    const requestedWorkflows = await this.fetchRequestedWorkflows(command, subscription, storedWorkflowIds);
    const missingWorkflows = requestedWorkflows.filter(
      (workflow) => !storedPreferenceWorkflowInternalIds.has(workflow._id)
    );

    const computedPreferences = await this.computePreferencesForMissingWorkflows(
      command,
      subscription,
      missingWorkflows
    );

    return {
      allPreferencesEntities: [...storedPreferences, ...computedPreferences],
      allWorkflowEntities: [...workflowEntities, ...missingWorkflows],
    };
  }

  private async fetchRequestedWorkflows(
    command: GetTopicSubscriptionCommand,
    subscription: TopicSubscribersEntity,
    storedWorkflowIds: string[]
  ): Promise<SelectedWorkflowFields[]> {
    if (!command.workflowIdentifiers?.length && !command.tags?.length) {
      return [];
    }

    const orConditions: Array<Record<string, unknown>> = [];

    if (command.workflowIdentifiers?.length) {
      // Exclude already-fetched workflows to avoid duplicate DB queries
      const remainingIdentifiers = command.workflowIdentifiers.filter((id) => !storedWorkflowIds.includes(id));
      if (remainingIdentifiers.length > 0) {
        orConditions.push({
          'triggers.identifier': { $in: remainingIdentifiers },
        });
      }
    }

    if (command.tags?.length) {
      orConditions.push({ tags: { $in: command.tags } });
    }

    const workflows = await this.notificationTemplateRepository.find(
      {
        _environmentId: subscription._environmentId,
        $or: orConditions,
      },
      SELECTED_WORKFLOW_FIELDS_PROJECTION
    );

    return workflows;
  }

  private async computePreferencesForMissingWorkflows(
    command: GetTopicSubscriptionCommand,
    subscription: TopicSubscribersEntity,
    missingWorkflows: SelectedWorkflowFields[]
  ): Promise<PreferencesEntity[]> {
    if (missingWorkflows.length === 0) {
      return [];
    }

    const computedPreferences = await Promise.all(
      missingWorkflows.map(async (workflow) => {
        const result = await this.getPreferences.safeExecute(
          GetPreferencesCommand.create({
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            subscriberId: command._subscriberId,
            templateId: workflow._id,
            ensureDefaultAllEnabled: false,
          })
        );

        console.log('@@@@@ result', JSON.stringify({ subscriber: command._subscriberId, result }, null, 2));

        if (!result?.preferences) {
          return null;
        }

        return {
          _id: `computed-${workflow._id}`,
          _organizationId: command.organizationId,
          _environmentId: command.environmentId,
          _subscriberId: subscription._subscriberId,
          _templateId: workflow._id,
          _topicSubscriptionId: subscription._id,
          type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
          preferences: result.preferences,
        } as PreferencesEntity;
      })
    );

    return computedPreferences.filter((pref): pref is PreferencesEntity => pref !== null);
  }
}

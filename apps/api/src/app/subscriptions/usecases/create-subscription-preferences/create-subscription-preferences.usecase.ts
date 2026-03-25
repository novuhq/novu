import { Injectable } from '@nestjs/common';
import {
  buildDefaultSubscriptionIdentifier,
  GetPreferences,
  GetPreferencesCommand,
  InstrumentUsecase,
  PinoLogger,
} from '@novu/application-generic';
import { ErrorCodesEnum, NotificationTemplateEntity, PreferencesRepository, TopicSubscribersEntity } from '@novu/dal';
import {
  buildWorkflowPreferences,
  PreferencesTypeEnum,
  SeverityLevelEnum,
  WorkflowPreferences,
  WorkflowPreferencesPartial,
} from '@novu/shared';
import { RulesLogic } from 'json-logic-js';
import { SubscriptionPreferenceDto } from '../../../shared/dtos/subscriptions/create-subscriptions-response.dto';
import { CreateSubscriptionPreferencesCommand } from './create-subscription-preferences.command';

type CreateSubscriptionPreferencesBatchCommand = Omit<
  CreateSubscriptionPreferencesCommand,
  'subscriptionId' | '_subscriberId' | 'topicKey' | 'externalSubscriberId' | '_topicSubscriptionId'
>;

@Injectable()
export class CreateSubscriptionPreferencesUsecase {
  constructor(
    private preferencesRepository: PreferencesRepository,
    private getPreferences: GetPreferences,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: CreateSubscriptionPreferencesCommand): Promise<SubscriptionPreferenceDto[] | undefined> {
    if (!command.preferences.length || !command.workflows.length) {
      return undefined;
    }

    const preferencesResult: SubscriptionPreferenceDto[] = [];

    for (const workflow of command.workflows) {
      const workflowPreferences = await this.getWorkflowPreferences(command, workflow);

      if (!workflowPreferences) {
        continue;
      }

      let createdPreference;
      try {
        createdPreference = await this.preferencesRepository.create({
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
          _subscriberId: command._subscriberId,
          _templateId: workflow._id,
          _topicSubscriptionId: command._topicSubscriptionId,
          type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
          preferences: workflowPreferences,
          contextKeys: command.contextKeys,
        });
      } catch (error) {
        const isDuplicateKeyError =
          error && typeof error === 'object' && 'code' in error && error.code === ErrorCodesEnum.DUPLICATE_KEY;

        if (isDuplicateKeyError) {
          createdPreference = await this.preferencesRepository.findOne({
            _environmentId: command.environmentId,
            _subscriberId: command._subscriberId,
            _templateId: workflow._id,
            _topicSubscriptionId: command._topicSubscriptionId,
            type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
          });
        }

        if (!isDuplicateKeyError || !createdPreference) {
          throw error;
        }
      }

      if (createdPreference) {
        preferencesResult.push({
          workflow: {
            id: workflow._id,
            identifier: workflow.triggers?.[0]?.identifier || '',
            name: workflow.name || '',
            critical: workflow.critical || false,
            tags: workflow.tags,
            data: workflow.data,
            severity: workflow.severity || SeverityLevelEnum.NONE,
          },
          subscriptionId:
            command.subscriptionId ||
            buildDefaultSubscriptionIdentifier(command.topicKey, command.externalSubscriberId, command.contextKeys),
          enabled: createdPreference.preferences?.all?.enabled ?? true,
          condition: createdPreference.preferences?.all?.condition as RulesLogic | undefined,
        });
      }
    }

    return preferencesResult.length > 0 ? preferencesResult : undefined;
  }

  @InstrumentUsecase()
  async executeBatch(
    command: CreateSubscriptionPreferencesBatchCommand,
    subscriptions: TopicSubscribersEntity[] = []
  ): Promise<Array<{ subscriptionId: string; preferences: SubscriptionPreferenceDto[] }>> {
    if (!command.preferences.length || !command.workflows.length || subscriptions.length === 0) {
      return [];
    }

    const preferencesToCreate = await this.buildPreferencesToCreate(command, subscriptions);

    if (preferencesToCreate.length === 0) {
      return [];
    }

    await this.preferencesRepository.insertMany(
      preferencesToCreate.map(({ subscriptionId, workflow, ...pref }) => pref),
      false
    );

    const resultMap = new Map<string, SubscriptionPreferenceDto[]>();

    for (const prefData of preferencesToCreate) {
      const subscriptionId = prefData.subscriptionId;

      if (!resultMap.has(subscriptionId)) {
        resultMap.set(subscriptionId, []);
      }

      const workflow = prefData.workflow;
      const preferences = resultMap.get(subscriptionId);
      if (preferences) {
        preferences.push({
          workflow: {
            id: workflow._id,
            identifier: workflow.triggers?.[0]?.identifier || '',
            name: workflow.name || '',
            critical: workflow.critical || false,
            tags: workflow.tags,
            data: workflow.data,
            severity: workflow.severity || SeverityLevelEnum.NONE,
          },
          subscriptionId,
          enabled: prefData.preferences?.all?.enabled ?? true,
          condition: prefData.preferences?.all?.condition as RulesLogic | undefined,
        });
      }
    }

    return Array.from(resultMap.entries()).map(([subscriptionId, preferences]) => ({
      subscriptionId,
      preferences,
    }));
  }

  private async buildPreferencesToCreate(
    command: CreateSubscriptionPreferencesBatchCommand,
    subscriptions: TopicSubscribersEntity[] = []
  ): Promise<
    Array<{
      _environmentId: string;
      _organizationId: string;
      _subscriberId: string;
      _templateId: string;
      _topicSubscriptionId: string;
      type: PreferencesTypeEnum;
      preferences: WorkflowPreferences;
      contextKeys?: string[];
      subscriptionId: string;
      workflow: NotificationTemplateEntity;
    }>
  > {
    const preferencesToCreate: Array<{
      _environmentId: string;
      _organizationId: string;
      _subscriberId: string;
      _templateId: string;
      _topicSubscriptionId: string;
      type: PreferencesTypeEnum;
      preferences: WorkflowPreferences;
      contextKeys?: string[];
      subscriptionId: string;
      workflow: NotificationTemplateEntity;
    }> = [];

    for (const subscription of subscriptions) {
      for (const workflow of command.workflows) {
        const workflowPreferences = await this.getWorkflowPreferencesForBatch(
          command,
          workflow,
          subscription._subscriberId.toString()
        );

        if (workflowPreferences) {
          preferencesToCreate.push({
            _environmentId: command.environmentId,
            _organizationId: command.organizationId,
            _subscriberId: subscription._subscriberId.toString(),
            _templateId: workflow._id,
            _topicSubscriptionId: subscription._id.toString(),
            type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
            preferences: workflowPreferences,
            contextKeys: command.contextKeys,
            subscriptionId:
              subscription.identifier ||
              buildDefaultSubscriptionIdentifier(
                subscription.topicKey,
                subscription.externalSubscriberId,
                subscription.contextKeys
              ),
            workflow,
          });
        }
      }
    }

    return preferencesToCreate;
  }

  private async getWorkflowPreferencesForBatch(
    command: CreateSubscriptionPreferencesBatchCommand,
    workflow: NotificationTemplateEntity,
    _subscriberId: string
  ): Promise<WorkflowPreferences | undefined> {
    const preferenceFilterDefinition = this.findPreferenceFilterDefinition(command, workflow);
    let enabled: boolean | undefined;

    if (preferenceFilterDefinition?.enabled !== undefined) {
      enabled = preferenceFilterDefinition.enabled;
    } else {
      const getPreferencesResult = await this.getPreferences.safeExecute(
        GetPreferencesCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          templateId: workflow._id,
          subscriberId: _subscriberId,
          excludeSubscriberPreferences: true,
        })
      );
      enabled = getPreferencesResult?.preferences.all?.enabled;
    }

    const partialPreferences: WorkflowPreferencesPartial = {
      all: {
        enabled,
        readOnly: false,
        ...(preferenceFilterDefinition?.condition !== undefined && { condition: preferenceFilterDefinition.condition }),
      },
    };

    return buildWorkflowPreferences(partialPreferences);
  }

  private async getWorkflowPreferences(
    command: CreateSubscriptionPreferencesCommand,
    workflow: { _id: string; tags?: string[]; triggers?: Array<{ identifier?: string }> }
  ): Promise<WorkflowPreferences | undefined> {
    const preferenceFilterDefinition = this.findPreferenceFilterDefinition(command, workflow);
    let enabled: boolean | undefined;

    if (preferenceFilterDefinition?.enabled !== undefined) {
      enabled = preferenceFilterDefinition.enabled;
    } else {
      const getPreferencesResult = await this.getPreferences.safeExecute(
        GetPreferencesCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          templateId: workflow._id,
          subscriberId: command._subscriberId,
          excludeSubscriberPreferences: true,
        })
      );
      enabled = getPreferencesResult?.preferences.all?.enabled;
    }

    const partialPreferences: WorkflowPreferencesPartial = {
      all: {
        enabled,
        readOnly: false,
        ...(preferenceFilterDefinition?.condition !== undefined && { condition: preferenceFilterDefinition.condition }),
      },
    };

    return buildWorkflowPreferences(partialPreferences);
  }

  private findPreferenceFilterDefinition(
    command: CreateSubscriptionPreferencesCommand | CreateSubscriptionPreferencesBatchCommand,
    workflow: { _id: string; tags?: string[]; triggers?: Array<{ identifier?: string }> }
  ) {
    return command.preferences.find((pref) => {
      if (pref.filter.tags && pref.filter.tags.length > 0) {
        return workflow.tags && pref.filter.tags.some((tag) => workflow.tags?.includes(tag));
      }
      if (pref.filter.workflowIds && pref.filter.workflowIds.length > 0) {
        return pref.filter.workflowIds.some((id) => {
          const workflowIdentifier = workflow.triggers?.[0]?.identifier;

          return id === workflow._id || id === workflowIdentifier;
        });
      }

      return false;
    });
  }
}

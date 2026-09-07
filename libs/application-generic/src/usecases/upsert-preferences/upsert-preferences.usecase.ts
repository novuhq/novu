import { Injectable } from '@nestjs/common';
import {
  EnforceEnvOrOrgIds,
  ErrorCodesEnum,
  PreferencesDBModel,
  PreferencesEntity,
  PreferencesRepository,
} from '@novu/dal';
import {
  FeatureFlagsKeysEnum,
  PreferencesTypeEnum,
  WorkflowPreferences,
  WorkflowPreferencesPartial,
} from '@novu/shared';
import { FilterQuery } from 'mongoose';
import { Instrument } from '../../instrumentation';
import { FeatureFlagsService } from '../../services/feature-flags/feature-flags.service';
import { deepMerge } from '../../utils';
import { UpsertSubscriberGlobalPreferencesCommand } from './upsert-subscriber-global-preferences.command';
import { UpsertSubscriberWorkflowPreferencesCommand } from './upsert-subscriber-workflow-preferences.command';
import { UpsertUserWorkflowPreferencesCommand } from './upsert-user-workflow-preferences.command';
import { UpsertWorkflowPreferencesCommand } from './upsert-workflow-preferences.command';

export type WorkflowPreferencesFull = Omit<PreferencesEntity, 'preferences'> & {
  preferences: WorkflowPreferences;
};

type UpsertPreferencesCommand = Omit<
  Partial<
    UpsertWorkflowPreferencesCommand &
      UpsertSubscriberGlobalPreferencesCommand &
      UpsertSubscriberWorkflowPreferencesCommand &
      UpsertUserWorkflowPreferencesCommand
  >,
  'preferences'
> & {
  organizationId: string;
  environmentId: string;
  type: PreferencesTypeEnum;
  preferences: WorkflowPreferencesPartial;
  topicSubscriptionId?: string;
};

@Injectable()
export class UpsertPreferences {
  constructor(
    private preferencesRepository: PreferencesRepository,
    private featureFlagsService: FeatureFlagsService
  ) {}

  @Instrument()
  public async upsertWorkflowPreferences(command: UpsertWorkflowPreferencesCommand): Promise<WorkflowPreferencesFull> {
    const result = await this.upsert({
      templateId: command.templateId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      preferences: command.preferences,
      type: PreferencesTypeEnum.WORKFLOW_RESOURCE,
      returnPreference: true,
    });

    return result as WorkflowPreferencesFull;
  }

  @Instrument()
  public async upsertSubscriberGlobalPreferences(command: UpsertSubscriberGlobalPreferencesCommand) {
    await this.deleteSubscriberWorkflowChannelPreferences(command);

    return this.upsert({
      _subscriberId: command._subscriberId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      preferences: command.preferences,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
      returnPreference: command.returnPreference,
      schedule: command.schedule,
      contextKeys: command.contextKeys,
    });
  }

  private async deleteSubscriberWorkflowChannelPreferences(command: UpsertSubscriberGlobalPreferencesCommand) {
    const channelTypes = Object.keys(command.preferences?.channels || {});

    if (channelTypes.length === 0) {
      // If there are no channels to update, we don't need to run the update query
      return;
    }

    const preferenceUnsetPayload = channelTypes.reduce((acc, channelType) => {
      acc[`preferences.channels.${channelType}`] = '';

      return acc;
    }, {});

    await this.preferencesRepository.update(
      {
        _environmentId: command.environmentId,
        _subscriberId: command._subscriberId,
        type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
        $or: channelTypes.map((channelType) => ({
          [`preferences.channels.${channelType}`]: { $exists: true },
        })),
      },
      {
        $unset: preferenceUnsetPayload,
      }
    );
  }

  @Instrument()
  public async upsertSubscriberWorkflowPreferences(command: UpsertSubscriberWorkflowPreferencesCommand) {
    return this.upsert({
      _subscriberId: command._subscriberId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      contextKeys: command.contextKeys,
      preferences: command.preferences,
      templateId: command.templateId,
      type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
      returnPreference: command.returnPreference,
    });
  }

  @Instrument()
  public async upsertUserWorkflowPreferences(
    command: UpsertUserWorkflowPreferencesCommand
  ): Promise<WorkflowPreferencesFull> {
    const result = await this.upsert({
      userId: command.userId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      preferences: command.preferences,
      templateId: command.templateId,
      type: PreferencesTypeEnum.USER_WORKFLOW,
      returnPreference: true,
    });

    return result as WorkflowPreferencesFull;
  }

  @Instrument()
  public async upsertTopicSubscriptionPreferences(command: UpsertSubscriberWorkflowPreferencesCommand) {
    return this.upsert({
      _subscriberId: command._subscriberId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      preferences: command.preferences,
      templateId: command.templateId,
      topicSubscriptionId: command.topicSubscriptionId,
      type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
      returnPreference: command.returnPreference,
      contextKeys: command.contextKeys,
    });
  }

  private async upsert(command: UpsertPreferencesCommand): Promise<PreferencesEntity | undefined> {
    const foundPreference = await this.getPreference(command);

    if (foundPreference) {
      return this.updatePreferences(foundPreference, command);
    }

    return this.createPreferences(command);
  }

  private async createPreferences(command: UpsertPreferencesCommand): Promise<PreferencesEntity> {
    const useContextFiltering = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
    });

    // Determine contextKeys based on preference type AND feature flag
    // Non-context-scoped types (universal/workflow-level): undefined (no field)
    // Context-scoped types (subscriber-level): [] or ["key"]
    const isContextScoped = [
      PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
      PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
      PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    ].includes(command.type);

    try {
      return await this.preferencesRepository.create({
        _subscriberId: command._subscriberId,
        _userId: command.userId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _templateId: command.templateId,
        _topicSubscriptionId: command.topicSubscriptionId,
        preferences: command.preferences,
        type: command.type,
        schedule: command.schedule,
        contextKeys: useContextFiltering && isContextScoped ? (command.contextKeys ?? []) : undefined,
      });
    } catch (error) {
      const isDuplicateKeyError =
        error && typeof error === 'object' && 'code' in error && error.code === ErrorCodesEnum.DUPLICATE_KEY;

      if (isDuplicateKeyError) {
        const existingPreference = await this.getPreference(command);
        if (existingPreference) {
          return existingPreference;
        }
      }

      throw error;
    }
  }

  private async updatePreferences(
    foundPreference: PreferencesEntity,
    command: UpsertPreferencesCommand
  ): Promise<PreferencesEntity> {
    const mergedPreferences = deepMerge([
      foundPreference.preferences,
      command.preferences as WorkflowPreferencesPartial,
    ]);

    await this.preferencesRepository.update(
      {
        _id: foundPreference._id,
        _environmentId: command.environmentId,
      },
      {
        $set: {
          preferences: {
            ...mergedPreferences,
            ...(mergedPreferences.all && {
              all: {
                ...mergedPreferences.all,
                ...(command.preferences.all?.condition !== undefined && {
                  condition: command.preferences.all?.condition,
                }),
              },
            }),
          },
          schedule: command.schedule,
          _userId: command.userId,
        },
      }
    );

    if (command.returnPreference) {
      return await this.getPreference(command);
    }

    return undefined;
  }

  private async getPreference(command: UpsertPreferencesCommand): Promise<PreferencesEntity | undefined> {
    // Non-context-scoped types (universal/workflow-level) - no context filter
    const nonContextScopedTypes = [PreferencesTypeEnum.WORKFLOW_RESOURCE, PreferencesTypeEnum.USER_WORKFLOW];
    const useContextFiltering = nonContextScopedTypes.includes(command.type)
      ? false
      : await this.featureFlagsService.getFlag({
          key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
          defaultValue: false,
          organization: { _id: command.organizationId },
        });

    const contextQuery = this.preferencesRepository.buildContextExactMatchQuery(command.contextKeys, {
      enabled: useContextFiltering,
    });

    const query: FilterQuery<PreferencesDBModel> & EnforceEnvOrOrgIds = {
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command._subscriberId,
      _topicSubscriptionId: command.topicSubscriptionId,
      _templateId: command.templateId,
      type: command.type,
      ...contextQuery,
    };

    return await this.preferencesRepository.findOne(query);
  }
}

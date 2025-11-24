import { BadRequestException, Injectable } from '@nestjs/common';
import { PreferencesEntity, PreferencesRepository } from '@novu/dal';
import {
  buildWorkflowPreferences,
  FeatureFlagsKeysEnum,
  IPreferenceChannels,
  PreferencesTypeEnum,
  Schedule,
  WorkflowPreferences,
  WorkflowPreferencesPartial,
} from '@novu/shared';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { FeatureFlagsService } from '../../services/feature-flags';
import { MergePreferencesCommand } from '../merge-preferences/merge-preferences.command';
import { MergePreferences } from '../merge-preferences/merge-preferences.usecase';
import { GetPreferencesCommand } from './get-preferences.command';
import { GetPreferencesResponseDto } from './get-preferences.dto';

export type PreferenceSet = {
  workflowResourcePreference?: PreferencesEntity & {
    preferences: WorkflowPreferences;
  };
  workflowUserPreference?: PreferencesEntity & {
    preferences: WorkflowPreferences;
  };
  subscriberGlobalPreference?: PreferencesEntity & {
    preferences: WorkflowPreferencesPartial;
  };
  subscriberWorkflowPreference?: PreferencesEntity & {
    preferences: WorkflowPreferencesPartial;
  };
};

class PreferencesNotFoundException extends BadRequestException {
  constructor(featureFlagCommand: GetPreferencesCommand) {
    super({ message: 'Preferences not found', ...featureFlagCommand });
  }
}

@Injectable()
export class GetPreferences {
  constructor(
    private preferencesRepository: PreferencesRepository,
    private featureFlagsService: FeatureFlagsService
  ) {}

  @InstrumentUsecase()
  async execute(command: GetPreferencesCommand): Promise<GetPreferencesResponseDto> {
    const items = await this.getPreferencesFromDb(command);

    const mergedPreferences = MergePreferences.execute(MergePreferencesCommand.create(items));

    if (!mergedPreferences.preferences) {
      throw new PreferencesNotFoundException(command);
    }

    return mergedPreferences;
  }

  @Instrument()
  public async getSubscriberGlobalPreference(command: {
    environmentId: string;
    organizationId: string;
    subscriberId: string;
  }): Promise<{
    enabled: boolean;
    channels: IPreferenceChannels;
    schedule?: Schedule;
  }> {
    const result = await this.safeExecute(command);

    if (!result) {
      return {
        channels: {
          email: true,
          sms: true,
          in_app: true,
          chat: true,
          push: true,
        },
        enabled: true,
      };
    }

    const isSubscribersScheduleEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_SUBSCRIBERS_SCHEDULE_ENABLED,
      defaultValue: false,
      environment: { _id: command.environmentId },
      organization: { _id: command.organizationId },
    });

    return {
      enabled: true,
      channels: GetPreferences.mapWorkflowPreferencesToChannelPreferences(result.preferences),
      schedule: isSubscribersScheduleEnabled ? result.schedule : undefined,
    };
  }

  public async safeExecute(command: GetPreferencesCommand): Promise<GetPreferencesResponseDto> {
    try {
      return await this.execute(
        GetPreferencesCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          subscriberId: command.subscriberId,
          templateId: command.templateId,
          topicSubscriptionId: command.topicSubscriptionId,
        })
      );
    } catch (e) {
      // If we cant find preferences lets return undefined instead of throwing it up to caller to make it easier for caller to handle.
      if ((e as Error).name === PreferencesNotFoundException.name) {
        return undefined;
      }
      throw e;
    }
  }

  /** Transform WorkflowPreferences into IPreferenceChannels */
  public static mapWorkflowPreferencesToChannelPreferences(
    workflowPreferences: WorkflowPreferencesPartial
  ): IPreferenceChannels {
    const builtPreferences = buildWorkflowPreferences(workflowPreferences);

    const mappedPreferences = Object.entries(builtPreferences.channels ?? {}).reduce((acc, [channel, preference]) => {
      acc[channel as keyof IPreferenceChannels] = preference.enabled;

      return acc;
    }, {} as IPreferenceChannels);

    return mappedPreferences;
  }

  private async getPreferencesFromDb(command: GetPreferencesCommand): Promise<PreferenceSet> {
    const baseQuery = {
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    };

    const queryOptions = { readPreference: 'secondaryPreferred' as const };

    const queries = [
      this.preferencesRepository.findOne(
        {
          ...baseQuery,
          _templateId: command.templateId,
          type: PreferencesTypeEnum.WORKFLOW_RESOURCE,
        },
        undefined,
        queryOptions
      ),
      this.preferencesRepository.findOne(
        {
          ...baseQuery,
          _templateId: command.templateId,
          type: PreferencesTypeEnum.USER_WORKFLOW,
        },
        undefined,
        queryOptions
      ),
    ];

    if (command.subscriberId) {
      const workflowQuery = {
        ...baseQuery,
        _subscriberId: command.subscriberId,
        ...(command.topicSubscriptionId && { _topicSubscriptionId: command.topicSubscriptionId }),
        _templateId: command.templateId,
        type: command.topicSubscriptionId
          ? PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW
          : PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
      };

      queries.push(
        this.preferencesRepository.findOne(workflowQuery, undefined, queryOptions),
        this.preferencesRepository.findOne(
          {
            ...baseQuery,
            _subscriberId: command.subscriberId,
            type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
          },
          undefined,
          queryOptions
        )
      );
    }

    const [
      workflowResourcePreference,
      workflowUserPreference,
      subscriberWorkflowPreference,
      subscriberGlobalPreference,
    ] = await Promise.all(queries);

    const result: PreferenceSet = {};

    if (workflowResourcePreference) {
      result.workflowResourcePreference = workflowResourcePreference as PreferenceSet['workflowResourcePreference'];
    }

    if (workflowUserPreference) {
      result.workflowUserPreference = workflowUserPreference as PreferenceSet['workflowUserPreference'];
    }

    if (subscriberWorkflowPreference) {
      result.subscriberWorkflowPreference =
        subscriberWorkflowPreference as PreferenceSet['subscriberWorkflowPreference'];
    }

    if (subscriberGlobalPreference) {
      result.subscriberGlobalPreference = subscriberGlobalPreference as PreferenceSet['subscriberGlobalPreference'];
    }

    return result;
  }
}

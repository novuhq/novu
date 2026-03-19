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
import { InMemoryLRUCacheService, InMemoryLRUCacheStore } from '../../services/in-memory-lru-cache';
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
    private featureFlagsService: FeatureFlagsService,
    private inMemoryLRUCacheService: InMemoryLRUCacheService
  ) {}

  @InstrumentUsecase()
  async execute(command: GetPreferencesCommand): Promise<GetPreferencesResponseDto> {
    const useOptimizedFetch = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_PREFERENCE_FETCH_OPTIMIZATION_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
    });

    const items = useOptimizedFetch
      ? await this.getPreferencesFromDbOptimized(command)
      : await this.getPreferencesFromDb(command);

    const mergedPreferences = MergePreferences.execute(
      MergePreferencesCommand.create({
        ...items,
        excludeSubscriberPreferences: command.excludeSubscriberPreferences,
      })
    );

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
    contextKeys?: string[];
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

    return {
      enabled: true,
      channels: GetPreferences.mapWorkflowPreferencesToChannelPreferences(result.preferences),
      schedule: result.schedule,
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
          excludeSubscriberPreferences: command.excludeSubscriberPreferences,
          contextKeys: command.contextKeys,
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
      const useContextFiltering = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
        defaultValue: false,
        organization: { _id: command.organizationId },
      });

      const contextQuery = this.preferencesRepository.buildContextExactMatchQuery(command.contextKeys, {
        enabled: useContextFiltering,
      });

      queries.push(
        this.preferencesRepository.findOne(
          {
            ...baseQuery,
            _subscriberId: command.subscriberId,
            _templateId: command.templateId,
            type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
            ...contextQuery,
          },
          undefined,
          queryOptions
        ),
        this.preferencesRepository.findOne(
          {
            ...baseQuery,
            _subscriberId: command.subscriberId,
            type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
            ...contextQuery,
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

  @Instrument()
  private async getPreferencesFromDbOptimized(command: GetPreferencesCommand): Promise<PreferenceSet> {
    const baseQuery = {
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    };

    const queryOptions = { readPreference: 'secondaryPreferred' as const };

    const cacheOptions = {
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    };

    let workflowResourcePreference: PreferencesEntity | null = null;
    let workflowUserPreference: PreferencesEntity | null = null;

    if (command.templateId) {
      const workflowPreferences = await this.inMemoryLRUCacheService.get(
        InMemoryLRUCacheStore.WORKFLOW_PREFERENCES,
        `${command.environmentId}:${command.templateId}`,
        async (): Promise<[PreferencesEntity | null, PreferencesEntity | null]> => {
          const preferences = await this.preferencesRepository.find(
            {
              ...baseQuery,
              _templateId: command.templateId,
              type: { $in: [PreferencesTypeEnum.WORKFLOW_RESOURCE, PreferencesTypeEnum.USER_WORKFLOW] },
            },
            undefined,
            queryOptions
          );

          const workflowResourcePref =
            preferences.find((p) => p.type === PreferencesTypeEnum.WORKFLOW_RESOURCE) ?? null;
          const workflowUserPref = preferences.find((p) => p.type === PreferencesTypeEnum.USER_WORKFLOW) ?? null;

          return [workflowResourcePref, workflowUserPref];
        },
        cacheOptions
      );

      [workflowResourcePreference, workflowUserPreference] = workflowPreferences;
    }

    let subscriberWorkflowPreference: PreferencesEntity | null = null;
    let subscriberGlobalPreference: PreferencesEntity | null = null;

    if (command.subscriberId) {
      const useContextFiltering = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
        defaultValue: false,
        organization: { _id: command.organizationId },
      });

      const contextQuery = this.preferencesRepository.buildContextExactMatchQuery(command.contextKeys, {
        enabled: useContextFiltering,
      });

      const [workflowPref, globalPref] = await Promise.all([
        command.templateId
          ? this.preferencesRepository.findOne(
              {
                ...baseQuery,
                _subscriberId: command.subscriberId,
                _templateId: command.templateId,
                type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
                ...contextQuery,
              },
              undefined,
              queryOptions
            )
          : Promise.resolve(null),
        this.preferencesRepository.findOne(
          {
            ...baseQuery,
            _subscriberId: command.subscriberId,
            type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
            ...contextQuery,
          },
          undefined,
          queryOptions
        ),
      ]);

      subscriberWorkflowPreference = workflowPref;
      subscriberGlobalPreference = globalPref;
    }

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

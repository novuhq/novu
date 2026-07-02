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
import {
  InMemoryLRUCacheService,
  InMemoryLRUCacheStore,
  WorkflowPreferencesCacheData,
} from '../../services/in-memory-lru-cache';
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
    /**
     * Optionally pass a pre-fetched SUBSCRIBER_GLOBAL preferences entity so the caller
     * can hydrate the global preference response without issuing another mongo query.
     * Pass `null` (and not `undefined`) to indicate "we looked and there is none".
     */
    subscriberGlobalPreference?: PreferencesEntity | null;
  }): Promise<{
    enabled: boolean;
    channels: IPreferenceChannels;
    schedule?: Schedule;
  }> {
    const subscriberGlobalPreference =
      command.subscriberGlobalPreference !== undefined
        ? command.subscriberGlobalPreference
        : await this.findSubscriberGlobalPreferenceFromDb(command);

    if (!subscriberGlobalPreference) {
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
      channels: GetPreferences.mapWorkflowPreferencesToChannelPreferences(
        subscriberGlobalPreference.preferences as WorkflowPreferencesPartial
      ),
      schedule: subscriberGlobalPreference.schedule,
    };
  }

  /**
   * Targeted single-query fetch of the SUBSCRIBER_GLOBAL preferences for a subscriber.
   *
   * Historically this code path went through {@link safeExecute}/{@link execute}, which
   * issues 4 mongo queries (workflow resource + user, subscriber workflow, subscriber
   * global). When the caller only wants the subscriber's global preference there is no
   * templateId, so the 3 workflow-scoped queries return nothing and just burn CPU and
   * a connection on the secondary. This method bypasses that path entirely.
   */
  private async findSubscriberGlobalPreferenceFromDb(command: {
    environmentId: string;
    organizationId: string;
    subscriberId: string;
    contextKeys?: string[];
  }): Promise<PreferencesEntity | null> {
    const useContextFiltering = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
    });

    const contextQuery = this.preferencesRepository.buildContextExactMatchQuery(command.contextKeys, {
      enabled: useContextFiltering,
    });

    return this.preferencesRepository.findOne(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _subscriberId: command.subscriberId,
        type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
        ...contextQuery,
      },
      undefined,
      { readPreference: 'secondaryPreferred' as const }
    );
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

    let workflowResourcePreference: PreferencesEntity | null = null;
    let workflowUserPreference: PreferencesEntity | null = null;

    if (command.templateId) {
      const workflowPreferencesById = await this.getWorkflowPreferencesByIds({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        workflowIds: [command.templateId],
        readOptions: queryOptions,
      });

      [workflowResourcePreference, workflowUserPreference] = workflowPreferencesById.get(command.templateId) ?? [
        null,
        null,
      ];
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

  /**
   * Canonical reader for the subscriber-independent workflow-level preferences
   * (WORKFLOW_RESOURCE + USER_WORKFLOW), served from the shared WORKFLOW_PREFERENCES LRU store.
   *
   * This owns the single source of truth for the cache key scheme (`${environmentId}:${templateId}`)
   * and the tuple positional contract (`[WORKFLOW_RESOURCE, USER_WORKFLOW]`), so both the
   * single-workflow path (`getPreferencesFromDbOptimized`, N=1) and the multi-workflow
   * subscriber-preferences path consume the exact same entries — warmth is shared in both
   * directions and the contract cannot silently drift between call sites.
   *
   * Cache hits skip Mongo entirely; misses are fetched in a single batched `$in` query and
   * coalesced per key via `getMany`, so concurrent callers do not stampede on a cold/expired key.
   * Entries are shared references; callers must treat them as immutable (the merge pipeline does).
   */
  @Instrument()
  public async getWorkflowPreferencesByIds({
    environmentId,
    organizationId,
    workflowIds,
    readOptions,
  }: {
    environmentId: string;
    organizationId: string;
    workflowIds: string[];
    readOptions?: { readPreference?: 'secondaryPreferred' | 'primary' };
  }): Promise<Map<string, WorkflowPreferencesCacheData>> {
    const queryOptions = readOptions ?? { readPreference: 'secondaryPreferred' as const };
    const cacheKey = (workflowId: string) => `${environmentId}:${workflowId}`;
    const workflowIdByCacheKey = new Map(workflowIds.map((workflowId) => [cacheKey(workflowId), workflowId]));

    const tuplesByCacheKey = await this.inMemoryLRUCacheService.getMany(
      InMemoryLRUCacheStore.WORKFLOW_PREFERENCES,
      [...workflowIdByCacheKey.keys()],
      async (missingCacheKeys) => {
        const missingWorkflowIds: string[] = [];
        for (const missingCacheKey of missingCacheKeys) {
          const workflowId = workflowIdByCacheKey.get(missingCacheKey);
          // Every missing key originates from `workflowIdByCacheKey`, so this is always defined;
          // the guard keeps the invariant explicit instead of relying on a cast.
          if (workflowId !== undefined) {
            missingWorkflowIds.push(workflowId);
          }
        }

        const tuplesByWorkflowId = await this.fetchWorkflowPreferenceTuples({
          environmentId,
          organizationId,
          workflowIds: missingWorkflowIds,
          queryOptions,
        });

        const tuples = new Map<string, WorkflowPreferencesCacheData>();
        for (const workflowId of missingWorkflowIds) {
          tuples.set(cacheKey(workflowId), tuplesByWorkflowId.get(workflowId) ?? [null, null]);
        }

        return tuples;
      },
      { environmentId, organizationId }
    );

    const tuplesByWorkflowId = new Map<string, WorkflowPreferencesCacheData>();
    for (const workflowId of workflowIds) {
      const tuple = tuplesByCacheKey.get(cacheKey(workflowId));
      if (tuple !== undefined) {
        tuplesByWorkflowId.set(workflowId, tuple);
      }
    }

    return tuplesByWorkflowId;
  }

  /**
   * Fetches WORKFLOW_RESOURCE + USER_WORKFLOW preferences for the given workflows in a single
   * query and splits them into the canonical `[WORKFLOW_RESOURCE, USER_WORKFLOW]` tuple per
   * workflow. Workflows with no preferences are omitted (the caller seeds `[null, null]`).
   */
  private async fetchWorkflowPreferenceTuples({
    environmentId,
    organizationId,
    workflowIds,
    queryOptions,
  }: {
    environmentId: string;
    organizationId: string;
    workflowIds: string[];
    queryOptions: { readPreference?: 'secondaryPreferred' | 'primary' };
  }): Promise<Map<string, WorkflowPreferencesCacheData>> {
    const tuplesByWorkflowId = new Map<string, WorkflowPreferencesCacheData>();

    if (workflowIds.length === 0) {
      return tuplesByWorkflowId;
    }

    const preferences = await this.preferencesRepository.findForComputation(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _templateId: { $in: workflowIds },
        type: { $in: [PreferencesTypeEnum.WORKFLOW_RESOURCE, PreferencesTypeEnum.USER_WORKFLOW] },
      },
      queryOptions
    );

    for (const preference of preferences) {
      const workflowId = preference._templateId;
      if (workflowId === undefined) {
        continue;
      }

      const tuple = tuplesByWorkflowId.get(workflowId) ?? [null, null];
      if (preference.type === PreferencesTypeEnum.WORKFLOW_RESOURCE) {
        tuple[0] = preference;
      } else if (preference.type === PreferencesTypeEnum.USER_WORKFLOW) {
        tuple[1] = preference;
      }
      tuplesByWorkflowId.set(workflowId, tuple);
    }

    return tuplesByWorkflowId;
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import {
  FeatureFlagsService,
  filteredPreference,
  GetPreferences,
  GetPreferencesResponseDto,
  InMemoryLRUCacheService,
  InMemoryLRUCacheStore,
  Instrument,
  InstrumentUsecase,
  MergePreferences,
  MergePreferencesCommand,
  mapTemplateConfiguration,
  overridePreferences,
  PreferenceSet,
} from '@novu/application-generic';
import {
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  PreferencesEntity,
  PreferencesRepository,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  FeatureFlagsKeysEnum,
  IPreferenceChannels,
  ISubscriberPreferenceResponse,
  PreferencesTypeEnum,
  SeverityLevelEnum,
  WorkflowCriticalityEnum,
} from '@novu/shared';
import { GetSubscriberPreferenceCommand } from './get-subscriber-preference.command';

@Injectable()
export class GetSubscriberPreference {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private preferencesRepository: PreferencesRepository,
    private featureFlagsService: FeatureFlagsService,
    private inMemoryLRUCacheService: InMemoryLRUCacheService,
    private getPreferences: GetPreferences
  ) {}

  @InstrumentUsecase()
  async execute(command: GetSubscriberPreferenceCommand): Promise<ISubscriberPreferenceResponse[]> {
    const subscriber: Pick<SubscriberEntity, '_id'> | null =
      command.subscriber ??
      (await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId, false, '_id'));
    if (!subscriber) {
      throw new NotFoundException(`Subscriber with id: ${command.subscriberId} not found`);
    }

    const workflowList =
      command.workflowList ??
      (await this.getActiveWorkflows({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        tags: command.tags,
        severity: command.severity,
      }));

    const workflowIds = workflowList.map((wf) => wf._id);

    const {
      workflowResourcePreferences,
      workflowUserPreferences,
      subscriberWorkflowPreferences,
      subscriberGlobalPreference,
    } = await this.findAllPreferences({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      contextKeys: command.contextKeys,
      subscriberId: subscriber._id,
      workflowIds,
      preFetchedSubscriberGlobalPreference: command.subscriberGlobalPreference,
    });

    const allWorkflowPreferences = [
      ...workflowResourcePreferences,
      ...workflowUserPreferences,
      ...subscriberWorkflowPreferences,
    ];

    const workflowPreferenceSets = allWorkflowPreferences.reduce<Record<string, PreferenceSet>>((acc, preference) => {
      const workflowId = preference._templateId;

      // Skip if the preference is not for a workflow
      if (workflowId === undefined) {
        return acc;
      }

      if (!acc[workflowId]) {
        acc[workflowId] = {
          workflowResourcePreference: undefined,
          workflowUserPreference: undefined,
          subscriberWorkflowPreference: undefined,
        };
      }
      switch (preference.type) {
        case PreferencesTypeEnum.WORKFLOW_RESOURCE:
          acc[workflowId].workflowResourcePreference = preference as PreferenceSet['workflowResourcePreference'];
          break;
        case PreferencesTypeEnum.USER_WORKFLOW:
          acc[workflowId].workflowUserPreference = preference as PreferenceSet['workflowUserPreference'];
          break;
        case PreferencesTypeEnum.SUBSCRIBER_WORKFLOW:
          acc[workflowId].subscriberWorkflowPreference = preference;
          break;
        default:
      }

      return acc;
    }, {});

    const workflowPreferences = this.calculateWorkflowPreferences(
      workflowList,
      workflowPreferenceSets,
      subscriberGlobalPreference,
      command.includeInactiveChannels
    );

    const nonCriticalWorkflowPreferences = workflowPreferences.filter(
      (preference): preference is ISubscriberPreferenceResponse => {
        if (preference === undefined) {
          return false;
        }

        if (command.criticality === WorkflowCriticalityEnum.ALL) {
          return true;
        }

        if (command.criticality === WorkflowCriticalityEnum.CRITICAL) {
          return preference.template.critical === true;
        }

        return preference.template.critical === false;
      }
    );

    return nonCriticalWorkflowPreferences;
  }

  @Instrument()
  private calculateWorkflowPreferences(
    workflowList: NotificationTemplateEntity[],
    workflowPreferenceSets: Record<string, PreferenceSet>,
    subscriberGlobalPreference: PreferencesEntity | null,
    includeInactiveChannels: boolean
  ): ISubscriberPreferenceResponse[] {
    /*
     * Process all workflows synchronously. filterActive caps at 200 workflows and the
     * CPU cost is ~1ms even at that ceiling (see NV-8111 profiling). The previous
     * setImmediate-per-chunk yielding inflated NR-visible duration under concurrent load:
     * each await queued behind thousands of other preference requests (~20-40ms per wait
     * at moderate concurrency), which dominated p99 latency and saturated the event loop
     * without reducing actual CPU work.
     */
    return workflowList
      .map((workflow) => {
        const preferences = workflowPreferenceSets[workflow._id];

        if (!preferences) {
          return null;
        }

        const merged = this.mergePreferences(preferences, subscriberGlobalPreference);

        const includedChannels = this.getChannels(workflow, includeInactiveChannels);

        const initialChannels = filteredPreference(
          {
            email: true,
            sms: true,
            in_app: true,
            chat: true,
            push: true,
          },
          includedChannels
        );

        const { channels, overrides } = this.calculateChannelsAndOverrides(merged, initialChannels);

        const preference: ISubscriberPreferenceResponse = {
          preference: {
            channels,
            enabled: true,
            overrides,
            ...(preferences.subscriberWorkflowPreference?.updatedAt && {
              updatedAt: preferences.subscriberWorkflowPreference.updatedAt,
            }),
          },
          template: {
            ...mapTemplateConfiguration(workflow),
            critical: merged.preferences.all.readOnly,
          },
          type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
        };

        return preference;
      })
      .filter((item): item is ISubscriberPreferenceResponse => item !== null);
  }

  @Instrument()
  private calculateChannelsAndOverrides(merged: GetPreferencesResponseDto, initialChannels: IPreferenceChannels) {
    return overridePreferences(
      {
        template: GetPreferences.mapWorkflowPreferencesToChannelPreferences(merged.source.WORKFLOW_RESOURCE),
        subscriber: GetPreferences.mapWorkflowPreferencesToChannelPreferences(merged.preferences),
        workflowOverride: {},
      },
      initialChannels
    );
  }

  @Instrument()
  private mergePreferences(preferences: PreferenceSet, subscriberGlobalPreference: PreferencesEntity | null) {
    const mergeCommand = MergePreferencesCommand.create({
      workflowResourcePreference: preferences.workflowResourcePreference,
      workflowUserPreference: preferences.workflowUserPreference,
      subscriberWorkflowPreference: preferences.subscriberWorkflowPreference,
      ...(subscriberGlobalPreference ? { subscriberGlobalPreference } : {}),
    });

    return MergePreferences.execute(mergeCommand);
  }

  private getChannels(workflow: NotificationTemplateEntity, includeInactiveChannels: boolean): ChannelTypeEnum[] {
    if (includeInactiveChannels) {
      return Object.values(ChannelTypeEnum);
    }

    const channelSet = new Set<ChannelTypeEnum>();

    for (const step of workflow.steps) {
      if (step.active && step.template?.type) {
        channelSet.add(step.template.type as unknown as ChannelTypeEnum);
      }
    }

    return Array.from(channelSet);
  }

  @Instrument()
  private async findAllPreferences({
    environmentId,
    organizationId,
    subscriberId,
    workflowIds,
    contextKeys,
    preFetchedSubscriberGlobalPreference,
  }: {
    environmentId: string;
    organizationId: string;
    subscriberId: string;
    workflowIds: string[];
    contextKeys?: string[];
    preFetchedSubscriberGlobalPreference?: PreferencesEntity | null;
  }) {
    const baseQuery = {
      _environmentId: environmentId,
      _organizationId: organizationId,
    };

    const readOptions = { readPreference: 'secondaryPreferred' as const };
    const useContextFiltering = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
      defaultValue: false,
      organization: { _id: organizationId },
    });

    const contextQuery = this.preferencesRepository.buildContextExactMatchQuery(contextKeys, {
      enabled: useContextFiltering,
    });

    /*
     * When the caller already fetched the SUBSCRIBER_GLOBAL preference (e.g. the v2
     * /preferences endpoint, which also exposes it on the response), skip the duplicate
     * mongo query. Under concurrent load this duplicate fetch is one of the larger CPU/IO
     * sources because every preferences call hits both this code path and
     * `GetSubscriberGlobalPreference` for the same document.
     */
    const subscriberGlobalPreferenceQuery: Promise<PreferencesEntity[]> =
      preFetchedSubscriberGlobalPreference !== undefined
        ? Promise.resolve(preFetchedSubscriberGlobalPreference ? [preFetchedSubscriberGlobalPreference] : [])
        : this.preferencesRepository.findForComputation(
            {
              ...baseQuery,
              _subscriberId: subscriberId,
              type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
              ...contextQuery,
            },
            readOptions
          );

    const [
      { workflowResourcePreferences, workflowUserPreferences },
      subscriberWorkflowPreferences,
      subscriberGlobalPreferences,
    ] = await Promise.all([
      this.getWorkflowLevelPreferences({
        environmentId,
        organizationId,
        workflowIds,
        readOptions,
      }),
      this.preferencesRepository.findForComputation(
        {
          ...baseQuery,
          _subscriberId: subscriberId,
          _templateId: { $in: workflowIds },
          type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
          ...contextQuery,
        },
        readOptions
      ),
      subscriberGlobalPreferenceQuery,
    ]);

    return {
      workflowResourcePreferences,
      workflowUserPreferences,
      subscriberWorkflowPreferences,
      subscriberGlobalPreference: subscriberGlobalPreferences[0] ?? null,
    };
  }

  /**
   * Resolves the subscriber-independent workflow-level preferences (WORKFLOW_RESOURCE and
   * USER_WORKFLOW) for a set of workflows by delegating to the canonical, in-flight-coalesced
   * `GetPreferences.getWorkflowPreferencesByIds` reader (shared with the single-workflow path),
   * then flattens the per-workflow tuples into the two arrays the merge step consumes.
   *
   * The returned entries are shared cache references and must be treated as immutable; the merge
   * pipeline (`MergePreferences`) only reads them and produces fresh objects.
   */
  @Instrument()
  private async getWorkflowLevelPreferences({
    environmentId,
    organizationId,
    workflowIds,
    readOptions,
  }: {
    environmentId: string;
    organizationId: string;
    workflowIds: string[];
    readOptions: { readPreference: 'secondaryPreferred' | 'primary' };
  }): Promise<{
    workflowResourcePreferences: PreferencesEntity[];
    workflowUserPreferences: PreferencesEntity[];
  }> {
    const tuplesByWorkflowId = await this.getPreferences.getWorkflowPreferencesByIds({
      environmentId,
      organizationId,
      workflowIds,
      readOptions,
    });

    const workflowResourcePreferences: PreferencesEntity[] = [];
    const workflowUserPreferences: PreferencesEntity[] = [];

    for (const [workflowResourcePreference, workflowUserPreference] of tuplesByWorkflowId.values()) {
      if (workflowResourcePreference) {
        workflowResourcePreferences.push(workflowResourcePreference);
      }
      if (workflowUserPreference) {
        workflowUserPreferences.push(workflowUserPreference);
      }
    }

    return { workflowResourcePreferences, workflowUserPreferences };
  }

  @Instrument()
  private async getActiveWorkflows({
    organizationId,
    environmentId,
    tags,
    severity,
  }: {
    organizationId: string;
    environmentId: string;
    tags?: string[];
    severity?: SeverityLevelEnum[];
  }): Promise<NotificationTemplateEntity[]> {
    const cacheKey = `${organizationId}:${environmentId}`;
    const cacheVariant = this.buildCacheVariant(tags, severity);

    return this.inMemoryLRUCacheService.get(
      InMemoryLRUCacheStore.ACTIVE_WORKFLOWS,
      cacheKey,
      () =>
        this.notificationTemplateRepository.filterActive({
          organizationId,
          environmentId,
          tags,
          severity,
        }),
      {
        organizationId,
        environmentId,
        cacheVariant,
      }
    );
  }

  private buildCacheVariant(tags?: string[], severity?: SeverityLevelEnum[]): string {
    const filters = {
      ...(tags && tags.length > 0 && { tags: [...tags].sort() }),
      ...(severity && severity.length > 0 && { severity: [...severity].sort() }),
    };

    return Object.keys(filters).length > 0 ? JSON.stringify(filters) : 'default';
  }
}

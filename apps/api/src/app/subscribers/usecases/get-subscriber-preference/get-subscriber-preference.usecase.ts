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
import { chunk } from 'es-toolkit';
import { GetSubscriberPreferenceCommand } from './get-subscriber-preference.command';

@Injectable()
export class GetSubscriberPreference {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private preferencesRepository: PreferencesRepository,
    private featureFlagsService: FeatureFlagsService,
    private inMemoryLRUCacheService: InMemoryLRUCacheService
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

    const workflowPreferences = await this.calculateWorkflowPreferences(
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
  private async calculateWorkflowPreferences(
    workflowList: NotificationTemplateEntity[],
    workflowPreferenceSets: Record<string, PreferenceSet>,
    subscriberGlobalPreference: PreferencesEntity | null,
    includeInactiveChannels: boolean
  ): Promise<(ISubscriberPreferenceResponse | undefined)[]> {
    const chunkSize = 30;
    const results: (ISubscriberPreferenceResponse | undefined)[] = [];

    const chunks = chunk(workflowList, chunkSize);

    for (const chunk of chunks) {
      // Use setImmediate to yield to the event loop between chunks
      await new Promise<void>((resolve) => {
        setImmediate(() => resolve());
      });

      const chunkResults = chunk
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
            template: mapTemplateConfiguration({
              ...workflow,
              critical: merged.preferences.all.readOnly,
            }),
            type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
          };

          return preference;
        })
        .filter((item): item is ISubscriberPreferenceResponse => item !== null);

      results.push(...chunkResults);
    }

    return results;
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
  }: {
    environmentId: string;
    organizationId: string;
    subscriberId: string;
    workflowIds: string[];
    contextKeys?: string[];
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

    const [
      workflowResourcePreferences,
      workflowUserPreferences,
      subscriberWorkflowPreferences,
      subscriberGlobalPreferences,
    ] = await Promise.all([
      this.preferencesRepository.find(
        {
          ...baseQuery,
          _templateId: { $in: workflowIds },
          type: PreferencesTypeEnum.WORKFLOW_RESOURCE,
        },
        undefined,
        readOptions
      ),
      this.preferencesRepository.find(
        {
          ...baseQuery,
          _templateId: { $in: workflowIds },
          type: PreferencesTypeEnum.USER_WORKFLOW,
        },
        undefined,
        readOptions
      ),
      this.preferencesRepository.find(
        {
          ...baseQuery,
          _subscriberId: subscriberId,
          _templateId: { $in: workflowIds },
          type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
          ...contextQuery,
        },
        undefined,
        readOptions
      ),
      this.preferencesRepository.find(
        {
          ...baseQuery,
          _subscriberId: subscriberId,
          type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
          ...contextQuery,
        },
        undefined,
        readOptions
      ),
    ]);

    return {
      workflowResourcePreferences,
      workflowUserPreferences,
      subscriberWorkflowPreferences,
      subscriberGlobalPreference: subscriberGlobalPreferences[0] ?? null,
    };
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

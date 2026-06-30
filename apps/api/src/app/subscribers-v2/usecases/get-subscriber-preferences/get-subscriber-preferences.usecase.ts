import { Injectable, NotFoundException } from '@nestjs/common';
import {
  buildSlug,
  FeatureFlagsService,
  InMemoryLRUCacheService,
  InMemoryLRUCacheStore,
  Instrument,
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
  FeatureFlagsKeysEnum,
  ISubscriberPreferenceResponse,
  PreferencesTypeEnum,
  ShortIsPrefixEnum,
  WorkflowCriticalityEnum,
} from '@novu/shared';
import {
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
} from '../../../subscribers/usecases/get-subscriber-global-preference';
import { assertGetPreferencesEnabled } from '../../../subscribers/utils/assert-get-preferences-enabled';
import {
  GetSubscriberPreference,
  GetSubscriberPreferenceCommand,
} from '../../../subscribers/usecases/get-subscriber-preference';
import { GetSubscriberPreferencesDto } from '../../dtos/get-subscriber-preferences.dto';
import { SubscriberGlobalPreferenceDto } from '../../dtos/subscriber-global-preference.dto';
import { SubscriberWorkflowPreferenceDto } from '../../dtos/subscriber-workflow-preference.dto';
import { GetSubscriberPreferencesCommand } from './get-subscriber-preferences.command';

@Injectable()
export class GetSubscriberPreferences {
  constructor(
    private getSubscriberGlobalPreference: GetSubscriberGlobalPreference,
    private getSubscriberPreference: GetSubscriberPreference,
    private subscriberRepository: SubscriberRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private preferencesRepository: PreferencesRepository,
    private featureFlagsService: FeatureFlagsService,
    private inMemoryLRUCacheService: InMemoryLRUCacheService
  ) {}

  async execute(command: GetSubscriberPreferencesCommand): Promise<GetSubscriberPreferencesDto> {
    await assertGetPreferencesEnabled(this.featureFlagsService, command.organizationId, command.environmentId);

    const subscriber = await this.subscriberRepository.findBySubscriberId(
      command.environmentId,
      command.subscriberId,
      true,
      '_id'
    );

    if (!subscriber) {
      throw new NotFoundException(`Subscriber with id: ${command.subscriberId} not found`);
    }

    const workflowList = await this.getActiveWorkflows({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      critical: command.criticality === WorkflowCriticalityEnum.CRITICAL ? true : undefined,
    });

    /*
     * Fetch the subscriber's global preference exactly once, then hand it to the global and
     * workflow sub-usecases. Previously the v2 endpoint triggered duplicate SUBSCRIBER_GLOBAL
     * mongo lookups (one inside GetSubscriberGlobalPreference -> GetPreferences, one inside
     * GetSubscriberPreference.findAllPreferences), which under concurrent load doubled the
     * I/O and bson decode cost for the same document on every request.
     */
    const subscriberGlobalPreference = await this.fetchSubscriberGlobalPreferenceEntity({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      subscriberId: subscriber._id,
      contextKeys: command.contextKeys,
    });

    /*
     * The two sub-fetches are independent — run them in parallel so wall-clock latency is
     * reduced even though the cumulative CPU cost is unchanged.
     */
    const [globalPreference, workflowPreferences] = await Promise.all([
      this.fetchGlobalPreference(command, subscriber, workflowList, subscriberGlobalPreference),
      this.fetchWorkflowPreferences(command, subscriber, workflowList, subscriberGlobalPreference),
    ]);

    /*
     * The controller is wrapped in `ClassSerializerInterceptor`, which already serializes the
     * response. `GetSubscriberPreferencesDto` declares no class-transformer exclusion/transform
     * decorators, so a plain object produces byte-identical output while avoiding an extra
     * (CPU-heavy) `plainToInstance` pass on every request.
     */
    return {
      global: globalPreference,
      workflows: workflowPreferences,
    };
  }

  @Instrument()
  private async fetchSubscriberGlobalPreferenceEntity({
    environmentId,
    organizationId,
    subscriberId,
    contextKeys,
  }: {
    environmentId: string;
    organizationId: string;
    subscriberId: string;
    contextKeys?: string[];
  }): Promise<PreferencesEntity | null> {
    const useContextFiltering = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
      defaultValue: false,
      organization: { _id: organizationId },
    });

    const contextQuery = this.preferencesRepository.buildContextExactMatchQuery(contextKeys, {
      enabled: useContextFiltering,
    });

    return this.preferencesRepository.findOneForComputation(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _subscriberId: subscriberId,
        type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
        ...contextQuery,
      },
      { readPreference: 'secondaryPreferred' as const }
    );
  }

  private async fetchGlobalPreference(
    command: GetSubscriberPreferencesCommand,
    subscriber: SubscriberEntity,
    workflowList: NotificationTemplateEntity[],
    subscriberGlobalPreference: PreferencesEntity | null
  ): Promise<SubscriberGlobalPreferenceDto> {
    const { preference } = await this.getSubscriberGlobalPreference.execute(
      GetSubscriberGlobalPreferenceCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
        includeInactiveChannels: false,
        contextKeys: command.contextKeys,
        subscriber,
        workflowList,
        subscriberGlobalPreference,
      })
    );

    return {
      ...preference,
    };
  }

  private async fetchWorkflowPreferences(
    command: GetSubscriberPreferencesCommand,
    subscriber: SubscriberEntity,
    workflowList: NotificationTemplateEntity[],
    subscriberGlobalPreference: PreferencesEntity | null
  ) {
    const subscriberWorkflowPreferences = await this.getSubscriberPreference.execute(
      GetSubscriberPreferenceCommand.create({
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
        organizationId: command.organizationId,
        includeInactiveChannels: false,
        criticality: command.criticality ?? WorkflowCriticalityEnum.NON_CRITICAL,
        contextKeys: command.contextKeys,
        subscriber,
        workflowList,
        subscriberGlobalPreference,
      })
    );

    return subscriberWorkflowPreferences.map(this.mapToWorkflowPreference);
  }

  private mapToWorkflowPreference(
    subscriberWorkflowPreference: ISubscriberPreferenceResponse
  ): SubscriberWorkflowPreferenceDto {
    const { preference, template } = subscriberWorkflowPreference;

    return {
      enabled: preference.enabled,
      channels: preference.channels,
      overrides: preference.overrides,
      updatedAt: preference.updatedAt,
      workflow: {
        slug: buildSlug(template.name, ShortIsPrefixEnum.WORKFLOW, template._id),
        identifier: template.triggers[0].identifier,
        name: template.name,
        updatedAt: template.updatedAt,
      },
    };
  }

  @Instrument()
  private async getActiveWorkflows({
    organizationId,
    environmentId,
    critical,
  }: {
    organizationId: string;
    environmentId: string;
    critical?: boolean;
  }): Promise<NotificationTemplateEntity[]> {
    const cacheKey = `${organizationId}:${environmentId}`;
    const cacheVariant = this.buildCacheVariant(critical);

    return this.inMemoryLRUCacheService.get(
      InMemoryLRUCacheStore.ACTIVE_WORKFLOWS,
      cacheKey,
      async () =>
        await this.notificationTemplateRepository.filterActive({
          organizationId,
          environmentId,
          tags: undefined,
          severity: undefined,
          critical,
        }),
      {
        organizationId,
        environmentId,
        cacheVariant,
      }
    );
  }

  private buildCacheVariant(critical?: boolean): string {
    const filters = {
      ...(critical !== undefined && { critical }),
    };

    return Object.keys(filters).length > 0 ? JSON.stringify(filters) : 'default';
  }
}

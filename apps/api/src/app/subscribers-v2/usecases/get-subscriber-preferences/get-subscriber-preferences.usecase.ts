import { Injectable, NotFoundException } from '@nestjs/common';
import { buildSlug, InMemoryLRUCacheService, InMemoryLRUCacheStore, Instrument } from '@novu/application-generic';
import {
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';
import { ISubscriberPreferenceResponse, ShortIsPrefixEnum, WorkflowCriticalityEnum } from '@novu/shared';
import { plainToInstance } from 'class-transformer';
import {
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
} from '../../../subscribers/usecases/get-subscriber-global-preference';
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
    private inMemoryLRUCacheService: InMemoryLRUCacheService
  ) {}

  async execute(command: GetSubscriberPreferencesCommand): Promise<GetSubscriberPreferencesDto> {
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

    const globalPreference = await this.fetchGlobalPreference(command, subscriber, workflowList);
    const workflowPreferences = await this.fetchWorkflowPreferences(command, subscriber, workflowList);

    return plainToInstance(GetSubscriberPreferencesDto, {
      global: globalPreference,
      workflows: workflowPreferences,
    });
  }

  private async fetchGlobalPreference(
    command: GetSubscriberPreferencesCommand,
    subscriber: SubscriberEntity,
    workflowList: NotificationTemplateEntity[]
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
      })
    );

    return {
      ...preference,
    };
  }

  private async fetchWorkflowPreferences(
    command: GetSubscriberPreferencesCommand,
    subscriber: SubscriberEntity,
    workflowList: NotificationTemplateEntity[]
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

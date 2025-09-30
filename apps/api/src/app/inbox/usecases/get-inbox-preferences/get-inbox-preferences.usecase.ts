import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService, InstrumentUsecase } from '@novu/application-generic';
import { SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { PreferenceLevelEnum, SeverityLevelEnum } from '@novu/shared';
import {
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
} from '../../../subscribers/usecases/get-subscriber-global-preference';
import {
  GetSubscriberPreference,
  GetSubscriberPreferenceCommand,
} from '../../../subscribers/usecases/get-subscriber-preference';
import { AnalyticsEventsEnum } from '../../utils';
import { InboxPreference } from '../../utils/types';
import { GetInboxPreferencesCommand } from './get-inbox-preferences.command';

@Injectable()
export class GetInboxPreferences {
  constructor(
    private getSubscriberGlobalPreference: GetSubscriberGlobalPreference,
    private analyticsService: AnalyticsService,
    private getSubscriberPreference: GetSubscriberPreference,
    private subscriberRepository: SubscriberRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: GetInboxPreferencesCommand): Promise<InboxPreference[]> {
    const subscriber = await this.getSubscriber(command);
    if (!subscriber) {
      throw new NotFoundException(`Subscriber with id ${command.subscriberId} not found`);
    }

    const globalPreference = await this.getSubscriberGlobalPreference.execute(
      GetSubscriberGlobalPreferenceCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
        includeInactiveChannels: false,
        subscriber,
      })
    );

    const updatedGlobalPreference = {
      level: PreferenceLevelEnum.GLOBAL,
      ...globalPreference.preference,
    };

    const severity = command.severity
      ? Array.isArray(command.severity)
        ? command.severity
        : [command.severity]
      : undefined;

    const subscriberWorkflowPreferences = await this.getSubscriberPreference.execute(
      GetSubscriberPreferenceCommand.create({
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
        organizationId: command.organizationId,
        tags: command.tags,
        severity,
        subscriber,
        includeInactiveChannels: false,
        criticality: command.criticality,
      })
    );
    const workflowPreferences = subscriberWorkflowPreferences.map((subscriberWorkflowPreference) => {
      return {
        ...subscriberWorkflowPreference.preference,
        level: PreferenceLevelEnum.TEMPLATE,
        workflow: {
          id: subscriberWorkflowPreference.template._id,
          identifier: subscriberWorkflowPreference.template.triggers[0].identifier,
          name: subscriberWorkflowPreference.template.name,
          critical: subscriberWorkflowPreference.template.critical,
          tags: subscriberWorkflowPreference.template.tags,
          severity: subscriberWorkflowPreference.template.severity ?? SeverityLevelEnum.NONE,
        },
      } satisfies InboxPreference;
    });

    const sortedWorkflowPreferences = workflowPreferences.sort((a, b) => {
      const aCreatedAt = subscriberWorkflowPreferences.find((preference) => preference.template._id === a.workflow?.id)
        ?.template.createdAt;
      const bCreatedAt = subscriberWorkflowPreferences.find((preference) => preference.template._id === b.workflow?.id)
        ?.template.createdAt;

      if (!aCreatedAt && !bCreatedAt) return 0;
      if (!aCreatedAt) return 1;
      if (!bCreatedAt) return -1;

      return new Date(aCreatedAt).getTime() - new Date(bCreatedAt).getTime();
    });

    this.analyticsService.mixpanelTrack(AnalyticsEventsEnum.FETCH_PREFERENCES, '', {
      _organization: command.organizationId,
      subscriberId: command.subscriberId,
      workflowSize: sortedWorkflowPreferences.length,
      tags: command.tags || [],
    });

    return [updatedGlobalPreference, ...sortedWorkflowPreferences];
  }

  private async getSubscriber(command: GetInboxPreferencesCommand): Promise<SubscriberEntity> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    if (!subscriber) {
      throw new NotFoundException(`Subscriber ${command.subscriberId} not found`);
    }

    return subscriber;
  }
}

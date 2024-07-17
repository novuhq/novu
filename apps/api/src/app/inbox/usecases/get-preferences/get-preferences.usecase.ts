import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
  GetSubscriberTemplatePreference,
  GetSubscriberTemplatePreferenceCommand,
} from '@novu/application-generic';
import { NotificationTemplateRepository, SubscriberRepository } from '@novu/dal';
import { ISubscriberPreferences, PreferenceLevelEnum } from '@novu/shared';
import { AnalyticsEventsEnum } from '../../utils';
import { GetPreferencesCommand } from './get-preferences.command';

@Injectable()
export class GetPreferences {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private getSubscriberTemplatePreferenceUsecase: GetSubscriberTemplatePreference,
    private getSubscriberGlobalPreference: GetSubscriberGlobalPreference,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: GetPreferencesCommand): Promise<ISubscriberPreferences[]> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    if (!subscriber) {
      throw new NotFoundException(`Subscriber with id: ${command.subscriberId} not found`);
    }

    const globalPreference = await this.getSubscriberGlobalPreference.execute(
      GetSubscriberGlobalPreferenceCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
      })
    );

    const updatedGlobalPreference = {
      level: PreferenceLevelEnum.GLOBAL,
      preferences: globalPreference.preference,
    };

    const workflowList =
      (await this.notificationTemplateRepository.getActiveList(command.organizationId, command.environmentId, true)) ||
      [];

    this.analyticsService.mixpanelTrack(AnalyticsEventsEnum.FETCH_PREFERENCES, '', {
      _organization: command.organizationId,
      templatesSize: workflowList.length,
    });

    const workflowPreferences = await Promise.all(
      workflowList.map(async (workflow) => {
        const workflowPreference = await this.getSubscriberTemplatePreferenceUsecase.execute(
          GetSubscriberTemplatePreferenceCommand.create({
            organizationId: command.organizationId,
            subscriberId: command.subscriberId,
            environmentId: command.environmentId,
            template: workflow,
            subscriber,
          })
        );

        return {
          preferences: workflowPreference.preference,
          level: PreferenceLevelEnum.TEMPLATE,
          workflow: workflowPreference.template,
        };
      })
    );

    return [updatedGlobalPreference, ...workflowPreferences];
  }
}

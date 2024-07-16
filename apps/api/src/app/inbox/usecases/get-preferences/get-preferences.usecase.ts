import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
  GetSubscriberWorkflowPreference,
  GetSubscriberWorkflowPreferenceCommand,
} from '@novu/application-generic';
import { NotificationTemplateRepository, SubscriberRepository } from '@novu/dal';
import { ISubscriberPreferences, PreferenceLevelEnum } from '@novu/shared';
import { GetPreferencesCommand } from './get-preferences.command';

@Injectable()
export class GetPreferences {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private getSubscriberWorkflowPreferenceUsecase: GetSubscriberWorkflowPreference,
    private getSubscriberGlobalPreference: GetSubscriberGlobalPreference,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: GetPreferencesCommand): Promise<ISubscriberPreferences[]> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    if (!subscriber) {
      throw new NotFoundException(`Subscriber: ${command.subscriberId} not found`);
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

    const workflowList = await this.notificationTemplateRepository.getActiveList(
      command.organizationId,
      command.environmentId,
      true
    );

    this.analyticsService.mixpanelTrack('Fetch Preferences - [Inbox]', '', {
      _organization: command.organizationId,
      templatesSize: workflowList.length,
    });

    const workflowPreferences = await Promise.all(
      workflowList.map(
        async (workflow) =>
          await this.getSubscriberWorkflowPreferenceUsecase.execute(
            GetSubscriberWorkflowPreferenceCommand.create({
              organizationId: command.organizationId,
              subscriberId: command.subscriberId,
              environmentId: command.environmentId,
              workflow,
              subscriber,
            })
          )
      )
    );

    return [updatedGlobalPreference, ...workflowPreferences];
  }
}

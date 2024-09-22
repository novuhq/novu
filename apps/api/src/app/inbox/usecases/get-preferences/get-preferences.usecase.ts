import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
  GetSubscriberTemplatePreference,
  GetSubscriberTemplatePreferenceCommand,
} from '@novu/application-generic';
import { NotificationTemplateRepository, SubscriberRepository } from '@novu/dal';
import { PreferenceLevelEnum } from '@novu/shared';
import { AnalyticsEventsEnum } from '../../utils';
import { InboxPreference } from '../../utils/types';
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

  async execute(command: GetPreferencesCommand): Promise<InboxPreference[]> {
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
      ...globalPreference.preference,
    };

    const workflowList =
      (await this.notificationTemplateRepository.filterActive({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        tags: command.tags,
      })) || [];

    this.analyticsService.mixpanelTrack(AnalyticsEventsEnum.FETCH_PREFERENCES, '', {
      _organization: command.organizationId,
      subscriberId: command.subscriberId,
      workflowSize: workflowList.length,
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
          ...workflowPreference.preference,
          level: PreferenceLevelEnum.TEMPLATE,
          workflow: {
            id: workflow._id,
            identifier: workflow.triggers[0].identifier,
            name: workflow.name,
            /*
             * V1 Preferences define `critial` flag on the workflow level.
             * V2 Preferences define `critical` flag on the template returned via Preferences.
             * This pattern safely returns false when:
             * 1. Workflow V1 with no critical flag set
             * 2. Workflow V2 with no critical flag set
             * 3. Workflow V1 with critical flag set to false
             * 4. Workflow V2 with critical flag set to false
             */
            critical: workflow.critical || workflowPreference.template.critical || false,
            tags: workflow.tags,
          },
        } satisfies InboxPreference;
      })
    );

    return [updatedGlobalPreference, ...workflowPreferences];
  }
}

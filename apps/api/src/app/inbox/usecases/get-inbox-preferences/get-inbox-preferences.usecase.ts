import { Injectable } from '@nestjs/common';
import { AnalyticsService, InstrumentUsecase } from '@novu/application-generic';
import { PreferenceLevelEnum } from '@novu/shared';
import { AnalyticsEventsEnum } from '../../utils';
import { InboxPreference } from '../../utils/types';
import { GetInboxPreferencesCommand } from './get-inbox-preferences.command';
import {
  GetSubscriberPreference,
  GetSubscriberPreferenceCommand,
} from '../../../subscribers/usecases/get-subscriber-preference';
import {
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
} from '../../../subscribers/usecases/get-subscriber-global-preference';

@Injectable()
export class GetInboxPreferences {
  constructor(
    private getSubscriberGlobalPreference: GetSubscriberGlobalPreference,
    private analyticsService: AnalyticsService,
    private getSubscriberPreference: GetSubscriberPreference
  ) {}

  @InstrumentUsecase()
  async execute(command: GetInboxPreferencesCommand): Promise<InboxPreference[]> {
    const globalPreference = await this.getSubscriberGlobalPreference.execute(
      GetSubscriberGlobalPreferenceCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
        includeInactiveChannels: false,
      })
    );

    const updatedGlobalPreference = {
      level: PreferenceLevelEnum.GLOBAL,
      ...globalPreference.preference,
    };

    const subscriberWorkflowPreferences = await this.getSubscriberPreference.execute(
      GetSubscriberPreferenceCommand.create({
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
        organizationId: command.organizationId,
        tags: command.tags,
        includeInactiveChannels: false,
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
        },
      } satisfies InboxPreference;
    });

    this.analyticsService.mixpanelTrack(AnalyticsEventsEnum.FETCH_PREFERENCES, '', {
      _organization: command.organizationId,
      subscriberId: command.subscriberId,
      workflowSize: workflowPreferences.length,
      tags: command.tags || [],
    });

    return [updatedGlobalPreference, ...workflowPreferences];
  }
}

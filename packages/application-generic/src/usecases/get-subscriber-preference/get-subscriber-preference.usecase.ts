import { Injectable } from '@nestjs/common';
import {
  NotificationTemplateRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ISubscriberPreferenceResponse } from '@novu/shared';

import { AnalyticsService } from '../../services/analytics.service';
import { GetSubscriberPreferenceCommand } from './get-subscriber-preference.command';
import {
  GetSubscriberTemplatePreference,
  GetSubscriberTemplatePreferenceCommand,
} from '../get-subscriber-template-preference';

@Injectable()
export class GetSubscriberPreference {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private getSubscriberTemplatePreferenceUsecase: GetSubscriberTemplatePreference,
    private analyticsService: AnalyticsService
  ) {}

  async execute(
    command: GetSubscriberPreferenceCommand
  ): Promise<ISubscriberPreferenceResponse[]> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(
      command.environmentId,
      command.subscriberId
    );

    const templateList =
      await this.notificationTemplateRepository.getActiveList(
        command.organizationId,
        command.environmentId,
        true
      );

    this.analyticsService.mixpanelTrack(
      'Fetch User Preferences - [Notification Center]',
      '',
      {
        _organization: command.organizationId,
        templatesSize: templateList.length,
      }
    );

    return await Promise.all(
      templateList.map(async (template) =>
        this.getSubscriberTemplatePreferenceUsecase.execute(
          GetSubscriberTemplatePreferenceCommand.create({
            organizationId: command.organizationId,
            subscriberId: command.subscriberId,
            environmentId: command.environmentId,
            template,
            subscriber,
          })
        )
      )
    );
  }
}

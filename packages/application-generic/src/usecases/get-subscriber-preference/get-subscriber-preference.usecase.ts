import { Injectable } from '@nestjs/common';
import {
  NotificationTemplateRepository,
  SubscriberRepository,
  SubscriberPreferenceRepository,
} from '@novu/dal';
import { ISubscriberPreferenceResponse } from '@novu/shared';

import { AnalyticsService } from '../../services/analytics.service';
import { GetSubscriberPreferenceCommand } from './get-subscriber-preference.command';
import {
  GetSubscriberTemplatePreference,
  GetSubscriberTemplatePreferenceCommand,
} from '../get-subscriber-template-preference';
import { ApiException } from '../../utils/exceptions';

@Injectable()
export class GetSubscriberPreference {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private getSubscriberTemplatePreferenceUsecase: GetSubscriberTemplatePreference,
    private analyticsService: AnalyticsService,
    private subscriberPreferenceRepository: SubscriberPreferenceRepository
  ) {}

  async execute(
    command: GetSubscriberPreferenceCommand
  ): Promise<ISubscriberPreferenceResponse[]> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(
      command.environmentId,
      command.subscriberId
    );

    if (!subscriber) {
      throw new ApiException(`Subscriber ${command.subscriberId} not found`);
    }

    const templateList =
      await this.notificationTemplateRepository.getActiveList(
        command.organizationId,
        command.environmentId,
        true
      );

    const subscriberPreference = await this.subscriberPreferenceRepository.find(
      {
        _environmentId: command.environmentId,
        _subscriberId: subscriber._id,
        _templateId: {
          $in: templateList.map((template) => template._id),
        },
      },
      'enabled channels _templateId',
      { readPreference: 'secondaryPreferred' }
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
      templateList.map(async (template) => {
        const preference = subscriberPreference.find(
          (i) => i._templateId === template._id
        );

        return this.getSubscriberTemplatePreferenceUsecase.execute(
          GetSubscriberTemplatePreferenceCommand.create({
            organizationId: command.organizationId,
            subscriberId: command.subscriberId,
            environmentId: command.environmentId,
            template,
            subscriber,
            preference: preference || null,
          })
        );
      })
    );
  }
}

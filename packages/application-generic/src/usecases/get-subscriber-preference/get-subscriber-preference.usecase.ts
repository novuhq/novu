import { Inject, Injectable } from '@nestjs/common';
import {
  NotificationTemplateRepository,
  NotificationTemplateEntity,
  MemberRepository,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  IPreferenceChannels,
  ISubscriberPreferenceResponse,
} from '@novu/shared';

import { AnalyticsService } from '../../services/analytics.service';
import { GetSubscriberPreferenceCommand } from './get-subscriber-preference.command';
import {
  GetSubscriberTemplatePreference,
  GetSubscriberTemplatePreferenceCommand,
} from '../get-subscriber-template-preference';

@Injectable()
export class GetSubscriberPreference {
  constructor(
    private memberRepository: MemberRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private getSubscriberTemplatePreferenceUsecase: GetSubscriberTemplatePreference,
    private analyticsService: AnalyticsService
  ) {}

  async execute(
    command: GetSubscriberPreferenceCommand
  ): Promise<ISubscriberPreferenceResponse[]> {
    const admin = await this.memberRepository.getOrganizationAdminAccount(
      command.organizationId
    );

    const templateList =
      await this.notificationTemplateRepository.getActiveList(
        command.organizationId,
        command.environmentId,
        true
      );

    if (admin) {
      this.analyticsService.mixpanelTrack(
        'Fetch User Preferences - [Notification Center]',
        '',
        {
          _organization: command.organizationId,
          templatesSize: templateList.length,
        }
      );
    }

    return await Promise.all(
      templateList.map(async (template) =>
        this.getSubscriberTemplatePreferenceUsecase.execute(
          GetSubscriberTemplatePreferenceCommand.create({
            organizationId: command.organizationId,
            subscriberId: command.subscriberId,
            environmentId: command.environmentId,
            template,
          })
        )
      )
    );
  }
}

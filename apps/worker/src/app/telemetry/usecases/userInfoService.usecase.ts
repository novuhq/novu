import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  UserRepository,
  OrganizationRepository,
  NotificationTemplateRepository,
  NotificationRepository,
  TopicRepository,
  SubscriberRepository,
  IntegrationRepository,
} from '@novu/dal';
import { HttpService } from '@nestjs/axios';
import { sendDataToMixpanel } from '../utils/sendDataToMixpanel.utils';
import { loadOrCreateMachineId } from '../utils/machine.utils';

@Injectable()
export class UserInfoService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly notificationTemplateRepository: NotificationTemplateRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly topicRepository: TopicRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly integrationReposioty: IntegrationRepository,
    private readonly httpService: HttpService
  ) {}

  private async getUserData() {
    const results = await Promise.allSettled([
      this.userRepository.estimatedDocumentCount(),
      this.organizationRepository.estimatedDocumentCount(),
      this.notificationTemplateRepository.estimatedDocumentCount(),
      this.notificationRepository.estimatedDocumentCount(),
      this.topicRepository.estimatedDocumentCount(),
      this.subscriberRepository.estimatedDocumentCount(),
      this.integrationReposioty.sumByProviderId(),
      this.notificationTemplateRepository.getTotalSteps(),
    ]);

    return {
      distinct_id: loadOrCreateMachineId(),
      userCount: results[0].status === 'fulfilled' ? results[0].value : null,
      orgCount: results[1].status === 'fulfilled' ? results[1].value : null,
      workflowCount: results[2].status === 'fulfilled' ? results[2].value : null,
      eventCount: results[3].status === 'fulfilled' ? results[3].value : null,
      topicCount: results[4].status === 'fulfilled' ? results[4].value : null,
      subscriberCount: results[5].status === 'fulfilled' ? results[5].value : null,
      integrationCount: results[6].status === 'fulfilled' ? results[6].value : null,
      totalSteps: results[7].status === 'fulfilled' ? results[7].value : null,
    };
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async sendDailyUserTelemetry() {
    const isSelfHosted = process.env.IS_SELF_HOSTED === 'true';
    const telemetryEnabled = process.env.NOVU_TELEMETRY !== 'false';

    if (isSelfHosted && telemetryEnabled) {
      const userData = await this.getUserData();
      await sendDataToMixpanel(this.httpService, 'User Info - [OS Telemetry]', userData);
    }
  }
}
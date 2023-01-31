import { Inject, Injectable } from '@nestjs/common';
import { IntegrationEntity, MessageRepository } from '@novu/dal';

import { startOfMonth, endOfMonth } from 'date-fns';
import { ANALYTICS_SERVICE } from '../../../shared/shared.module';
import { AnalyticsService } from '@novu/application-generic';

import { ProviderUsageLimitsCommand } from './provider-usage-limits.command';

@Injectable()
export class ProviderUsageLimits {
  constructor(
    private messageRepository: MessageRepository,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService
  ) {}

  async execute(command: ProviderUsageLimitsCommand): Promise<number> {
    return this.getMessageCount(command.organizationId, command.environmentId, command.providerId);
  }

  private async getMessageCount(organizationId: string, environmentId: string, providerId: string): Promise<number> {
    return await this.messageRepository.count({
      _organizationId: organizationId,
      providerId: providerId,
      createdAt: { $gte: startOfMonth(new Date()), $lte: endOfMonth(new Date()) },
    });
  }

  async ensureLimitNotReached(integration: IntegrationEntity) {
    if (!integration.limits) return;

    const { softLimit, hardLimit } = integration.limits;

    const messageCount = await this.getMessageCount(
      integration._organizationId,
      integration._environmentId,
      integration.providerId
    );
    if (messageCount < softLimit) return;
    const limitMsg =
      messageCount >= hardLimit
        ? `Limit for ${integration.providerId} provider was reached hard limit ${hardLimit}, not sending messages.`
        : `Limit for ${integration.providerId} provider was reached soft limit ${softLimit}, but sending messages.`;
    this.analyticsService.track(limitMsg, integration._organizationId, {
      organizationId: integration._organizationId,
      environmentId: integration._environmentId,
      providerId: integration.providerId,
      messageCount: messageCount,
      softLimit: softLimit,
      hardLimit: hardLimit,
    });
    if (messageCount >= hardLimit) throw new Error(limitMsg); //Throw error or return false?
  }
}

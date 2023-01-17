import { Injectable } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { GetNovuIntegrationCommand } from './get-novu-integration.command';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { CalculateLimitNovuIntegration } from '../calculate-limit-novu-integration';
import { CalculateLimitNovuIntegrationCommand } from '../calculate-limit-novu-integration/calculate-limit-novu-integration.command';

@Injectable()
export class GetNovuIntegration {
  constructor(
    private integrationRepository: IntegrationRepository,
    private calculateLimitNovuIntegration: CalculateLimitNovuIntegration
  ) {}

  async execute(command: GetNovuIntegrationCommand): Promise<IntegrationEntity | undefined> {
    if (process.env.DOCKER_HOSTED_ENV === 'true') {
      return;
    }

    const activeIntegrationsCount = await this.integrationRepository.count({
      _organizationId: command.organizationId,
      active: true,
      channel: command.channelType,
      _environmentId: command.environmentId,
    });

    if (activeIntegrationsCount > 0) {
      return;
    }

    const limit = await this.calculateLimitNovuIntegration.execute(
      CalculateLimitNovuIntegrationCommand.create({
        channelType: command.channelType,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
      })
    );

    if (!limit) {
      return;
    }

    if (limit.count >= limit.limit) {
      // add analytics event.
      throw new Error(`Limit for Novus ${command.channelType.toLowerCase()} provider was reached.`);
    }

    switch (command.channelType) {
      case ChannelTypeEnum.EMAIL:
        return this.createNovuEmailIntegration();
      default:
        return undefined;
    }
  }

  private createNovuEmailIntegration(): IntegrationEntity {
    const item = new IntegrationEntity();
    item.providerId = EmailProviderIdEnum.Novu;
    item.active = true;
    item.channel = ChannelTypeEnum.EMAIL;

    item.credentials = {
      apiKey: process.env.NOVU_EMAIL_INTEGRATION_API_KEY,
      from: 'no-reply@novu.co',
      senderName: 'Novu',
    };

    return item;
  }

  public static mapProviders(type: ChannelTypeEnum, providerId: string) {
    if (![EmailProviderIdEnum.Novu.toString()].includes(providerId)) {
      return providerId;
    }

    switch (type) {
      case ChannelTypeEnum.EMAIL:
        return EmailProviderIdEnum.SendGrid;
      default:
        return providerId;
    }
  }
}

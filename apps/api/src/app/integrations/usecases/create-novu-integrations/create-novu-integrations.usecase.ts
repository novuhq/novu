import { Injectable } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';

import { CreateNovuIntegrationsCommand } from './create-novu-integrations.command';
import { CreateIntegration } from '../create-integration/create-integration.usecase';
import { CreateIntegrationCommand } from '../create-integration/create-integration.command';
import { GetNovuIntegration } from '@novu/application-generic';

@Injectable()
export class CreateNovuIntegrations {
  constructor(private createIntegration: CreateIntegration, private integrationRepository: IntegrationRepository) {}

  async execute(command: CreateNovuIntegrationsCommand): Promise<IntegrationEntity[]> {
    const integrations: IntegrationEntity[] = [];

    if (
      !process.env.NOVU_EMAIL_INTEGRATION_API_KEY ||
      !process.env.NOVU_SMS_INTEGRATION_ACCOUNT_SID ||
      !process.env.NOVU_SMS_INTEGRATION_TOKEN ||
      !process.env.NOVU_SMS_INTEGRATION_SENDER
    ) {
      return [];
    }

    const emailProvider = GetNovuIntegration.generateNovuEmailIntegration(null, command.environmentId, true);
    const emailIntegrationCount = await this.integrationRepository.count({
      channel: emailProvider.channel,
      providerId: emailProvider.providerId,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (emailIntegrationCount === 0) {
      integrations.push(
        await this.createIntegration.execute(
          CreateIntegrationCommand.create({
            providerId: emailProvider.providerId,
            channel: emailProvider.channel,
            active: emailProvider.active,
            check: false,
            userId: command.userId,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
          })
        )
      );
    }

    const smsProvider = GetNovuIntegration.generateNovuSMSIntegration(command.environmentId, true);
    const smsIntegrationCount = await this.integrationRepository.count({
      channel: smsProvider.channel,
      providerId: smsProvider.providerId,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (smsIntegrationCount === 0) {
      integrations.push(
        await this.createIntegration.execute(
          CreateIntegrationCommand.create({
            providerId: smsProvider.providerId,
            channel: smsProvider.channel,
            active: smsProvider.active,
            check: false,
            userId: command.userId,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
          })
        )
      );
    }

    return integrations;
  }
}

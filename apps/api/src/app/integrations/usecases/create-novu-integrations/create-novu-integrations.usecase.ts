import { Injectable } from '@nestjs/common';
import { IntegrationRepository } from '@novu/dal';
import { areNovuEmailCredentialsSet, areNovuSmsCredentialsSet } from '@novu/application-generic';

import { CreateNovuIntegrationsCommand } from './create-novu-integrations.command';
import { CreateIntegration } from '../create-integration/create-integration.usecase';
import { CreateIntegrationCommand } from '../create-integration/create-integration.command';
import { ChannelTypeEnum, EmailProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';

@Injectable()
export class CreateNovuIntegrations {
  constructor(private createIntegration: CreateIntegration, private integrationRepository: IntegrationRepository) {}

  private async createEmailIntegration(command: CreateNovuIntegrationsCommand) {
    if (!areNovuEmailCredentialsSet()) {
      return;
    }

    const emailIntegrationCount = await this.integrationRepository.count({
      providerId: EmailProviderIdEnum.Novu,
      channel: ChannelTypeEnum.EMAIL,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (emailIntegrationCount === 0) {
      await this.createIntegration.execute(
        CreateIntegrationCommand.create({
          providerId: EmailProviderIdEnum.Novu,
          channel: ChannelTypeEnum.EMAIL,
          active: true,
          name: 'Novu Email',
          check: false,
          userId: command.userId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
        })
      );
    }
  }

  private async createSmsIntegration(command: CreateNovuIntegrationsCommand) {
    if (!areNovuSmsCredentialsSet()) {
      return;
    }

    const smsIntegrationCount = await this.integrationRepository.count({
      providerId: SmsProviderIdEnum.Novu,
      channel: ChannelTypeEnum.SMS,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (smsIntegrationCount === 0) {
      await this.createIntegration.execute(
        CreateIntegrationCommand.create({
          providerId: SmsProviderIdEnum.Novu,
          channel: ChannelTypeEnum.SMS,
          name: 'Novu SMS',
          active: true,
          check: false,
          userId: command.userId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
        })
      );
    }
  }

  async execute(command: CreateNovuIntegrationsCommand): Promise<void> {
    await this.createEmailIntegration(command);
    await this.createSmsIntegration(command);
  }
}

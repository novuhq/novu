import { Injectable } from '@nestjs/common';
import { IntegrationRepository } from '@novu/dal';
import { areNovuEmailCredentialsSet, areNovuSmsCredentialsSet } from '@novu/application-generic';

import { CreateNovuIntegrationsCommand } from './create-novu-integrations.command';
import { CreateIntegration } from '../create-integration/create-integration.usecase';
import { CreateIntegrationCommand } from '../create-integration/create-integration.command';
import { ChannelTypeEnum, EmailProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';
import { SetIntegrationAsPrimary } from '../set-integration-as-primary/set-integration-as-primary.usecase';
import { SetIntegrationAsPrimaryCommand } from '../set-integration-as-primary/set-integration-as-primary.command';

@Injectable()
export class CreateNovuIntegrations {
  constructor(
    private createIntegration: CreateIntegration,
    private integrationRepository: IntegrationRepository,
    private setIntegrationAsPrimary: SetIntegrationAsPrimary
  ) {}

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
      const novuEmailIntegration = await this.createIntegration.execute(
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
      await this.setIntegrationAsPrimary.execute(
        SetIntegrationAsPrimaryCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          integrationId: novuEmailIntegration._id,
          userId: command.userId,
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
      const novuSmsIntegration = await this.createIntegration.execute(
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
      await this.setIntegrationAsPrimary.execute(
        SetIntegrationAsPrimaryCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          integrationId: novuSmsIntegration._id,
          userId: command.userId,
        })
      );
    }
  }

  async execute(command: CreateNovuIntegrationsCommand): Promise<void> {
    await this.createEmailIntegration(command);
    await this.createSmsIntegration(command);
  }
}

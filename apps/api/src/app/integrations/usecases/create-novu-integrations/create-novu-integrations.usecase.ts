import { Injectable } from '@nestjs/common';
import { areNovuEmailCredentialsSet, areNovuSlackCredentialsSet, FeatureFlagsService } from '@novu/application-generic';
import { EnvironmentEntity, IntegrationRepository, OrganizationEntity, UserEntity } from '@novu/dal';

import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  EnvironmentEnum,
  FeatureFlagsKeysEnum,
  InAppProviderIdEnum,
} from '@novu/shared';
import { CreateIntegrationCommand } from '../create-integration/create-integration.command';
import { CreateIntegration } from '../create-integration/create-integration.usecase';
import { SetIntegrationAsPrimaryCommand } from '../set-integration-as-primary/set-integration-as-primary.command';
import { SetIntegrationAsPrimary } from '../set-integration-as-primary/set-integration-as-primary.usecase';
import { CreateNovuIntegrationsCommand } from './create-novu-integrations.command';

@Injectable()
export class CreateNovuIntegrations {
  constructor(
    private createIntegration: CreateIntegration,
    private integrationRepository: IntegrationRepository,
    private setIntegrationAsPrimary: SetIntegrationAsPrimary,
    private featureFlagService: FeatureFlagsService
  ) {}

  private async createEmailIntegration(command: CreateNovuIntegrationsCommand) {
    if (!areNovuEmailCredentialsSet() || command.name !== EnvironmentEnum.DEVELOPMENT) {
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

  private async createInAppIntegration(command: CreateNovuIntegrationsCommand) {
    const inAppIntegrationCount = await this.integrationRepository.count({
      providerId: InAppProviderIdEnum.Novu,
      channel: ChannelTypeEnum.IN_APP,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (inAppIntegrationCount === 0) {
      const isV2Enabled = await this.featureFlagService.getFlag({
        user: { _id: command.userId } as UserEntity,
        environment: { _id: command.environmentId } as EnvironmentEntity,
        organization: { _id: command.organizationId } as OrganizationEntity,
        key: FeatureFlagsKeysEnum.IS_V2_ENABLED,
        defaultValue: false,
      });

      const name = isV2Enabled ? 'Novu Inbox' : 'Novu In-App';
      await this.createIntegration.execute(
        CreateIntegrationCommand.create({
          name,
          providerId: InAppProviderIdEnum.Novu,
          channel: ChannelTypeEnum.IN_APP,
          active: true,
          check: false,
          userId: command.userId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
        })
      );
    }
  }

  private async createSlackIntegration(command: CreateNovuIntegrationsCommand) {
    const isSlackTeamsEnabled = await this.featureFlagService.getFlag({
      user: { _id: command.userId } as UserEntity,
      environment: { _id: command.environmentId } as EnvironmentEntity,
      organization: { _id: command.organizationId } as OrganizationEntity,
      key: FeatureFlagsKeysEnum.IS_SLACK_TEAMS_ENABLED,
      defaultValue: false,
    });

    if (!areNovuSlackCredentialsSet() || command.name !== EnvironmentEnum.DEVELOPMENT || !isSlackTeamsEnabled) {
      return;
    }

    const slackIntegrationCount = await this.integrationRepository.count({
      providerId: ChatProviderIdEnum.Novu,
      channel: ChannelTypeEnum.CHAT,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (slackIntegrationCount === 0) {
      await this.createIntegration.execute(
        CreateIntegrationCommand.create({
          name: 'Novu Slack',
          providerId: ChatProviderIdEnum.Novu,
          channel: ChannelTypeEnum.CHAT,
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
    if (!command.channels || command.channels.includes(ChannelTypeEnum.EMAIL)) {
      await this.createEmailIntegration(command);
    }

    if (!command.channels || command.channels.includes(ChannelTypeEnum.IN_APP)) {
      await this.createInAppIntegration(command);
    }

    if (!command.channels || command.channels.includes(ChannelTypeEnum.CHAT)) {
      await this.createSlackIntegration(command);
    }
  }
}

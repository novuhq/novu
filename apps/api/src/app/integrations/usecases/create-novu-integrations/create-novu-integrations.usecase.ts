import { Injectable } from '@nestjs/common';
import {
  AnalyticsService,
  areNovuEmailCredentialsSet,
  areNovuManagedClaudeCredentialsSet,
  areNovuSlackCredentialsSet,
  FeatureFlagsService,
} from '@novu/application-generic';
import { EnvironmentEntity, IntegrationRepository, OrganizationEntity, UserEntity } from '@novu/dal';

import {
  AgentRuntimeProviderIdEnum,
  ChannelTypeEnum,
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  EnvironmentEnum,
  EnvironmentTypeEnum,
  FeatureFlagsKeysEnum,
  InAppProviderIdEnum,
  IntegrationKindEnum,
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
    private featureFlagService: FeatureFlagsService,
    private analyticsService: AnalyticsService
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

      /*
       * Default the Inbox (in-app) integration to HMAC-enabled for any
       * non-dev environment. This is a secure-by-default posture so that
       * production Inbox deployments cannot be initialized for an arbitrary
       * subscriberId without a valid `subscriberHash` (see NV-7593). Dev
       * environments – and ad-hoc/keyless flows that do not pass an
       * environment type – keep the previous HMAC-off default so local
       * development remains friction-free.
       */
      const shouldEnableHmacByDefault = command.environmentType === EnvironmentTypeEnum.PROD;

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
          credentials: shouldEnableHmacByDefault ? { hmac: true } : undefined,
        })
      );
    }
  }

  private async createManagedClaudeIntegration(command: CreateNovuIntegrationsCommand) {
    const isDevelopmentEnvironment = command.name === EnvironmentEnum.DEVELOPMENT;
    if (!areNovuManagedClaudeCredentialsSet() || (!isDevelopmentEnvironment && !command.includeManagedClaude)) {
      return;
    }

    const isEnabled = await this.featureFlagService.getFlag({
      user: { _id: command.userId } as UserEntity,
      environment: { _id: command.environmentId } as EnvironmentEntity,
      organization: { _id: command.organizationId } as OrganizationEntity,
      key: FeatureFlagsKeysEnum.IS_DEMO_MANAGED_CLAUDE_ENABLED,
      defaultValue: false,
    });

    if (!isEnabled) {
      return;
    }

    const managedClaudeIntegrationCount = await this.integrationRepository.count({
      providerId: AgentRuntimeProviderIdEnum.NovuAnthropic,
      kind: IntegrationKindEnum.AGENT,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (managedClaudeIntegrationCount === 0) {
      await this.createIntegration.execute(
        CreateIntegrationCommand.create({
          providerId: AgentRuntimeProviderIdEnum.NovuAnthropic,
          kind: IntegrationKindEnum.AGENT,
          active: true,
          name: 'Novu Managed Claude',
          check: false,
          userId: command.userId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
        })
      );

      this.analyticsService.track('[Novu Managed Claude] - Integration provisioned', command.userId, {
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      });
    }
  }

  private async createSlackIntegration(command: CreateNovuIntegrationsCommand) {
    if (!areNovuSlackCredentialsSet() || command.name !== EnvironmentEnum.DEVELOPMENT) {
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
    const integrationPromises: Array<Promise<void>> = [];

    if (!command.channels || command.channels.includes(ChannelTypeEnum.EMAIL)) {
      integrationPromises.push(this.createEmailIntegration(command));
    }

    if (!command.channels || command.channels.includes(ChannelTypeEnum.IN_APP)) {
      integrationPromises.push(this.createInAppIntegration(command));
    }

    if (!command.channels || command.channels.includes(ChannelTypeEnum.CHAT)) {
      integrationPromises.push(this.createSlackIntegration(command));
    }

    integrationPromises.push(this.createManagedClaudeIntegration(command));

    await Promise.all(integrationPromises);
  }
}
